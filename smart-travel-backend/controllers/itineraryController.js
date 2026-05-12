const { GoogleGenerativeAI } = require('@google/generative-ai');
const Itinerary = require('../models/Itinerary');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// @route   POST /api/itinerary/generate
// @desc    Generate AI itinerary using Gemini
// @access  Private
exports.generateItinerary = async (req, res) => {
  try {
    const { destination, duration, budget, currency, travelStyle, numberOfPeople } = req.body;

    if (!destination || !duration) {
      return res.status(400).json({ message: 'Destination and duration are required' });
    }

    const budgetInfo = budget
      ? `The total budget is approximately ${budget} ${currency || 'USD'} for ${numberOfPeople || 1} person(s).`
      : '';

    const prompt = `You are an expert travel planner. Create a detailed ${duration}-day travel itinerary for ${destination}.
Travel style: ${travelStyle || 'cultural'}
${budgetInfo}
Number of travelers: ${numberOfPeople || 1}

Respond ONLY with a valid JSON object (no markdown, no code blocks) in this exact format:
{
  "destination": "${destination}",
  "duration": ${duration},
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
Make sure the JSON is complete and valid for all ${duration} days. Provide rough approximate latitude (lat) and longitude (lng) values representing the actual geographic location of the places (e.g. 35.6895, 139.6917 for Tokyo). Provide the 'transitDetails' field starting from the SECOND activity of each day detailing how to get there from the previous activity. Keep the packing list relatively short but highly accurate for the region's climate.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Clean up response - extract JSON object using regex
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
       return res.status(500).json({ message: 'AI returned invalid text format, please try again', raw: text });
    }
    const cleanedText = jsonMatch[0];

    // Validate it's parseable JSON
    let parsedPlan;
    try {
      parsedPlan = JSON.parse(cleanedText);
    } catch (parseErr) {
      return res.status(500).json({ message: 'AI returned invalid JSON structure, please try again', raw: cleanedText });
    }

    // Save to DB
    const itinerary = new Itinerary({
      userId: req.user.userId,
      destination,
      duration,
      budget: budget || 0,
      currency: currency || 'USD',
      travelStyle: travelStyle || 'cultural',
      numberOfPeople: numberOfPeople || 1,
      generatedPlan: JSON.stringify(parsedPlan)
    });

    await itinerary.save();

    res.status(201).json({
      message: 'Itinerary generated successfully!',
      itinerary: {
        _id: itinerary._id,
        destination: itinerary.destination,
        duration: itinerary.duration,
        travelStyle: itinerary.travelStyle,
        createdAt: itinerary.createdAt,
        plan: parsedPlan
      }
    });
  } catch (error) {
    console.error('Itinerary generation error:', error);
    res.status(500).json({ message: 'Server error generating itinerary', error: error.message });
  }
};

// @route   GET /api/itinerary
// @desc    Get all itineraries for the logged-in user
// @access  Private
exports.getItineraries = async (req, res) => {
  try {
    const itineraries = await Itinerary.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    const formatted = itineraries.map(i => ({
      _id: i._id,
      destination: i.destination,
      duration: i.duration,
      travelStyle: i.travelStyle,
      budget: i.budget,
      currency: i.currency,
      status: i.status || 'planned',
      createdAt: i.createdAt,
      plan: JSON.parse(i.generatedPlan)
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route   PUT /api/itinerary/:id/status
// @desc    Update trip status (planned / ongoing / completed)
// @access  Private
exports.updateItineraryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['planned', 'ongoing', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    const itinerary = await Itinerary.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { status },
      { new: true }
    );
    if (!itinerary) return res.status(404).json({ message: 'Itinerary not found' });
    res.json({ message: 'Status updated', status: itinerary.status });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route   DELETE /api/itinerary/:id
// @desc    Delete an itinerary
// @access  Private
exports.deleteItinerary = async (req, res) => {
  try {
    const itinerary = await Itinerary.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!itinerary) return res.status(404).json({ message: 'Itinerary not found' });
    res.json({ message: 'Itinerary deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
