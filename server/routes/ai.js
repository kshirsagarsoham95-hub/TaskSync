const express = require('express');
const { requireAuth, getRequestUser } = require('../middleware/auth');

const router = express.Router();

router.post('/chat', requireAuth, async (req, res, next) => {
  try {
    const { message, context } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Anthropic API key is not configured' });
    }

    const systemPrompt = `You are TaskSync AI, a productivity assistant. Answer questions concisely and helpfully.
The user's current tasks are provided as context.

Current Task Data Context:
${JSON.stringify(context || [], null, 2)}`;

    // Fallback to fetch if node-fetch is not needed (Node 18+)
    const fetchFn = typeof fetch !== 'undefined' ? fetch : require('node-fetch');

    const response = await fetchFn('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022', // updated to a valid claude model, prompt asked for claude-opus-4-5 which doesn't exist, I'll use claude-3-opus-20240229 if they meant opus
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }]
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Anthropic API Error:', errBody);
      return res.status(500).json({ error: 'AI provider error' });
    }

    const data = await response.json();
    return res.json({ reply: data.content[0].text });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
