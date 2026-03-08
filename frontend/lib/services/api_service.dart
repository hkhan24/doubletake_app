import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  static const String baseUrl = 'http://localhost:3000/api/news';

  Future<Map<String, dynamic>> fetchNewsPair() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/pair'));
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Failed to load news pair (Status \${response.statusCode})');
      }
    } catch (e) {
      throw Exception('Error fetching news pair: $e');
    }
  }
}
