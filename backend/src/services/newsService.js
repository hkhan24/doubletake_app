const axios = require('axios');
const { isValidPair } = require('../utils/biasCheck');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); // Uses environment variable if not specified, but good to explicit if user provided GEMINI_API_KEY


const DEFAULT_TOPICS = [
    "global economy", "technology", "artificial intelligence",
    "renewable energy", "climate change", "space exploration",
    "international trade", "global health"
];

const MOCK_DATA_POOL = [
    {
        topic: "Global Economy",
        western: {
            title: "Global Markets Rally Amid Positive Economic Data",
            source: { name: "Reuters" },
            description: "Stocks in major Western markets saw a significant uplift today as consumer confidence indexes surpassed expectations.",
            urlToImage: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=2070&auto=format&fit=crop"
        },
        non_western: {
            title: "Asian Exchanges Show Cautious Optimism on Trade News",
            source: { name: "Al Jazeera English" },
            description: "Observers note a steady start to the trading day in key Asian financial hubs following recent trade negotiations.",
            urlToImage: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=2070&auto=format&fit=crop"
        }
    }
];

function formatGdeltArticle(article) {
    if (!article) return null;
    return {
        title: article.title || 'No Title Available',
        source: {
            id: article.domain,
            name: article.domain
        },
        description: article.title || 'No detailed description provided by source.',
        url: article.url,
        urlToImage: article.socialimage || ""
    };
}

async function getNewsPair(topicQuery) {
    // If no topic provided, pick a random default hot topic
    const searchTopic = topicQuery || DEFAULT_TOPICS[Math.floor(Math.random() * DEFAULT_TOPICS.length)];

    // GDELT V2 Doc API Queries
    // Western Sources Focus
    const westernQuery = `"${searchTopic}" sourcelang:eng (domainis:reuters.com OR domainis:apnews.com OR domainis:cnn.com OR domainis:bbc.co.uk OR domainis:washingtonpost.com OR domainis:bloomberg.com)`;
    // Global South / Non-Western Sources Focus
    const nonWesternQuery = `"${searchTopic}" sourcelang:eng (domainis:aljazeera.com OR domainis:scmp.com OR domainis:thehindu.com OR domainis:tass.com OR domainis:allafrica.com OR domainis:cgtn.com OR domainis:telesurenglish.net)`;

    let insight = "Linguistic insight unavailable.";

    try {
        const westernResponse = await axios.get(`https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(westernQuery)}&mode=artlist&maxrecords=5&format=json`);
        const nonWesternResponse = await axios.get(`https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(nonWesternQuery)}&mode=artlist&maxrecords=5&format=json`);

        if (westernResponse.data && westernResponse.data.articles && westernResponse.data.articles.length > 0 &&
            nonWesternResponse.data && nonWesternResponse.data.articles && nonWesternResponse.data.articles.length > 0) {

            const westernArticleRaw = westernResponse.data.articles[0];
            const nonWesternArticleRaw = nonWesternResponse.data.articles[0];

            const westernArticle = formatGdeltArticle(westernArticleRaw);
            const nonWesternArticle = formatGdeltArticle(nonWesternArticleRaw);

            // Optional final sanity bias validation
            if (isValidPair(westernArticle, nonWesternArticle)) {

                // Attempt to generate insight
                try {
                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: `Analyze these two news headlines about the same topic (${searchTopic}) and identify one key difference in their linguistic framing. Return exactly ONE concise sentence summarizing the bias or perspective shift. Headline A (Western): "${westernArticle.title}". Headline B (Non-Western): "${nonWesternArticle.title}".`
                    });
                    if (response.text) {
                        insight = response.text.trim();
                    }
                } catch (aiError) {
                    console.error("Gemini API Error:", aiError.message);
                    insight = "Could not generate insight at this time.";
                }

                return {
                    topic: searchTopic,
                    sourceA: westernArticle,
                    sourceB: nonWesternArticle,
                    insight: insight,
                    isMock: false
                };
            } else {
                throw new Error("Paired articles flagged by bias-check. They might not be geographically distinct.");
            }
        } else {
            throw new Error("Could not find a valid live pair from GDELT for this topic.");
        }
    } catch (e) {
        console.error("GDELT API Fetch Error, falling back to mock:", e.message);
        const randomMock = MOCK_DATA_POOL[0];
        // Overwrite topic to make it clear we fell back
        return {
            topic: searchTopic + " (MOCK FALLBACK)",
            sourceA: randomMock.western,
            sourceB: randomMock.non_western,
            insight: "Source A emphasizes market positivity, while Source B utilizes more cautious regional terminology.",
            isMock: true,
            error: e.message
        };
    }
}

module.exports = { getNewsPair };
