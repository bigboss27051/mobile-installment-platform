import 'dart:convert';

import 'package:http/http.dart' as http;

class CustomerApi {
  CustomerApi({required this.baseUrl, this.token});

  final String baseUrl;
  String? token;

  Future<void> requestOtp({
    required String tenantSlug,
    required String phone,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/v1/auth/customer/otp/request'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'tenantSlug': tenantSlug, 'phone': phone}),
    );
    if (response.statusCode >= 400) {
      throw Exception('OTP request failed');
    }
  }

  Future<String> verifyOtp({
    required String tenantSlug,
    required String phone,
    required String code,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/v1/auth/customer/otp/verify'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'tenantSlug': tenantSlug,
        'phone': phone,
        'code': code,
      }),
    );
    if (response.statusCode >= 400) {
      throw Exception('OTP verify failed');
    }
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    return (body['data'] as Map<String, dynamic>)['accessToken'] as String;
  }

  Future<List<dynamic>> listContracts() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/v1/me/contracts'),
      headers: _authHeaders(),
    );
    if (response.statusCode >= 400) {
      throw Exception('Failed to load contracts');
    }
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    return body['data'] as List<dynamic>;
  }

  Future<Map<String, dynamic>> getContract(String id) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/v1/me/contracts/$id'),
      headers: _authHeaders(),
    );
    if (response.statusCode >= 400) {
      throw Exception('Failed to load contract');
    }
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    return body['data'] as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getLockStatus() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/v1/me/lock-status'),
      headers: _authHeaders(),
    );
    if (response.statusCode >= 400) {
      throw Exception('Failed to load lock status');
    }
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    return body['data'] as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getPaymentIntent(String id) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/v1/me/payment-intents/$id'),
      headers: _authHeaders(),
    );
    if (response.statusCode >= 400) {
      throw Exception('Failed to load payment intent');
    }
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    return body['data'] as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> createIntent({
    required String contractId,
    required String amount,
    required String idempotencyKey,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/v1/me/contracts/$contractId/payment-intents'),
      headers: {
        ..._authHeaders(),
        'Idempotency-Key': idempotencyKey,
      },
      body: jsonEncode({'amount': amount}),
    );
    if (response.statusCode >= 400) {
      throw Exception('Failed to create payment intent');
    }
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    return body['data'] as Map<String, dynamic>;
  }

  Map<String, String> _authHeaders() => {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };
}
