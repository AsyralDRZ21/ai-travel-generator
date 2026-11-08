require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
  try {
    const prompt = `You are an expert travel planner. Create a detailed 3-day travel itinerary for Tokyo.
Travel style: cultural
The total budget is approximately 1000 USD for 1 person(s).
Number of travelers: 1

Respond ONLY with a valid JSON object (no markdown, no code blocks) in this exact format:
{
  "destination": "Tokyo",
  "duration": 3,
  "overview": "A 2-3 sentence summary of the trip",
  "tips": ["tip1", "tip2", "tip3"],
  "days": [
    {
      "day": 1,
      "title": "Day title",
      "activities": [
        {
          "time": "09:00 AM",
          "activity": "First Location Name",
          "description": "Details about it",
          "estimatedCost": 0,
          "lat": 35.6895,
          "lng": 139.6917
        },
        {
          "transitDetails": { "mode": "Train/Walk/Drive", "time": "15 mins", "distance": "2.5 km" },
          "time": "11:30 AM",
          "activity": "Second Location Name",
          "description": "Details about it",
          "estimatedCost": 10,
          "lat": 35.7100,
          "lng": 139.7300
        }
      ],
      "accommodation": "Hotel/hostel suggestion",
      "meals": ["Breakfast suggestion", "Lunch suggestion", "Dinner suggestion"]
    }
  ],
  "packingList": [
    { "item": "item 1", "reason": "reason to pack it based on destination/weather" }
  ]
}
Make sure the JSON is complete and valid for all 3 days. Provide rough approximate latitude (lat) and longitude (lng) values representing the actual geographic location of the places (e.g. 35.6895, 139.6917 for Tokyo). Provide the 'transitDetails' field starting from the SECOND activity of each day detailing how to get there from the previous activity. Keep the packing list relatively short but highly accurate for the region's climate.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log("Raw Response:");
    console.log(text);
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
       console.log("No JSON found!");
       return;
    }
    const cleanedText = jsonMatch[0];
    const parsedPlan = JSON.parse(cleanedText);
    console.log("JSON is valid!");
  } catch (error) {
    console.error('Itinerary generation error:', error);
  }
}

test();
