import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';
import '../widgets/article_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ApiService _apiService = ApiService();
  Map<String, dynamic>? _newsPair;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchNews();
  }

  Future<void> _fetchNews() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _newsPair = null;
    });

    try {
      final pair = await _apiService.fetchNewsPair();
      setState(() {
        _newsPair = pair;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Dark slate blue background
      body: Stack(
        children: [
          // Background Gradient Orbs for Glassmorphism effect
          Positioned(
            top: -100,
            left: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.blueAccent.withOpacity(0.3),
                boxShadow: const [BoxShadow(blurRadius: 100, color: Colors.blueAccent)],
              ),
            ),
          ),
          Positioned(
            bottom: -100,
            right: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.deepOrangeAccent.withOpacity(0.3),
                boxShadow: const [BoxShadow(blurRadius: 100, color: Colors.deepOrangeAccent)],
              ),
            ),
          ),
          SafeArea(
            child: _buildBody(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _isLoading ? null : _fetchNews,
        backgroundColor: Colors.white.withOpacity(0.9),
        icon: _isLoading 
            ? const SizedBox(
                width: 24, 
                height: 24, 
                child: CircularProgressIndicator(color: Colors.black87, strokeWidth: 2)
              )
            : const Icon(Icons.refresh, color: Colors.black87),
        label: Text(
          'Refresh Perspectives',
          style: GoogleFonts.inter(
            color: Colors.black87,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
    );
  }

  Widget _buildBody() {
    if (_isLoading && _newsPair == null) {
      return const Center(
        child: CircularProgressIndicator(color: Colors.white),
      );
    }

    if (_errorMessage != null && _newsPair == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, color: Colors.redAccent, size: 64),
              const SizedBox(height: 16),
              Text(
                'Failed to load perspectives.',
                style: GoogleFonts.inter(color: Colors.white, fontSize: 18),
              ),
              const SizedBox(height: 8),
              Text(
                _errorMessage!,
                style: GoogleFonts.inter(color: Colors.white70, fontSize: 14),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    final westernArticle = _newsPair!['sourceA'];
    final nonWesternArticle = _newsPair!['sourceB'];
    final topic = _newsPair!['topic'] ?? 'Daily Event';
    final insight = _newsPair!['insight'];

    return Padding(
      padding: const EdgeInsets.only(bottom: 80.0), // Space for fab
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              children: [
                Text(
                  'DOUBLETAKE',
                  style: GoogleFonts.montserrat(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 8,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  topic.toUpperCase(),
                  style: GoogleFonts.inter(
                    color: Colors.white70,
                    fontSize: 12,
                    letterSpacing: 2,
                  ),
                ),
              ],
            ),
          ),
          if (insight != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 8.0),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.1),
                  border: Border.all(color: Colors.white.withOpacity(0.2)),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.auto_awesome, color: Colors.yellowAccent, size: 24),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'AI LINGUISTIC INSIGHT',
                            style: GoogleFonts.inter(
                              color: Colors.white70,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1.5,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            insight,
                            style: GoogleFonts.inter(
                              color: Colors.white,
                              fontSize: 14,
                              fontStyle: FontStyle.italic,
                              height: 1.4,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          Expanded(
            child: Flex(
              direction: MediaQuery.of(context).size.width > 800 ? Axis.horizontal : Axis.vertical,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 0, 24, 12),
                    child: ArticleCard(
                      articleData: westernArticle,
                      regionLabel: 'Western Perspective',
                      themeColor: Colors.blueAccent,
                    ),
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
                    child: ArticleCard(
                      articleData: nonWesternArticle,
                      regionLabel: 'Non-Western Perspective',
                      themeColor: Colors.deepOrangeAccent,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
