const axios = require('axios');
const { isValidPair } = require('../utils/biasCheck');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); // Uses environment variable if not specified, but good to explicit if user provided GEMINI_API_KEY


const DEFAULT_TOPICS = [
    "global economy", "technology", "artificial intelligence",
    "renewable energy", "climate change", "space exploration",
    "international trade", "global health"
];

// Global Server-Side Caching Structures
const globalCache = {};
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds


async function getNewsPair(topicQuery) {
    // If no topic provided, pick a random default hot topic
    const searchTopic = topicQuery || DEFAULT_TOPICS[Math.floor(Math.random() * DEFAULT_TOPICS.length)];

    // NewsAPI Queries
    const newsApiKey = process.env.NEWS_API_KEY;
    if (!newsApiKey) {
        throw new Error("Misconfigured Backend: NEWS_API_KEY is missing from environment variables.");
    }

    // Western Sources Focus
    // According to NewsAPI domains spec, just pass comma separated domains
    const westernDomains = 'reuters.com,apnews.com,cnn.com,bbc.co.uk,washingtonpost.com,bloomberg.com';
    // Global South / Non-Western Sources Focus
    const nonWesternDomains = 'aljazeera.com,scmp.com,thehindu.com,tass.com,allafrica.com,cgtn.com,telesurenglish.net';

    // 1. Check for valid 15-minute cache
    const now = Date.now();
    if (globalCache[searchTopic] && (now - globalCache[searchTopic].timestamp < CACHE_TTL)) {
        console.log(`Serving valid cached pair for topic: ${searchTopic}`);
        return {
            ...globalCache[searchTopic].data,
            isCachedFallback: false
        };
    }

    let insight = "Linguistic insight unavailable.";

    try {
        // Step 1: Fetch Western "Anchor" Articles
        const westernUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(searchTopic)}&domains=${westernDomains}&language=en&pageSize=10&sortBy=publishedAt`;
        const westernResponse = await axios.get(westernUrl, { headers: { 'X-Api-Key': newsApiKey } });

        if (!westernResponse.data || !westernResponse.data.articles || westernResponse.data.articles.length === 0) {
            throw new Error("Could not find any Anchor articles on this topic.");
        }

        let pairedMatch = null;
        let westernArticleRaw = null;
        let nonWesternArticleRaw = null;

        // Common stop words to exclude during keyword extraction
        const stopWords = new Set(["the", "to", "of", "and", "a", "in", "for", "is", "on", "that", "by", "with", "as", "at", "it", "from", "are", "be", "was", "this", "or", "an", "will", "has", "have"]);

        // Step 2: Extract Proper Nouns (Named Entities) to find the exact same story
        for (const testAnchor of westernResponse.data.articles) {

            // Extract contiguous capitalized words (Proper Nouns like "Donald Trump" or "NASA")
            const title = testAnchor.title;
            const properNouns = [];
            const words = title.split(/\s+/);

            // Skip the first word as it's always capitalized in a sentence, unless the whole headline is Title Case
            for (let i = 1; i < words.length; i++) {
                const word = words[i].replace(/[^a-zA-Z]/g, '');
                if (word.length > 2 && /^[A-Z][a-z]*$/.test(word) && !stopWords.has(word.toLowerCase())) {
                    properNouns.push(word);
                } else if (/^[A-Z]+$/.test(word)) {
                    properNouns.push(word); // Catch Acronyms like NASA or BRICS
                }
            }

            // If we couldn't find proper nouns in the middle, fallback to the first word or longest words
            let keywords = properNouns;
            if (keywords.length === 0) {
                const cleanWords = title.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(' ');
                keywords = cleanWords.filter(w => w.length > 5 && !stopWords.has(w)).slice(0, 2);
            } else {
                // Limit to max 3 proper nouns to avoid overly restrictive queries
                keywords = keywords.slice(0, 3);
            }

            if (keywords.length === 0) continue;

            // Enforce strict exact-match quoting on the proper nouns so NewsAPI doesn't fuzzy match.
            // Example: "South African" AND "Associated Press" (Wait, Associated Press is source, we just want entities)
            // It's safer to exact quote the longest contiguous noun phrase, or just require all words.
            const strictQuery = keywords.map(kw => `+"${kw}"`).join(' ');

            // Now, search Non-Western domains using this highly specific Proper Noun set
            const nonWesternUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(strictQuery)}&domains=${nonWesternDomains}&language=en&pageSize=1&sortBy=relevancy`;
            const nonWesternResponse = await axios.get(nonWesternUrl, { headers: { 'X-Api-Key': newsApiKey } });

            if (nonWesternResponse.data && nonWesternResponse.data.articles && nonWesternResponse.data.articles.length > 0) {
                // We found a match!
                westernArticleRaw = testAnchor;
                nonWesternArticleRaw = nonWesternResponse.data.articles[0];
                pairedMatch = true;
                break;
            }
        }

        if (pairedMatch) {
            // Normalize structure to what frontend expects
            const westernArticle = {
                title: westernArticleRaw.title,
                source: {
                    id: westernArticleRaw.source.id || westernArticleRaw.source.name,
                    name: westernArticleRaw.source.name
                },
                description: westernArticleRaw.description || 'Description unavailable.',
                url: westernArticleRaw.url,
                urlToImage: westernArticleRaw.urlToImage || ""
            };

            const nonWesternArticle = {
                title: nonWesternArticleRaw.title,
                source: {
                    id: nonWesternArticleRaw.source.id || nonWesternArticleRaw.source.name,
                    name: nonWesternArticleRaw.source.name
                },
                description: nonWesternArticleRaw.description || 'Description unavailable.',
                url: nonWesternArticleRaw.url,
                urlToImage: nonWesternArticleRaw.urlToImage || ""
            };

            // Optional final sanity bias validation
            if (isValidPair(westernArticle, nonWesternArticle)) {

                // Attempt to generate insight
                try {
                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: `Analyze these two news headlines about the exact same global event and identify one key difference in their linguistic framing. Return exactly ONE concise sentence summarizing the bias or perspective shift. Headline A (Western): "${westernArticle.title}". Headline B (Non-Western): "${nonWesternArticle.title}".`
                    });
                    if (response.text) {
                        insight = response.text.trim();
                    }
                } catch (aiError) {
                    console.error("Gemini API Error:", aiError.message);
                    insight = "Could not generate insight at this time.";
                }

                const payload = {
                    topic: searchTopic,
                    sourceA: westernArticle,
                    sourceB: nonWesternArticle,
                    insight: insight,
                    isMock: false
                };

                // Save the successful fetch to the cache
                globalCache[searchTopic] = {
                    timestamp: now,
                    data: payload
                };

                return payload;
            } else {
                throw new Error("Paired articles flagged by bias-check. They might not be geographically distinct.");
            }
        } else {
            throw new Error("Could not construct a perfectly matched pair. Retrying later.");
        }
    } catch (e) {
        console.error("NewsAPI Fetch Error:", e.response?.data?.message || e.message);

        // Fallback: If API throws 429 or fails, check if we have ANY cache for this topic, even if expired
        if (globalCache[searchTopic]) {
            console.log(`API failed. Serving EXPIRED cached pair for topic: ${searchTopic}`);
            return {
                ...globalCache[searchTopic].data,
                isCachedFallback: true,
                warning: "Live API Rate Limited. Serving cached results."
            };
        }

        throw new Error("Live Feed Connection Error: Failed to retrieve perspectives from NewsAPI. " + (e.response?.data?.message || e.message));
    }
}

module.exports = { getNewsPair };
