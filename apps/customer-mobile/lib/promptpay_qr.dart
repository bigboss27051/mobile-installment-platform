class PromptPayQrViewModel {
  const PromptPayQrViewModel({
    this.imageUrlPng,
    this.hostedInstructionsUrl,
    this.fallbackText,
  });

  final String? imageUrlPng;
  final String? hostedInstructionsUrl;
  final String? fallbackText;

  static PromptPayQrViewModel fromPayload(Object? payload) {
    if (payload is Map) {
      final png = payload['imageUrlPng']?.toString();
      final url = payload['hostedInstructionsUrl']?.toString();
      if (png != null && png.isNotEmpty) {
        return PromptPayQrViewModel(
          imageUrlPng: png,
          hostedInstructionsUrl: url,
        );
      }
      if (url != null && url.isNotEmpty) {
        return PromptPayQrViewModel(hostedInstructionsUrl: url);
      }
    }
    return PromptPayQrViewModel(fallbackText: payload?.toString());
  }
}
