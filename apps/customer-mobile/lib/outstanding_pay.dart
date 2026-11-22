/// Picks the PromptPay amount from a portal contract map.
/// Returns null when there is nothing to pay (missing/zero/invalid).
String? payAmountFromContract(Map<String, dynamic> contract) {
  final raw = contract['outstandingBalance']?.toString();
  if (raw == null || raw.isEmpty) {
    return null;
  }
  final value = double.tryParse(raw);
  if (value == null || value <= 0) {
    return null;
  }
  return raw;
}
