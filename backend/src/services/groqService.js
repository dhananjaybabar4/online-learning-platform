const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const ATL_BOT_SYSTEM_PROMPT = `You are ATL Bot, a friendly AI coding assistant for students. 
Keep answers SHORT and simple (3-5 lines max). 
Use one small code example only when needed.
Be friendly and encouraging. No long explanations.`;

async function chatWithGemini(message, history = []) {
  const formattedHistory = history
    .filter(msg => msg.role === 'user' || msg.role === 'assistant')
    .map(msg => ({
      role: msg.role,
      content: msg.content
    }));

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: ATL_BOT_SYSTEM_PROMPT },
      ...formattedHistory,
      { role: 'user', content: message }
    ],
    max_tokens: 1024,
  });

  return response.choices[0].message.content;
}

module.exports = { chatWithGemini };