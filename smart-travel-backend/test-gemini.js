require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  try {
    console.log("Using API Key:", process.env.GEMINI_API_KEY.substring(0, 10) + "...");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent("Say 'hello world' in JSON format like {\"greeting\": \"hello world\"}");
    console.log("Success! Response text:");
    console.log(result.response.text());
  } catch (err) {
    console.error("Gemini API Error:", err.message);
    if (err.status) console.error("Status:", err.status);
  }
}
test();
