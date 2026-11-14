import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:qr_flutter/qr_flutter.dart';

import 'lock_cubit.dart';
import 'lock_models.dart';
import 'lock_repository.dart';

class LockShell extends StatelessWidget {
  const LockShell({super.key, required this.repository, this.forcedScreen});

  final LockRepository repository;
  final String? forcedScreen;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => LockCubit(repository)..load(),
      child: LockShellView(forcedScreen: forcedScreen),
    );
  }
}

class LockShellView extends StatelessWidget {
  const LockShellView({super.key, this.forcedScreen});

  final String? forcedScreen;

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<LockCubit, LockViewState>(
      builder: (context, state) {
        if (state.loading) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        if (state.status == null) {
          return LockErrorScreen(message: state.error ?? 'Unable to load device status');
        }
        final screen = forcedScreen ?? screenFor(state);
        return _buildScreen(context, state, screen);
      },
    );
  }
}

String screenFor(LockViewState state) {
  final status = state.status!;
  if (status.enrollmentStatus == 'NOT_ENROLLED' || status.enrollmentStatus == 'WAITING_FOR_DEVICE') {
    return 'activation';
  }
  if (state.paid) {
    return 'unlock';
  }
  if (status.latestIntent != null && !state.paid) {
    return 'pending';
  }
  switch (status.desiredPresentation) {
    case DesiredPresentation.reminder:
      return 'overdue';
    case DesiredPresentation.restrict:
      return 'restricted';
    case DesiredPresentation.lock:
      return 'locked';
    case DesiredPresentation.none:
      return 'enrollment';
  }
}

Widget _buildScreen(BuildContext context, LockViewState state, String screen) {
  switch (screen) {
    case 'activation':
      return const ActivationScreen();
    case 'enrollment':
      return EnrollmentStatusScreen(state: state);
    case 'overdue':
      return OverdueScreen(state: state);
    case 'restricted':
      return RestrictedScreen(state: state);
    case 'locked':
      return LockedScreen(state: state);
    case 'balance':
      return OutstandingBalanceScreen(state: state);
    case 'qr':
      return PromptPayScreen(state: state);
    case 'pending':
      return PaymentPendingScreen(state: state);
    case 'unlock':
      return UnlockConfirmationScreen(state: state);
    case 'recovery':
      return RecoveryScreen(state: state);
    default:
      return EnrollmentStatusScreen(state: state);
  }
}

class LockPreviewGallery extends StatelessWidget {
  const LockPreviewGallery({super.key});

  @override
  Widget build(BuildContext context) {
    const items = <(String, String, DesiredPresentation)>[
      ('activation', 'Device activation', DesiredPresentation.none),
      ('enrollment', 'Enrollment status', DesiredPresentation.none),
      ('overdue', 'Payment overdue', DesiredPresentation.reminder),
      ('restricted', 'Restricted device', DesiredPresentation.restrict),
      ('locked', 'Locked device (app UI)', DesiredPresentation.lock),
      ('balance', 'Outstanding balance', DesiredPresentation.lock),
      ('qr', 'PromptPay QR', DesiredPresentation.lock),
      ('pending', 'Payment pending', DesiredPresentation.lock),
      ('unlock', 'Unlock confirmation', DesiredPresentation.none),
      ('recovery', 'Recovery instructions', DesiredPresentation.lock),
    ];
    return Scaffold(
      appBar: AppBar(title: const Text('Lock screens (preview)')),
      body: ListView(
        children: [
          const Padding(
            padding: EdgeInsets.all(16),
            child: Text(
              'Preview only. These screens do not enable Apple Single App Mode.',
            ),
          ),
          ...items.map(
            (item) => ListTile(
              title: Text(item.$2),
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => LockShell(
                      repository: PreviewLockRepository(previewFixture(item.$3)),
                      forcedScreen: item.$1,
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class ActivationScreen extends StatefulWidget {
  const ActivationScreen({super.key});

  @override
  State<ActivationScreen> createState() => _ActivationScreenState();
}

class _ActivationScreenState extends State<ActivationScreen> {
  final shopCode = TextEditingController();
  final contract = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return _LockScaffold(
      title: 'Device activation',
      children: [
        const Text('Enter the shop code from the counter. Staff must confirm bind; this app cannot enroll MDM.'),
        TextField(controller: shopCode, decoration: const InputDecoration(labelText: 'Shop code')),
        TextField(controller: contract, decoration: const InputDecoration(labelText: 'Contract number')),
        const SupportContact(),
        const DisclaimerBanner(),
      ],
    );
  }
}

class EnrollmentStatusScreen extends StatelessWidget {
  const EnrollmentStatusScreen({super.key, required this.state});
  final LockViewState state;

  @override
  Widget build(BuildContext context) {
    final status = state.status!;
    return _LockScaffold(
      title: 'Enrollment status',
      children: [
        Text(lockHeadline(status)),
        Text('Enrollment: ${status.enrollmentStatus}'),
        Text('Platform: ${status.platform ?? 'unknown'}'),
        Text('OS enforcement: ${status.osEnforcement.name}'),
        const SupportContact(),
        DisclaimerBanner(text: status.disclaimer),
      ],
    );
  }
}

class OverdueScreen extends StatelessWidget {
  const OverdueScreen({super.key, required this.state});
  final LockViewState state;

  @override
  Widget build(BuildContext context) {
    final status = state.status!;
    return _LockScaffold(
      title: 'Payment overdue',
      children: [
        Text('Outstanding ${status.outstandingBalance} ${status.currency}'),
        const Text('Please pay via PromptPay. This is a reminder in the lock app.'),
        _PayActions(state: state),
        const SupportContact(),
        DisclaimerBanner(text: status.disclaimer),
      ],
    );
  }
}

class RestrictedScreen extends StatelessWidget {
  const RestrictedScreen({super.key, required this.state});
  final LockViewState state;

  @override
  Widget build(BuildContext context) {
    return _LockScaffold(
      title: 'Restricted device',
      children: [
        const Text(
          'iOS cannot suspend arbitrary apps the way Android can. Any restriction requires MDM and may be unsupported.',
        ),
        Text('Desired policy: ${state.status!.desiredPresentation.name}'),
        Text('OS enforcement: ${state.status!.osEnforcement.name}'),
        _PayActions(state: state),
        const SupportContact(),
        DisclaimerBanner(text: state.status!.disclaimer),
      ],
    );
  }
}

class LockedScreen extends StatelessWidget {
  const LockedScreen({super.key, required this.state});
  final LockViewState state;

  @override
  Widget build(BuildContext context) {
    final status = state.status!;
    final osLocked = status.osEnforcement == OsEnforcement.singleAppMode;
    return _LockScaffold(
      title: osLocked ? 'iPhone in Single App Mode' : 'Locked device (app UI)',
      children: [
        Text(lockHeadline(status)),
        if (!osLocked)
          const Text(
            'You are seeing the lock app. The rest of the iPhone is not locked by MDM yet.',
          ),
        OutstandingBalanceScreen(state: state, nested: true),
        PromptPayScreen(state: state, nested: true),
        const SupportContact(),
        DisclaimerBanner(text: status.disclaimer),
      ],
    );
  }
}

class OutstandingBalanceScreen extends StatelessWidget {
  const OutstandingBalanceScreen({super.key, required this.state, this.nested = false});
  final LockViewState state;
  final bool nested;

  @override
  Widget build(BuildContext context) {
    final status = state.status!;
    final body = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Outstanding ${status.outstandingBalance} ${status.currency}',
            style: Theme.of(context).textTheme.titleLarge),
        if (!nested) const SupportContact(),
        if (!nested) DisclaimerBanner(text: status.disclaimer),
      ],
    );
    if (nested) {
      return body;
    }
    return _LockScaffold(title: 'Outstanding balance', children: [body]);
  }
}

class PromptPayScreen extends StatelessWidget {
  const PromptPayScreen({super.key, required this.state, this.nested = false});
  final LockViewState state;
  final bool nested;

  @override
  Widget build(BuildContext context) {
    final payload = state.status?.latestIntent?.qrPayload?.toString() ?? '';
    final qr = payload.isEmpty
        ? const Text('No PromptPay QR yet. Use Pay to request one from the server.')
        : Column(
            children: [
              QrImageView(data: payload, size: 180),
              Text(payload, textAlign: TextAlign.center),
            ],
          );
    if (nested) {
      return qr;
    }
    return _LockScaffold(
      title: 'PromptPay QR',
      children: [
        qr,
        _PayActions(state: state),
        DisclaimerBanner(text: state.status!.disclaimer),
      ],
    );
  }
}

class PaymentPendingScreen extends StatelessWidget {
  const PaymentPendingScreen({super.key, required this.state});
  final LockViewState state;

  @override
  Widget build(BuildContext context) {
    return _LockScaffold(
      title: 'Payment pending',
      children: [
        Text('Intent ${state.status?.latestIntent?.status ?? 'unknown'}'),
        const Text('Paid only after the server confirms the webhook. Do not upload screenshots.'),
        PromptPayScreen(state: state, nested: true),
        FilledButton(
          onPressed: () => context.read<LockCubit>().refreshPayment(),
          child: const Text('Refresh payment status'),
        ),
        const SupportContact(),
        DisclaimerBanner(text: state.status!.disclaimer),
      ],
    );
  }
}

class UnlockConfirmationScreen extends StatelessWidget {
  const UnlockConfirmationScreen({super.key, required this.state});
  final LockViewState state;

  @override
  Widget build(BuildContext context) {
    final os = state.status!.osEnforcement;
    return _LockScaffold(
      title: 'Unlock confirmation',
      children: [
        const Text('Payment is server-confirmed.'),
        Text(
          os == OsEnforcement.none
              ? 'OS Single App Mode was not active. No MDM unlock command is implied.'
              : 'Waiting for MDM to disable Single App Mode. Keep this app open if the phone stays on this screen.',
        ),
        const SupportContact(),
        DisclaimerBanner(text: state.status!.disclaimer),
      ],
    );
  }
}

class RecoveryScreen extends StatelessWidget {
  const RecoveryScreen({super.key, required this.state});
  final LockViewState state;

  @override
  Widget build(BuildContext context) {
    return _LockScaffold(
      title: 'Recovery instructions',
      children: [
        const Text(
          'If this iPhone was reset, replaced, or left Remote Management, contact the shop. Staff will start a re-enrollment session. Do not erase the device yourself unless the shop asks.',
        ),
        Text('Shop: ${state.status!.merchantName}'),
        const SupportContact(),
        DisclaimerBanner(text: state.status!.disclaimer),
      ],
    );
  }
}

class LockErrorScreen extends StatelessWidget {
  const LockErrorScreen({super.key, required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return _LockScaffold(
      title: 'Network error',
      children: [
        Text(message),
        const Text('Check Wi-Fi or mobile data, then retry. Emergency calling on the iPhone is not controlled by this app.'),
        FilledButton(
          onPressed: () => context.read<LockCubit>().load(),
          child: const Text('Retry'),
        ),
        const SupportContact(),
      ],
    );
  }
}

class SupportContact extends StatelessWidget {
  const SupportContact({super.key});

  @override
  Widget build(BuildContext context) {
    final name = context.watch<LockCubit>().state.status?.merchantName ?? 'the shop';
    return Card(
      child: ListTile(
        leading: const Icon(Icons.support_agent),
        title: const Text('Contact the merchant'),
        subtitle: Text(name),
      ),
    );
  }
}

class DisclaimerBanner extends StatelessWidget {
  const DisclaimerBanner({super.key, this.text});
  final String? text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Text(
        text ?? defaultDisclaimer,
        style: Theme.of(context).textTheme.bodySmall,
      ),
    );
  }
}

class _PayActions extends StatelessWidget {
  const _PayActions({required this.state});
  final LockViewState state;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        FilledButton(
          onPressed: () => context.read<LockCubit>().startPromptPay(),
          child: const Text('Request PromptPay QR'),
        ),
        TextButton(
          onPressed: () => context.read<LockCubit>().refreshPayment(),
          child: const Text('Refresh payment status'),
        ),
        if (state.error != null) Text(state.error!, style: const TextStyle(color: Colors.red)),
      ],
    );
  }
}

class _LockScaffold extends StatelessWidget {
  const _LockScaffold({required this.title, required this.children});
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: children,
      ),
    );
  }
}
