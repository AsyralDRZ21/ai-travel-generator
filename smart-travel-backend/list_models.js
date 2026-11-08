require('dotenv').config();
const key = process.env.GEMINI_API_KEY;

fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
  .then(r => r.json())
  .then(d => {
    if (d.models) {
      const supported = d.models.filter(m => m.supportedGenerationMethods?.includes('generateContent'));
      console.log('✅ Models that support generateContent:');
      supported.forEach(m => console.log(' -', m.name));
    } else {
      console.log(JSON.stringify(d, null, 2));
    }
  })
  .catch(e => console.error('Fetch error:', e.message));
