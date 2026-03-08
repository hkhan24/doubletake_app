const express = require('express');
const router = express.Router();
const { getNewsPair } = require('../services/newsService');

router.get('/pair', async (req, res) => {
    try {
        const topic = req.query.topic; // Option to pass a topic
        const pair = await getNewsPair(topic);
        res.json(pair);
    } catch (error) {
        console.error("Error in /api/news/pair endpoint:", error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

module.exports = router;
