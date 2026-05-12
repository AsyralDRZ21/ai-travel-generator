const { GoogleGenerativeAI } = require('@google/generative-ai');
const User = require('../models/User');

exports.getRecommendations = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const travelStyles = user.preferences?.travelStyles || [];
    const styleString = travelStyles.length > 0 ? travelStyles.join(', ') : 'general tourist attractions';

    // Verify Gemini API Key exists
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: 'GEMINI_API_KEY is not configured in .env' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const prompt = `Act as an expert travel agent. 
The user is interested in these travel styles: ${styleString}.
Recommend 3 amazing destinations around the world that perfectly match these interests.

Respond EXACTLY with a JSON array of 3 objects containing details for each destination.
Format requirements:
[
  {
    "destination": "City, Country",
    "description": "A captivating 2-sentence description of why it fits the user's interests.",
    "matchReason": "Why it matches: ${styleString}",
    "bestTimeToVisit": "e.g., Spring or Fall",
    "topAttractions": ["Attraction 1", "Attraction 2", "Attraction 3"]
  }
]

Do NOT include any markdown code blocks, do NOT write \`\`\`json, just return the raw JSON array.`;

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();

    const recommendations = JSON.parse(text);

    res.status(200).json({ recommendations });

  } catch (error) {
    console.error('Gemini Recommendation Error:', error);
    res.status(500).json({ message: 'Server error generating recommendations', error: error.message });
  }
};
