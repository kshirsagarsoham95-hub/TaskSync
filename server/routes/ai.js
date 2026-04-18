const express = require('express');
const { requireAuth, getRequestUser } = require('../middleware/auth');

const router = express.Router();

router.post('/chat', requireAuth, async (req, res, next) => {
  try {
    const { message, context } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key is not configured' });
    }

    const systemPrompt = `You are TaskSync AI, a productivity assistant. Answer questions concisely and helpfully.
The user's current tasks are provided as context.

Current Task Data Context:
${JSON.stringify(context || [], null, 2)}`;

    // Fallback to fetch if node-fetch is not needed (Node 18+)
    const fetchFn = typeof fetch !== 'undefined' ? fetch : require('node-fetch');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [{
          role: "user",
          parts: [{ text: message }]
        }],
        generationConfig: {
          maxOutputTokens: 1024,
        }
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Gemini API Error:', errBody);
      return res.status(500).json({ error: 'AI provider error' });
    }

    const data = await response.json();
    let reply = 'Sorry, I could not generate a response.';
    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts.length > 0) {
      reply = data.candidates[0].content.parts[0].text;
    }

    return res.json({ reply });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
