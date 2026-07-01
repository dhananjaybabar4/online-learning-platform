const express = require('express');
const router = express.Router();
const { chatWithGemini } = require('../services/groqService'); // ✅ import name

// POST /api/chat/send
router.post('/send', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const aiResponse = await chatWithGemini(message, history); // ✅ fixed: was chatWithGroq

    res.json({
      success: true,
      message: aiResponse
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      message: 'ATL Bot is unavailable right now. Please try again!'
    });
  }
});

// GET /api/chat/history/:userId
router.get('/history/:userId', async (req, res) => {
  res.json({ success: true, data: [] });
});

module.exports = router;