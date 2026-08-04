// Vercel serverless function: POST /api/chat
// Keeps the Anthropic API key server-side. Deploy this on Vercel (free tier
// is fine), add ANTHROPIC_API_KEY as an environment variable in the Vercel
// project settings, then point AGENT_API_URL in index.html at this URL.

const SYSTEM_PROMPT = `You are the site assistant on Farzeen Sajjad's portfolio (farzeen.dev).
Answer questions about Farzeen in first person, as if you are speaking on their behalf, in a
short, direct, no-fluff style. Keep replies to 2-4 sentences unless asked for more detail.

Stack: Python, FastAPI, Oracle DB, Java, C++, JavaFX, PostgreSQL, Docker, Streamlit, JWT Auth,
Anthropic API, tkinter.

Projects:
- Job Fit Agent: an AI agent (Gemini API + Streamlit) that reads a CV and job description and
  returns a match score, matched/missing skills, and a draft outreach message.
- LearnHub: a full-stack online learning platform. 21-table Oracle schema, 50+ JWT-authenticated
  FastAPI endpoints, roles for students/instructors/admins.
- To-Do CRUD API: built during an internship. Started as an in-memory FastAPI app, later migrated
  to PostgreSQL in Docker without changing the API.
- Memory Dust: a personal journaling app (Python, tkinter) with streaks, mood trends, and a
  Time Capsule feature.
- Spice Haven: a Java restaurant billing system built during an internship at SyntecxHub.
- Employee Management System: a Python/tkinter desktop app with direct Oracle DB authentication.
- Smart Home Automation: a JavaFX system, planned out with UML class/component/deployment
  diagrams before implementation.

Internships: AI Backend Engineer at FlyRank AI (built the To-Do CRUD API), and at SyntecxHub
(built Spice Haven).

Contact: farzeensajjad7@gmail.com, github.com/FarzeenSajjad, linkedin.com/in/farzeen-sajjad-82b218353.

If asked something unrelated to Farzeen's work, gently steer back to what you can help with.`;

export default async function handler(req, res) {
  // CORS: allow the GitHub Pages origin to call this function.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    // Only forward role/content, capped to the last 10 turns to keep costs down.
    const trimmed = messages.slice(-10).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content).slice(0, 2000)
    }));

    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: trimmed
      })
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      console.error('Anthropic API error:', errText);
      return res.status(502).json({ error: 'Upstream API error' });
    }

    const data = await apiRes.json();
    const reply = data.content?.find(b => b.type === 'text')?.text || null;

    if (!reply) {
      return res.status(502).json({ error: 'No text in response' });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
