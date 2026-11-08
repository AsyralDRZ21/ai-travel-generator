require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const modelsToTest = [
  'gemini-2.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
];

async function findWorking() {
  for (const model of modelsToTest) {
    try {
      process.stdout.write(`Testing ${model}... `);
      const result = await ai.models.generateContent({ model, contents: 'say hi' });
      console.log(`✅ WORKS! Response: ${result.text.trim()}`);
      console.log(`\n🎯 USE THIS MODEL: ${model}`);
      break;
    } catch (e) {
      const msg = JSON.parse(e.message)?.error?.message || e.message;
      console.log(`❌ ${msg.substring(0, 80)}`);
    }
  }
}

findWorking();
