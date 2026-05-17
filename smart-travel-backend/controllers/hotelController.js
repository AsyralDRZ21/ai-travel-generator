const axios = require('axios');

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// @route   GET /api/hotels/search?destination=Shanghai
// @desc    Search hotels using Google Places API (New)
exports.searchHotels = async (req, res) => {
  try {
    const { destination } = req.query;
    if (!destination) {
      return res.status(400).json({ message: 'Destination is required' });
    }

    // Use the first city if destination has multiple (e.g. "Tokyo and Osaka")
    const firstCity = destination.split(/\s+and\s+|\s*,\s*|\s*&\s*/i)[0].trim();
    const searchQuery = `hotels in ${firstCity}`;

    // New Places API (v1) — Text Search
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
        }
      }
    );

    const places = response.data.places || [];

    const hotels = places.map((place) => {
      // Build photo URL using the new Places API photo endpoint
      const photoName = place.photos?.[0]?.name;
      const photoUrl = photoName
        ? `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=400&key=${PLACES_API_KEY}`
        : null;

      // Price level mapping (new API returns strings like PRICE_LEVEL_MODERATE)
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
        name: place.displayName?.text || 'Unknown Hotel',
        address: place.formattedAddress || '',
        rating: place.rating || null,
        totalRatings: place.userRatingCount || 0,
        priceLevel,
        photoUrl,
        mapsUrl
      };
    });

    res.json({ hotels, destination });
  } catch (error) {
    console.error('Hotel search error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to fetch hotels', error: error.message });
  }
};
