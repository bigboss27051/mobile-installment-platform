import 'package:flutter_bloc/flutter_bloc.dart';

import '../payment_status.dart';
import 'lock_models.dart';
import 'lock_repository.dart';

class LockViewState {
  const LockViewState({
    this.status,
    this.loading = false,
    this.error,
    this.networkError = false,
  });

  final LockStatus? status;
  final bool loading;
  final String? error;
  final bool networkError;

  bool get paid => isServerConfirmedPaid(status?.latestIntent?.status);
}

class LockCubit extends Cubit<LockViewState> {
  LockCubit(this._repository) : super(const LockViewState(loading: true));

  final LockRepository _repository;

  Future<void> load() async {
    emit(const LockViewState(loading: true));
    try {
      final status = await _repository.fetchStatus();
      emit(LockViewState(status: status));
    } catch (err) {
      emit(LockViewState(error: err.toString(), networkError: true));
    }
  }

  Future<void> refreshPayment() async {
    final current = state.status;
    final intentId = current?.latestIntent?.id;
    if (current == null) {
      return load();
    }
    try {
      if (intentId == null) {
        emit(LockViewState(status: await _repository.fetchStatus()));
        return;
      }
      final intent = await _repository.refreshIntent(intentId);
      emit(LockViewState(status: current.copyWith(latestIntent: intent)));
    } catch (err) {
      emit(LockViewState(status: current, error: err.toString(), networkError: true));
    }
  }

  Future<void> startPromptPay() async {
    final current = state.status;
    final contractId = current?.contractId;
    if (current == null || contractId == null) {
      emit(LockViewState(status: current, error: 'No contract to pay'));
      return;
    }
    try {
      final intent = await _repository.createPromptPay(
        contractId: contractId,
        amount: current.outstandingBalance,
        idempotencyKey: DateTime.now().millisecondsSinceEpoch.toString(),
      );
      emit(LockViewState(status: current.copyWith(latestIntent: intent)));
    } catch (err) {
      emit(LockViewState(status: current, error: err.toString(), networkError: true));
    }
  }
}
