import 'package:flutter/material.dart';

import 'api.dart';
import 'lock/lock_models.dart';
import 'lock/lock_repository.dart';
import 'lock/lock_screens.dart';
import 'outstanding_pay.dart';
import 'payment_status.dart';
import 'promptpay_qr.dart';

String contractNumberOf(Map<String, dynamic> row) {
  final number = row['contractNumber'];
  if (number is String && number.isNotEmpty) {
    return number;
  }
  return '—';
}

String contractStatusLabel(String? status) {
  switch (status) {
    case 'DRAFT':
      return 'ฉบับร่าง';
    case 'ACTIVE':
      return 'เปิดใช้งาน';
    case 'CANCELLED':
      return 'ยกเลิก';
    case 'CLOSED':
      return 'ปิดสัญญา';
    default:
      return status ?? '—';
  }
}

void main() {
  runApp(const CustomerApp());
}

class CustomerApp extends StatelessWidget {
  const CustomerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MIP Customer',
      theme: ThemeData(colorSchemeSeed: const Color(0xFF2CB1BC), useMaterial3: true),
      home: const LoginPage(),
      onGenerateRoute: (settings) {
        final uri = Uri.tryParse(settings.name ?? '');
        if (uri == null) {
          return null;
        }
        final screen = screenFromLockDeepLink(uri);
        if (screen == null) {
          return null;
        }
        return MaterialPageRoute<void>(
          builder: (_) => LockShell(
            repository: PreviewLockRepository(previewFixture(DesiredPresentation.lock)),
            forcedScreen: screen,
          ),
        );
      },
    );
  }
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final api = CustomerApi(baseUrl: const String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000',
  ));
  final slug = TextEditingController();
  final phone = TextEditingController();
  final code = TextEditingController(text: '123456');
  String? error;
  bool requested = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Customer login')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(controller: slug, decoration: const InputDecoration(labelText: 'Tenant slug')),
            TextField(controller: phone, decoration: const InputDecoration(labelText: 'Phone')),
            if (requested)
              TextField(controller: code, decoration: const InputDecoration(labelText: 'OTP')),
            if (error != null) Text(error!, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 12),
            const Text(
              'OS lock is enforced by the shop DPC on the financed phone — this app shows status and payment only.',
              style: TextStyle(fontSize: 12),
            ),
            TextButton(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => const LockPreviewGallery(),
                  ),
                );
              },
              child: const Text('Lock screens (preview)'),
            ),
            FilledButton(
              onPressed: () async {
                try {
                  if (!requested) {
                    await api.requestOtp(tenantSlug: slug.text, phone: phone.text);
                    setState(() {
                      requested = true;
                      error = null;
                    });
                    return;
                  }
                  final token = await api.verifyOtp(
                    tenantSlug: slug.text,
                    phone: phone.text,
                    code: code.text,
                  );
                  if (!context.mounted) {
                    return;
                  }
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute<void>(
                      builder: (_) => ContractsPage(api: api..token = token),
                    ),
                  );
                } catch (err) {
                  setState(() => error = err.toString());
                }
              },
              child: Text(requested ? 'Verify OTP' : 'Request OTP'),
            ),
          ],
        ),
      ),
    );
  }
}

class ContractsPage extends StatefulWidget {
  const ContractsPage({super.key, required this.api});

  final CustomerApi api;

  @override
  State<ContractsPage> createState() => _ContractsPageState();
}

class _ContractsPageState extends State<ContractsPage> {
  late Future<List<dynamic>> future;

  @override
  void initState() {
    super.initState();
    future = widget.api.listContracts();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My contracts'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => LockShell(repository: ApiLockRepository(widget.api)),
                ),
              );
            },
            child: const Text('Device / lock status'),
          ),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: OutlinedButton(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => LockShell(repository: ApiLockRepository(widget.api)),
                  ),
                );
              },
              child: const Text('Open device / lock status'),
            ),
          ),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Text(
              'Status comes from the platform API. The financed Android phone is locked by the DPC, not by this Flutter screen alone.',
              style: TextStyle(fontSize: 12),
            ),
          ),
          Expanded(
            child: FutureBuilder(
              future: future,
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }
                final rows = snapshot.data!;
                return ListView.builder(
                  itemCount: rows.length,
                  itemBuilder: (context, index) {
                    final row = rows[index] as Map<String, dynamic>;
                    return ListTile(
                      title: Text(contractNumberOf(row)),
                      subtitle: Text(
                        '${contractStatusLabel(row['status'] as String?)} · ${row['financedAmount']} ${row['currency']}',
                      ),
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => ContractDetailPage(
                              api: widget.api,
                              contractId: row['id'] as String,
                            ),
                          ),
                        );
                      },
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class ContractDetailPage extends StatefulWidget {
  const ContractDetailPage({super.key, required this.api, required this.contractId});

  final CustomerApi api;
  final String contractId;

  @override
  State<ContractDetailPage> createState() => _ContractDetailPageState();
}

class _ContractDetailPageState extends State<ContractDetailPage> {
  Map<String, dynamic>? contract;
  Map<String, dynamic>? intent;
  String? error;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  Future<void> _reload() async {
    try {
      final data = await widget.api.getContract(widget.contractId);
      setState(() {
        contract = data;
        error = null;
      });
    } catch (err) {
      setState(() => error = err.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = (contract?['scheduleItems'] as List<dynamic>? ?? [])
        .cast<Map<String, dynamic>>();
    final paid = isServerConfirmedPaid(intent?['status'] as String?);
    return Scaffold(
      appBar: AppBar(
        title: Text('สัญญา ${contractNumberOf(contract ?? <String, dynamic>{})}'),
      ),
      body: contract == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text('สถานะ ${contractStatusLabel(contract!['status'] as String?)}'),
                Text(
                  'Outstanding ${contract!['outstandingBalance'] ?? '—'} ${contract!['currency']}',
                ),
                ...items.map(
                  (item) => ListTile(
                    title: Text('Installment ${item['seq']}'),
                    subtitle: Text('Due ${item['totalDue']} paid ${item['amountPaid']}'),
                  ),
                ),
                Builder(
                  builder: (context) {
                    final amount = payAmountFromContract(contract!);
                    if (amount == null) {
                      return const Text('Nothing outstanding to pay.');
                    }
                    return FilledButton(
                      onPressed: () async {
                        final created = await widget.api.createIntent(
                          contractId: widget.contractId,
                          amount: amount,
                          idempotencyKey:
                              DateTime.now().millisecondsSinceEpoch.toString(),
                        );
                        setState(() => intent = created);
                      },
                      child: Text('Pay $amount PromptPay (sandbox)'),
                    );
                  },
                ),
                if (intent != null) ...[
                  Text('Intent ${intent!['status']}'),
                  Text(paid ? 'Paid (server confirmed)' : 'Not paid until webhook succeeds'),
                  Builder(
                    builder: (context) {
                      final vm = PromptPayQrViewModel.fromPayload(
                        intent!['qrPayload'],
                      );
                      if (vm.imageUrlPng != null) {
                        return Column(
                          children: [
                            Image.network(vm.imageUrlPng!, width: 200, height: 200),
                            if (vm.hostedInstructionsUrl != null)
                              Text(vm.hostedInstructionsUrl!),
                          ],
                        );
                      }
                      if (vm.hostedInstructionsUrl != null) {
                        return Text(vm.hostedInstructionsUrl!);
                      }
                      return Text(jsonPreview(intent!['qrPayload']));
                    },
                  ),
                ],
                if (error != null) Text(error!, style: const TextStyle(color: Colors.red)),
              ],
            ),
    );
  }
}

String jsonPreview(Object? value) {
  return value?.toString() ?? '';
}
