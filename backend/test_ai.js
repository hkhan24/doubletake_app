const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const key = process.env.GEMINI_API_KEY;
console.log("Key Length:", key ? key.length : 0);
console.log("Key Prefix:", key ? key.substring(0, 7) : "NONE");

const genAI = new GoogleGenerativeAI(key);

async function listModels() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        const result = await model.generateContent("hello");
        console.log("SUCCESS: gemini-1.5-flash-latest works");
        console.log("Response:", result.response.text());
    } catch (e) {
        console.log("FAILED: 1.5-flash-latest", e.message);
    }
}

listModels();
