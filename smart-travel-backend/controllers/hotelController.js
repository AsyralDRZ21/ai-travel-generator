const axios = require('axios');
const { GoogleGenAI } = require('@google/genai');

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const GEMINI_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-pro-latest',
];

/**
 * Determine accommodation tier based on:
 * 1. Explicit user selection (tier param: backpacker, mid-range, luxury, family)
 * 2. Itinerary travelStyle (backpacking, luxury, budget, family, etc.)
 * 3. Daily budget calculation
 */
function getTierConfiguration({ tier, travelStyle, budget, duration, currency, destination }) {
  const style = (travelStyle || '').toLowerCase().trim();
  const numBudget = parseFloat(budget) || 0;
  const numDuration = parseInt(duration, 10) || 1;
  const curr = (currency || 'MYR').toUpperCase();

  // 1. Explicit user selection
  if (tier && tier !== 'auto') {
    switch (tier) {
      case 'backpacker':
      case 'hostel':
      case 'budget':
        return {
          tier: 'backpacker',
          label: '🎒 Hostels & Budget Stays',
          queryTemplate: city => `backpacker hostels and budget stays in ${city}`,
          badge: '🎒 Hostel / Budget',
          badgeColor: '#10b981',
          reason: 'Filtered by Hostels & Budget Stays'
        };
      case 'luxury':
      case '5-star':
        return {
          tier: 'luxury',
          label: '👑 5-Star Luxury Hotels',
          queryTemplate: city => `5 star luxury hotels and resorts in ${city}`,
          badge: '👑 5-Star Luxury',
          badgeColor: '#f59e0b',
          reason: 'Filtered by 5-Star Luxury Hotels'
        };
      case 'family':
        return {
          tier: 'family',
          label: '👨‍👩‍👧 Family Friendly Stays',
          queryTemplate: city => `family friendly hotels and suites in ${city}`,
          badge: '👨‍👩‍👧 Family Friendly',
          badgeColor: '#06b6d4',
          reason: 'Filtered by Family Friendly Stays'
        };
      case 'mid-range':
      default:
        return {
          tier: 'mid-range',
          label: '🏨 Mid-Range & Boutique Hotels',
          queryTemplate: city => `3 star and 4 star boutique hotels in ${city}`,
          badge: '🏨 Comfort (3-4★)',
          badgeColor: '#6366f1',
          reason: 'Filtered by Mid-Range Hotels'
        };
    }
  }

  // 2. Auto-detect based on travelStyle
  if (style === 'backpacking' || style === 'budget') {
    return {
      tier: 'backpacker',
      label: '🎒 Hostels & Budget Stays',
      queryTemplate: city => `backpacker hostels and budget stays in ${city}`,
      badge: '🎒 Hostel / Budget',
      badgeColor: '#10b981',
      reason: `Auto-selected based on your "${travelStyle}" travel style`
    };
  }

  if (style === 'luxury') {
    return {
      tier: 'luxury',
      label: '👑 5-Star Luxury Hotels',
      queryTemplate: city => `5 star luxury hotels and resorts in ${city}`,
      badge: '👑 5-Star Luxury',
      badgeColor: '#f59e0b',
      reason: `Auto-selected based on your "${travelStyle}" travel style`
    };
  }

  if (style === 'family') {
    return {
      tier: 'family',
      label: '👨‍👩‍👧 Family Friendly Stays',
      queryTemplate: city => `family friendly hotels and suites in ${city}`,
      badge: '👨‍👩‍👧 Family Friendly',
      badgeColor: '#06b6d4',
      reason: `Auto-selected based on your "${travelStyle}" travel style`
    };
  }

  // 3. Auto-detect based on daily budget
  if (numBudget > 0 && numDuration > 0) {
    let budgetPerDayUSD = numBudget / numDuration;
    if (curr === 'MYR') budgetPerDayUSD /= 4.4;
    else if (curr === 'IDR') budgetPerDayUSD /= 16000;
    else if (curr === 'THB') budgetPerDayUSD /= 36;
    else if (curr === 'JPY') budgetPerDayUSD /= 150;
    else if (curr === 'EUR') budgetPerDayUSD *= 1.08;
    else if (curr === 'GBP') budgetPerDayUSD *= 1.28;

    if (budgetPerDayUSD < 45) {
      return {
        tier: 'backpacker',
        label: '🎒 Hostels & Budget Stays',
        queryTemplate: city => `backpacker hostels and budget stays in ${city}`,
        badge: '🎒 Budget Stay',
        badgeColor: '#10b981',
        reason: `Recommended based on your daily budget (${currency} ${Math.round(numBudget / numDuration)}/day)`
      };
    }

    if (budgetPerDayUSD >= 250) {
      return {
        tier: 'luxury',
        label: '👑 5-Star Luxury Hotels',
        queryTemplate: city => `5 star luxury hotels and resorts in ${city}`,
        badge: '👑 5-Star Luxury',
        badgeColor: '#f59e0b',
        reason: `Recommended based on your generous budget (${currency} ${Math.round(numBudget / numDuration)}/day)`
      };
    }
  }

  // Default: Mid-range
  return {
    tier: 'mid-range',
    label: '🏨 Mid-Range & Boutique Hotels',
    queryTemplate: city => `3 star and 4 star boutique hotels in ${city}`,
    badge: '🏨 Comfort (3-4★)',
    badgeColor: '#6366f1',
    reason: destination ? `Recommended stays in ${destination}` : 'Filtered by Mid-Range Hotels'
  };
}

async function generateHotelsWithGemini(destination, tierConfig) {
  const prompt = `You are a travel hotel expert. Recommend 5 real, popular hotels or accommodation in "${destination}" matching the category "${tierConfig.label}".
Respond ONLY with a valid JSON array of objects (no markdown, no code blocks):
[
  {
    "name": "Exact Real Hotel Name",
    "address": "Area or neighborhood, ${destination}",
    "rating": 4.5,
    "totalRatings": 1250,
    "priceLevel": 2
  }
]
Important: Ensure the hotels are real, well-known properties in or around ${destination}.`;

  for (const model of GEMINI_MODELS) {
    try {
      const result = await ai.models.generateContent({ model, contents: prompt });
      const text = result.text || '';
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return parsed.map((item, idx) => ({
          id: `gemini-hotel-${idx}-${Date.now()}`,
          name: item.name || 'Quality Accommodation',
          address: item.address || destination,
          rating: item.rating || 4.4,
          totalRatings: item.totalRatings || 850,
          priceLevel: item.priceLevel || 2,
          photoUrl: null,
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((item.name || 'hotel') + ' ' + destination)}`,
          tierBadge: tierConfig.badge,
          tierBadgeColor: tierConfig.badgeColor
        }));
      }
    } catch (err) {
      console.warn(`Gemini hotel model ${model} failed:`, err.message);
    }
  }
  return [];
}

// @route   GET /api/hotels/search?destination=...&travelStyle=...&budget=...&duration=...&currency=...&tier=...
// @desc    Search hotels using Google Places API tailored to budget & travel style with AI fallback
exports.searchHotels = async (req, res) => {
  try {
    const { destination, travelStyle, budget, duration, currency, tier } = req.query;
    if (!destination) {
      return res.status(400).json({ message: 'Destination is required' });
    }

    // Clean destination / city name
    const firstCity = destination.split(/\s+and\s+|\s*,\s*|\s*&\s*/i)[0].trim();
    const tierConfig = getTierConfiguration({ tier, travelStyle, budget, duration, currency, destination });
    const searchQuery = tierConfig.queryTemplate(firstCity);

    let hotels = [];

    // 1. Try Google Places API (v1) if key is configured
    if (PLACES_API_KEY) {
      try {
        const response = await axios.post(
          'https://places.googleapis.com/v1/places:searchText',
          {
            textQuery: searchQuery,
            includedType: 'lodging',
            maxResultCount: 6
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': PLACES_API_KEY,
              'X-Goog-FieldMask': [
                'places.id',
                'places.displayName',
                'places.formattedAddress',
                'places.rating',
                'places.userRatingCount',
                'places.priceLevel',
                'places.photos'
              ].join(',')
            },
            timeout: 5000
          }
        );

        const places = response.data.places || [];
        hotels = places.map((place) => {
          const photoName = place.photos?.[0]?.name;
          const photoUrl = photoName
            ? `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=400&key=${PLACES_API_KEY}`
            : null;

          const priceLevelMap = {
            PRICE_LEVEL_FREE: 0,
            PRICE_LEVEL_INEXPENSIVE: 1,
            PRICE_LEVEL_MODERATE: 2,
            PRICE_LEVEL_EXPENSIVE: 3,
            PRICE_LEVEL_VERY_EXPENSIVE: 4
          };
          const priceLevel = priceLevelMap[place.priceLevel] ?? null;

          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            (place.displayName?.text || '') + ' ' + destination
          )}&query_place_id=${place.id}`;

          return {
            id: place.id,
            name: place.displayName?.text || 'Unknown Accommodation',
            address: place.formattedAddress || '',
            rating: place.rating || null,
            totalRatings: place.userRatingCount || 0,
            priceLevel,
            photoUrl,
            mapsUrl,
            tierBadge: tierConfig.badge,
            tierBadgeColor: tierConfig.badgeColor
          };
        });
      } catch (placesErr) {
        console.warn('Google Places API search failed, falling back to Gemini AI:', placesErr.response?.data?.error?.message || placesErr.message);
      }
    }

    // 2. If Google Places returned 0 or failed, fallback to Gemini AI
    if (!hotels || hotels.length === 0) {
      hotels = await generateHotelsWithGemini(destination, tierConfig);
    }

    res.json({
      hotels,
      destination,
      activeTier: tierConfig.tier,
      tierLabel: tierConfig.label,
      tierReason: tierConfig.reason,
      tierBadge: tierConfig.badge
    });
  } catch (error) {
    console.error('Hotel search error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to fetch hotels', error: error.message });
  }
};
