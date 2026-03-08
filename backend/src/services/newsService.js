const axios = require('axios');
const { isValidPair } = require('../utils/biasCheck');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const DEFAULT_TOPICS = [
    "global economy", "technology", "artificial intelligence",
    "renewable energy", "climate change", "space exploration",
    "international trade", "global health"
];

// Global Server-Side Caching Structures
const globalCache = {};
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds

const STOP_WORDS = new Set([
    "the", "and", "for", "with", "from", "that", "this", "says", "reports", "warns",
    "amid", "over", "news", "update", "first", "after", "says", "told", "about",
    "will", "into", "been", "their", "more", "they", "were"
]);

// Comprehensive helper to extract keywords, using Gemini with a local fallback
async function extractSearchKeywords(headline) {
    // 1. Attempt AI-based extraction
    try {
        const modelNames = ["gemini-1.5-flash-latest", "gemini-1.5-pro-latest", "gemini-1.5-flash", "gemini-1.5-pro"];
        for (const modelName of modelNames) {
            try {
                const model = ai.getGenerativeModel({ model: modelName });
                const prompt = `News Headline: "${headline}"
                Extract exactly 2-3 most specific keywords/proper nouns for a search query. 
                Return space-separated words only. No punctuation.`;
                const result = await model.generateContent(prompt);
                const text = result.response.text().trim().toLowerCase().replace(/[^a-z0-9 ]/g, "");
                if (text && text.length > 3) return text;
            } catch (e) { /* silent try next */ }
        }
    } catch (globalAiError) {
        console.error("AI Keyword Extraction fully failed.");
    }

    // 2. Local Fallback: Improved entity extraction
    const cleaned = headline.replace(/[^a-zA-Z0-9 ]/g, "");
    const words = cleaned.split(/\s+/);
    const keywords = [];

    // Look for potential proper nouns (Capitalized, but excluding common starters)
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (word.length < 3) continue;

        // Is it capitalized?
        const isCapitalized = /^[A-Z]/.test(word);

        // For the first word, only include if it's NOT a common stopword even when capitalized
        if (i === 0) {
            if (isCapitalized && !STOP_WORDS.has(word.toLowerCase())) {
                keywords.push(word.toLowerCase());
            }
        } else if (isCapitalized) {
            keywords.push(word.toLowerCase());
        }
    }

    // If we have too few keywords, add the longest non-stopwords
    if (keywords.length < 2) {
        const sorted = words
            .filter(w => w.length > 5 && !STOP_WORDS.has(w.toLowerCase()))
            .sort((a, b) => b.length - a.length);
        keywords.push(...sorted.slice(0, 2).map(w => w.toLowerCase()));
    }

    // Return unique results
    return [...new Set(keywords)].slice(0, 3).join(' ');
}

async function getNewsPair(topicQuery) {
    const searchTopic = topicQuery || DEFAULT_TOPICS[Math.floor(Math.random() * DEFAULT_TOPICS.length)];
    const newsApiKey = process.env.NEWS_API_KEY;
    if (!newsApiKey) throw new Error("NEWS_API_KEY is missing.");

    const westernDomains = 'reuters.com,apnews.com,cnn.com,bbc.co.uk,washingtonpost.com,bloomberg.com';
    const nonWesternDomains = 'aljazeera.com,scmp.com,thehindu.com,tass.com,allafrica.com,cgtn.com,telesurenglish.net';

    const now = Date.now();
    if (globalCache[searchTopic] && (now - globalCache[searchTopic].timestamp < CACHE_TTL)) {
        return { ...globalCache[searchTopic].data, isCachedFallback: false };
    }

    try {
        console.log(`Starting news fetch for topic: ${searchTopic}`);
        const westernUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(searchTopic)}&domains=${westernDomains}&language=en&pageSize=40&sortBy=popularity`;
        const westernResponse = await axios.get(westernUrl, { headers: { 'X-Api-Key': newsApiKey } });

        if (!westernResponse.data?.articles || westernResponse.data.articles.length === 0) {
            throw new Error("No Anchor articles found for topic: " + searchTopic);
        }

        const potentialAnchors = westernResponse.data.articles.slice(0, 20);

        for (let i = 0; i < potentialAnchors.length; i++) {
            const anchor = potentialAnchors[i];
            if (anchor.title.length < 25) continue;

            console.log(`Anchor [${i}]: ${anchor.title}`);
            const keywords = await extractSearchKeywords(anchor.title);
            console.log(`Searching with keywords: ${keywords}`);

            const nonWesternUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(keywords)}&domains=${nonWesternDomains}&language=en&pageSize=5&sortBy=relevancy`;
            const nonWesternResponse = await axios.get(nonWesternUrl, { headers: { 'X-Api-Key': newsApiKey } });

            if (nonWesternResponse.data?.articles?.length > 0) {
                const match = nonWesternResponse.data.articles[0];

                // Verification: Do they share at least one significant word?
                const anchorWords = anchor.title.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/);
                const matchWords = match.title.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/);

                const intersection = anchorWords.filter(w =>
                    w.length > 4 &&
                    !STOP_WORDS.has(w) &&
                    matchWords.includes(w)
                );

                if (intersection.length > 0 || keywords.split(' ').every(k => match.title.toLowerCase().includes(k))) {
                    console.log(`Verified Match: ${match.title}`);

                    const westernArticle = {
                        title: anchor.title,
                        source: { id: anchor.source.id || anchor.source.name, name: anchor.source.name },
                        description: anchor.description,
                        url: anchor.url,
                        urlToImage: anchor.urlToImage || ""
                    };
                    const nonWesternArticle = {
                        title: match.title,
                        source: { id: match.source.id || match.source.name, name: match.source.name },
                        description: match.description,
                        url: match.url,
                        urlToImage: match.urlToImage || ""
                    };

                    let insight = "Linguistic insight unavailable.";
                    try {
                        const modelNames = ["gemini-1.5-flash-latest", "gemini-1.5-pro-latest", "gemini-1.5-flash", "gemini-1.5-pro"];
                        for (const modelName of modelNames) {
                            try {
                                const model = ai.getGenerativeModel({ model: modelName });
                                const prompt = `Analyze framing: "${westernArticle.title}" vs "${nonWesternArticle.title}". One sentence.`;
                                const result = await model.generateContent(prompt);
                                if (result && result.response) {
                                    insight = result.response.text().trim();
                                    if (insight) break;
                                }
                            } catch (e) {
                                console.warn(`Model ${modelName} failed for insight.`);
                            }
                        }
                    } catch (err) { }

                    const payload = {
                        topic: searchTopic,
                        sourceA: westernArticle,
                        sourceB: nonWesternArticle,
                        insight: insight,
                        isMock: false
                    };

                    globalCache[searchTopic] = { timestamp: now, data: payload };
                    return payload;
                }
            }
        }
        throw new Error("Match failed after 20 anchor attempts.");
    } catch (e) {
        console.error("getNewsPair error:", e.message);
        if (globalCache[searchTopic]) {
            return { ...globalCache[searchTopic].data, isCachedFallback: true, warning: "Live API error. Serving cached result." };
        }
        throw new Error("Failed to retrieve perspectives: " + e.message);
    }
}

module.exports = { getNewsPair };
