require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const prompt = `You are an expert travel planner. Create a detailed 2-day travel itinerary for Kuala Lumpur.
Travel style: cultural

Respond ONLY with a valid JSON object (no markdown, no code blocks) in this exact format:
{
  "destination": "Kuala Lumpur",
  "duration": 2,
  "overview": "A 2-3 sentence summary of the trip",
  "tips": ["tip1", "tip2"],
  "days": [
    {
      "day": 1,
      "title": "Day title",
      "activities": [
        { "time": "09:00 AM", "activity": "Location", "description": "Details", "estimatedCost": 0, "lat": 3.1390, "lng": 101.6869 }
      ],
      "accommodation": "Hotel suggestion",
      "meals": ["Breakfast", "Lunch", "Dinner"]
    }
  ],
  "packingList": [{ "item": "item", "reason": "reason" }]
}`;

console.log('Testing full itinerary generation...');
ai.models.generateContent({ model: 'gemini-flash-lite-latest', contents: prompt })
  .then(r => {
    const text = r.text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) { console.log('❌ No JSON found in response'); return; }
    const parsed = JSON.parse(jsonMatch[0]);
    console.log('✅ ITINERARY GENERATED SUCCESSFULLY!');
    console.log('  Destination:', parsed.destination);
    console.log('  Days:', parsed.days?.length);
    console.log('  Overview:', parsed.overview?.substring(0, 80) + '...');
  })
  .catch(e => console.error('❌ FAILED:', e.message));
