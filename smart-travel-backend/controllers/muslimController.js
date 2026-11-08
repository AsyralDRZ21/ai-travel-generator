const axios = require('axios');
const { GoogleGenAI } = require('@google/genai');

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

const GEMINI_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-pro-latest',
];

async function generateVisaWithFallback(prompt) {
  if (!ai) return null;
  for (const model of GEMINI_MODELS) {
    try {
      const result = await ai.models.generateContent({ model, contents: prompt });
      return result.text;
    } catch (err) {
      console.warn(`Visa AI model ${model} error:`, err.message?.substring(0, 60));
    }
  }
  return null;
}

// ─── PRAYER TIMES ─────────────────────────────────────────────────────────────
// Uses Aladhan API — FREE, no key needed
exports.getPrayerTimes = async (req, res) => {
  try {
    const { city, country, date } = req.query;
    if (!city || !country) return res.status(400).json({ message: 'City and country are required' });

    const targetDate = date || new Date().toISOString().split('T')[0];
    const [year, month, day] = targetDate.split('-');

    const url = `https://api.aladhan.com/v1/timingsByCity/${day}-${month}-${year}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=3`;
    const response = await axios.get(url);
    const timings = response.data.data.timings;
    const hijri = response.data.data.date.hijri;

    res.json({
      city, country, date: targetDate,
      hijriDate: `${hijri.day} ${hijri.month.en} ${hijri.year} AH`,
      prayers: {
        Fajr:    timings.Fajr,
        Sunrise: timings.Sunrise,
        Dhuhr:   timings.Dhuhr,
        Asr:     timings.Asr,
        Maghrib: timings.Maghrib,
        Isha:    timings.Isha,
        Imsak:   timings.Imsak,
      }
    });
  } catch (error) {
    console.error('Prayer times error:', error.message);
    res.status(500).json({ message: 'Failed to fetch prayer times', error: error.message });
  }
};

// ─── MOSQUE LOCATOR ───────────────────────────────────────────────────────────
// Uses Google Places API (New) as primary (fast & reliable), falls back to Overpass OSM
exports.getMosques = async (req, res) => {
  try {
    const { lat, lng, radius = 5000, city, country } = req.query;

    if (!PLACES_API_KEY && (!lat || !lng)) {
      return res.status(400).json({ message: 'Destination or coordinates are required' });
    }

    // Try Google Places API (New)
    if (PLACES_API_KEY) {
      try {
        const locationQuery = [city, country].filter(Boolean).join(', ');
        const textQuery = locationQuery ? `mosques and prayer rooms in ${locationQuery}` : 'mosques and Islamic prayer rooms';

        const requestBody = {
          textQuery,
          maxResultCount: 8
        };

        if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
          requestBody.locationBias = {
            circle: {
              center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
              radius: Math.min(parseFloat(radius) || 5000, 10000)
            }
          };
        }

        const response = await axios.post(
          'https://places.googleapis.com/v1/places:searchText',
          requestBody,
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
                'places.location',
                'places.regularOpeningHours'
              ].join(',')
            }
          }
        );

        const places = response.data.places || [];
        if (places.length > 0) {
          const mosques = places.map((place) => ({
            id: place.id,
            name: place.displayName?.text || 'Mosque',
            lat: place.location?.latitude,
            lng: place.location?.longitude,
            type: 'mosque',
            address: place.formattedAddress || 'Address available on map',
            openingHours: place.regularOpeningHours?.weekdayDescriptions?.[0] || 'Open daily for prayers',
            womenSection: true,
            rating: place.rating || null,
            totalRatings: place.userRatingCount || 0
          }));

          return res.json({ count: mosques.length, mosques });
        }
      } catch (placesErr) {
        console.warn('Google Places mosque search error, falling back to OSM:', placesErr.response?.data || placesErr.message);
      }
    }

    // Fallback: OpenStreetMap Overpass API
    if (lat && lng) {
      const query = `
        [out:json][timeout:15];
        (
          node["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});
          way["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});
        );
        out body center;
      `;
      const response = await axios.post('https://overpass-api.de/api/interpreter', query, {
        headers: { 'Content-Type': 'text/plain', 'User-Agent': 'SmartTravelApp/1.0' },
        timeout: 12000
      });

      const mosques = (response.data.elements || []).map(el => ({
        id: String(el.id),
        name: el.tags?.name || el.tags?.['name:en'] || 'Mosque / Surau',
        lat: el.lat || el.center?.lat,
        lng: el.lon || el.center?.lon,
        type: el.tags?.place_of_worship || 'mosque',
        address: [el.tags?.['addr:street'], el.tags?.['addr:city']].filter(Boolean).join(', ') || 'Local area',
        openingHours: el.tags?.opening_hours || 'Open for prayers',
        womenSection: el.tags?.['women'] || el.tags?.['female'] || true,
      })).filter(m => m.lat && m.lng);

      return res.json({ count: mosques.length, mosques });
    }

    res.status(404).json({ message: 'No mosques found nearby' });
  } catch (error) {
    console.error('Failed to fetch mosques:', error.message);
    res.status(500).json({ message: 'Failed to fetch mosques. Please try again or check spelling.', error: error.message });
  }
};

// ─── HALAL FOOD FINDER ────────────────────────────────────────────────────────
// Uses Google Places API (New)
exports.getHalalFood = async (req, res) => {
  try {
    const { lat, lng, radius = 5000, city, country } = req.query;

    if (!PLACES_API_KEY) {
      return res.status(500).json({ message: 'Google Places API key is not configured' });
    }

    const locationQuery = [city, country].filter(Boolean).join(', ');
    const textQuery = locationQuery ? `halal food halal restaurant in ${locationQuery}` : 'halal food and restaurants';

    const requestBody = {
      textQuery,
      includedType: 'restaurant',
      maxResultCount: 8
    };

    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      requestBody.locationBias = {
        circle: {
          center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
          radius: Math.min(parseFloat(radius) || 5000, 10000)
        }
      };
    }

    const response = await axios.post(
      'https://places.googleapis.com/v1/places:searchText',
      requestBody,
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
            'places.photos',
            'places.location',
            'places.currentOpeningHours',
            'places.types'
          ].join(',')
        }
      }
    );

    const places = (response.data.places || []).map((place) => {
      const photoName = place.photos?.[0]?.name;
      const photo = photoName
        ? `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=400&key=${PLACES_API_KEY}`
        : null;

      const priceLevelMap = {
        PRICE_LEVEL_FREE: 0,
        PRICE_LEVEL_INEXPENSIVE: 1,
        PRICE_LEVEL_MODERATE: 2,
        PRICE_LEVEL_EXPENSIVE: 3,
        PRICE_LEVEL_VERY_EXPENSIVE: 4
      };
      const priceLevel = priceLevelMap[place.priceLevel] ?? 2;

      return {
        id: place.id,
        name: place.displayName?.text || 'Halal Restaurant',
        lat: place.location?.latitude,
        lng: place.location?.longitude,
        address: place.formattedAddress || 'Address available on map',
        rating: place.rating || null,
        totalRatings: place.userRatingCount || 0,
        priceLevel,
        priceLevelText: ['Free', 'Budget', 'Moderate', 'Expensive', 'Very Expensive'][priceLevel] || 'Moderate',
        isOpen: place.currentOpeningHours?.openNow ?? true,
        photo,
        types: place.types || ['restaurant']
      };
    });

    res.json({ count: places.length, places });
  } catch (error) {
    console.error('Failed to fetch halal food:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to fetch halal food. Please try again.', error: error.message });
  }
};

// ─── HISTORICAL WEATHER ───────────────────────────────────────────────────────
// Uses Open-Meteo — FREE, no key needed
exports.getHistoricalWeather = async (req, res) => {
  try {
    const { lat, lng, month } = req.query;
    if (!lat || !lng || !month) return res.status(400).json({ message: 'lat, lng, and month are required' });

    const year = new Date().getFullYear() - 1;
    const paddedMonth = String(month).padStart(2, '0');
    const daysInMonth = new Date(year, parseInt(month), 0).getDate();
    const startDate = `${year}-${paddedMonth}-01`;
    const endDate = `${year}-${paddedMonth}-${daysInMonth}`;

    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&timezone=auto`;
    const response = await axios.get(url);
    const daily = response.data.daily;

    const avgMax = (daily.temperature_2m_max.reduce((a, b) => a + b, 0) / daily.temperature_2m_max.length).toFixed(1);
    const avgMin = (daily.temperature_2m_min.reduce((a, b) => a + b, 0) / daily.temperature_2m_min.length).toFixed(1);
    const totalRain = daily.precipitation_sum.reduce((a, b) => a + b, 0).toFixed(1);
    const rainyDays = daily.precipitation_sum.filter(p => p > 1).length;
    const avgWind = (daily.windspeed_10m_max.reduce((a, b) => a + b, 0) / daily.windspeed_10m_max.length).toFixed(1);

    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    let muslimNote = '';
    if (parseFloat(avgMax) > 35) muslimNote = '⚠️ Extreme heat expected. If fasting during Ramadan, plan indoor activities during midday. Stay hydrated after Iftar.';
    else if (parseFloat(avgMax) > 28) muslimNote = '☀️ Warm weather. Lightweight modest clothing (linen abaya/baju) recommended. Stay hydrated.';
    else if (parseFloat(avgMax) < 15) muslimNote = '🧥 Cold weather. Layer modest clothing with warm coverings. Prayer times may be shorter in winter.';

    res.json({
      month: monthNames[parseInt(month) - 1],
      year,
      avgMaxTemp: parseFloat(avgMax),
      avgMinTemp: parseFloat(avgMin),
      totalRainfall: parseFloat(totalRain),
      rainyDays,
      avgWindSpeed: parseFloat(avgWind),
      condition: rainyDays > 15 ? 'Rainy Season' : rainyDays > 7 ? 'Occasional Rain' : 'Mostly Dry',
      muslimNote,
      packingTips: parseFloat(avgMax) > 30
        ? ['Lightweight abaya/hijab', 'Sunscreen', 'Water bottle', 'Portable fan']
        : parseFloat(avgMax) < 15
          ? ['Warm modest layers', 'Scarf doubles as hijab', 'Thermal inner wear']
          : ['Light modest clothing', 'Light jacket for evenings', 'Comfortable walking shoes']
    });
  } catch (error) {
    console.error('Failed to fetch weather:', error.message);
    res.status(500).json({ message: 'Failed to fetch weather data', error: error.message });
  }
};

// ─── VISA REQUIREMENTS ────────────────────────────────────────────────────────
// Authoritative curated database for Malaysian passport holders with Gemini AI fallback
exports.getVisaInfo = async (req, res) => {
  try {
    const { destination } = req.query;
    if (!destination) return res.status(400).json({ message: 'Destination country is required' });

    const dest = destination.toLowerCase().trim();

    const VISA_DB = {
      'south korea': {
        destination: 'South Korea',
        flag: '🇰🇷',
        required: 'Visa Free (Mandatory K-ETA Required)',
        badgeType: 'k-eta',
        duration: 'Up to 90 days for tourism',
        cost: '10,000 KRW (~MYR 36)',
        processingDays: '1 - 3 business days (Apply at least 72 hours before flight)',
        importantNotice: '🚨 MANDATORY PRE-DEPARTURE K-ETA: Malaysian passport holders (aged 18–64) MUST apply for and obtain an approved K-ETA (Korea Electronic Travel Authorization) online BEFORE boarding their flight to South Korea. Airlines at KLIA and other airports will strictly DENY BOARDING if you do not possess an approved K-ETA. Do NOT use fake third-party websites.',
        officialPortal: {
          name: 'Official Republic of Korea K-ETA Portal',
          url: 'https://www.k-eta.go.kr'
        },
        exemptionNotes: 'Travellers aged 17 and below, or 65 and above are temporarily exempt from K-ETA. Approved K-ETA is valid for 3 years (multiple entries) or until passport expiry.',
        documents: [
          'Valid Malaysian biometric passport (minimum 6 months validity)',
          'Approved K-ETA printed confirmation / digital copy',
          'Confirmed return or onward flight ticket',
          'Confirmed hotel / accommodation address & phone in South Korea',
          'Q-Code / Online health arrival declaration'
        ],
        muslimNote: 'Halal dining is widely available in Itaewon (Seoul). Major prayer rooms located at Incheon International Airport (T1 & T2), Seoul Central Mosque, and Lotte World Mall. Outside Seoul, halal options are limited—look for Muslim-friendly seafood or vegetarian restaurants.',
        embassyUrl: 'https://overseas.mofa.go.kr/my-en/index.do'
      },
      'japan': {
        destination: 'Japan',
        flag: '🇯🇵',
        required: 'Visa Free (Biometric Passport)',
        badgeType: 'visa-free',
        duration: 'Up to 90 days',
        cost: 'FREE',
        processingDays: 'Instant at border immigration',
        importantNotice: '📝 VISIT JAPAN WEB: Highly recommended to fill in your immigration and customs declarations online via "Visit Japan Web" before boarding to generate digital QR codes for fast-track entry at Tokyo (Narita/Haneda), Osaka (KIX), and Fukuoka.',
        officialPortal: {
          name: 'Official Visit Japan Web Portal',
          url: 'https://vjw-lp.digital.go.jp/en/'
        },
        exemptionNotes: 'Valid for Malaysian ICAO-standard biometric e-passports with microchip. Non-biometric passports require a traditional sticker visa.',
        documents: [
          'Malaysian biometric passport with microchip (min. 6 months validity)',
          'Visit Japan Web QR codes (Customs & Immigration)',
          'Confirmed return flight ticket',
          'Proof of accommodation (hotel booking)'
        ],
        muslimNote: 'Halal dining and prayer rooms (Musalla) are widely available in Tokyo, Kyoto, and Osaka. Major stations (Tokyo Station) and international airports feature dedicated ablution and prayer rooms.',
        embassyUrl: 'https://www.my.emb-japan.go.jp'
      },
      'united kingdom': {
        destination: 'United Kingdom',
        flag: '🇬🇧',
        required: 'Visa Free (UK ETA Implementation)',
        badgeType: 'eta',
        duration: 'Up to 6 months for tourism',
        cost: 'FREE (or £10 / ~MYR 60 for UK ETA when mandatory)',
        processingDays: 'Instant (or 1 - 3 days via UK ETA app)',
        importantNotice: '⚠️ UK ETA (Electronic Travel Authorisation): Malaysian citizens can visit the UK visa-free for up to 6 months for tourism. The UK is introducing a digital UK ETA (£10) which must be applied for via the official "UK ETA" mobile app before travelling.',
        officialPortal: {
          name: 'Official UK Government ETA Application',
          url: 'https://www.gov.uk/electronic-travel-authorisation'
        },
        documents: [
          'Valid Malaysian passport (valid for the duration of stay)',
          'Approved UK ETA (when mandatory for your travel date)',
          'Confirmed return flight ticket',
          'Proof of sufficient funds (bank statements/cards) & lodging'
        ],
        muslimNote: 'London, Birmingham, and Manchester have vibrant Muslim communities with thousands of certified Halal restaurants, iconic mosques (Regent\'s Park, East London Mosque), and prayer facilities.',
        embassyUrl: 'https://www.gov.uk/world/organisations/british-high-commission-kuala-lumpur'
      },
      'australia': {
        destination: 'Australia',
        flag: '🇦🇺',
        required: 'ETA Required (Subclass 601)',
        badgeType: 'eta',
        duration: 'Up to 3 months per visit (valid 12 months, multiple entries)',
        cost: 'AUD 20 (~MYR 60 app service fee)',
        processingDays: 'Instant to 72 hours',
        importantNotice: '📱 MANDATORY AUSTRALIAN ETA: Malaysian passport holders MUST apply for the Electronic Travel Authority (Subclass 601) using the official "AustralianETA" smartphone app prior to boarding. Be cautious of unofficial visa websites charging excessive fees.',
        officialPortal: {
          name: 'Australian Department of Home Affairs (AustralianETA App)',
          url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/electronic-travel-authority-601'
        },
        documents: [
          'Valid Malaysian biometric passport (min. 6 months validity)',
          'Approved Australian ETA linked digitally to passport',
          'Strict Biosecurity Declaration (all food, plant, dairy items must be declared on Incoming Passenger Card)',
          'Return flight ticket & sufficient funds'
        ],
        muslimNote: 'Certified halal food is very accessible in Sydney, Melbourne, Perth, and Brisbane. Mosques and prayer rooms located in major shopping centres and universities. Note: Declaring all food items at customs is strictly mandatory.',
        embassyUrl: 'https://malaysia.highcommission.gov.au'
      },
      'new zealand': {
        destination: 'New Zealand',
        flag: '🇳🇿',
        required: 'Visa Free (NZeTA + IVL Required)',
        badgeType: 'eta',
        duration: 'Up to 90 days',
        cost: 'NZD 17-23 (NZeTA) + NZD 100 (IVL Levy) (~MYR 330)',
        processingDays: '10 mins to 72 hours',
        importantNotice: '🌿 MANDATORY NZeTA & IVL: Malaysian passport holders do not need a traditional visa, but MUST apply for an NZeTA (New Zealand Electronic Travel Authority) and pay the IVL conservation levy online or via the NZeTA app before departure.',
        officialPortal: {
          name: 'Official Immigration New Zealand NZeTA',
          url: 'https://www.immigration.govt.nz/new-zealand-visas/apply-for-a-visa/about-visa/nzeta'
        },
        documents: [
          'Valid passport (min. 3 months beyond intended departure date)',
          'Approved NZeTA confirmation',
          'New Zealand Traveller Declaration (NZTD) completed within 24h of travel',
          'Proof of onward travel and funds ($1,000 NZD/month)'
        ],
        muslimNote: 'FIANZ (Federation of Islamic Associations of New Zealand) certifies halal meats and restaurants across Auckland, Wellington, and Christchurch. Halal food is common in supermarkets.',
        embassyUrl: 'https://www.mfat.govt.nz'
      },
      'schengen': {
        destination: 'Schengen Area (France, Germany, Italy, Switzerland, Spain, etc.)',
        flag: '🇪🇺',
        required: 'Visa Free (Schengen Zone)',
        badgeType: 'visa-free',
        duration: 'Up to 90 days within any 180-day period',
        cost: 'FREE (ETIAS €7 when implemented)',
        processingDays: 'Instant at European border control',
        importantNotice: '🇪🇺 90-DAY VISA-FREE TRAVEL: Malaysian citizens can enter France, Germany, Italy, Switzerland, Spain, Austria, and all other Schengen countries visa-free for tourism up to 90 days. (ETIAS digital permit will apply once officially launched).',
        officialPortal: {
          name: 'Official European Union ETIAS Information',
          url: 'https://travel-europe.europa.eu/etias_en'
        },
        documents: [
          'Malaysian biometric passport (valid at least 3 months after departure from Schengen area)',
          'Proof of accommodation (hotel reservation or host letter)',
          'Confirmed return flight ticket',
          'Travel health insurance covering min. €30,000 medical emergency expenses'
        ],
        muslimNote: 'Paris, Berlin, Frankfurt, Vienna, and Zurich have diverse halal food options (Turkish, Middle Eastern, North African). Use local halal food directories.',
        embassyUrl: 'https://www.kln.gov.my'
      },
      'singapore': {
        destination: 'Singapore',
        flag: '🇸🇬',
        required: 'Visa Free (Mandatory SG Arrival Card)',
        badgeType: 'visa-free',
        duration: 'Up to 30 days',
        cost: 'FREE',
        processingDays: 'Instant online submission',
        importantNotice: '🇸🇬 MANDATORY SG ARRIVAL CARD (SGAC): All travellers, including Malaysians, MUST submit the digital SG Arrival Card with health declaration online within 3 days BEFORE arriving at Changi Airport or Causeway/Tuas checkpoints (free via MyICA mobile app).',
        officialPortal: {
          name: 'Official Singapore ICA SGAC Portal',
          url: 'https://eservices.ica.gov.sg/sgarrivalcard/'
        },
        documents: [
          'Valid Malaysian passport (min. 6 months validity)',
          'SG Arrival Card electronic confirmation barcode',
          'Return/onward ticket or cross-border transport details'
        ],
        muslimNote: 'MUIS (Majlis Ugama Islam Singapura) certifies hundreds of halal food outlets across Singapore. Mosques with daily prayers and Friday congregational prayers are widely accessible.',
        embassyUrl: 'https://www.mfa.gov.sg'
      },
      'china': {
        destination: 'China',
        flag: '🇨🇳',
        required: 'Visa Free (Mutual Exemption Agreement)',
        badgeType: 'visa-free',
        duration: '15 to 30 days for tourism/business',
        cost: 'FREE',
        processingDays: 'Instant at immigration control',
        importantNotice: '🇨🇳 VISA-FREE MUTUAL AGREEMENT: Malaysian passport holders can travel to mainland China visa-free for up to 15-30 days under the reciprocal visa waiver agreement for tourism, business, and visiting relatives.',
        officialPortal: {
          name: 'Embassy of the People\'s Republic of China in Malaysia',
          url: 'http://my.china-embassy.gov.cn'
        },
        documents: [
          'Valid Malaysian passport (min. 6 months validity)',
          'Confirmed return flight ticket',
          'Hotel booking or local host address'
        ],
        muslimNote: 'Look for "清真" (Halal) restaurants run by Hui and Uyghur Muslims (Lanzhou beef noodles). Famous historic mosques in Beijing (Niujie), Xi\'an, and Guangzhou.',
        embassyUrl: 'http://my.china-embassy.gov.cn'
      },
      'saudi arabia': {
        destination: 'Saudi Arabia',
        flag: '🇸🇦',
        required: 'eVisa / Visa on Arrival',
        badgeType: 'evisa',
        duration: 'Up to 90 days (1-Year Multiple Entry)',
        cost: 'SAR ~395 (~MYR 480 including mandatory health insurance)',
        processingDays: '15 mins to 24 hours online',
        importantNotice: '🕋 UMRAH & TOURISM: Malaysian citizens are eligible for the Saudi Tourist eVisa online or Visa on Arrival at Jeddah/Riyadh/Medina. Tourist visa holders can perform Umrah anytime outside the Hajj season. Booking prayer slots for Rawdah requires the "Nusuk" app.',
        officialPortal: {
          name: 'Official Saudi eVisa Portal (Visit Saudi)',
          url: 'https://visa.visitsaudi.com'
        },
        documents: [
          'Malaysian passport (min. 6 months validity)',
          'Approved eVisa or credit card for Visa on Arrival fee',
          'Mandatory medical insurance covering emergencies (included with eVisa)',
          'Nusuk Mobile App for Rawdah and Umrah permits'
        ],
        muslimNote: 'Holy land of Islam. All food is strictly Halal. Adhan called 5 times daily. Makkah and Madinah are sacred sanctuaries.',
        embassyUrl: 'https://embassies.mofa.gov.sa/sites/Malaysia'
      },
      'thailand': {
        destination: 'Thailand',
        flag: '🇹🇭',
        required: 'Visa Free (Extended 60 Days)',
        badgeType: 'visa-free',
        duration: 'Up to 60 days for tourism',
        cost: 'FREE',
        processingDays: 'Instant at border checkpoint',
        importantNotice: '🇹🇭 60-DAY STAY: Malaysian citizens can enter Thailand visa-free for tourism up to 60 days per entry (extendable for 30 more days at Thai immigration). TM6 arrival card is currently waived at major borders.',
        documents: [
          'Valid Malaysian passport (min. 6 months validity)',
          'Return flight ticket or cross-border transport proof',
          'Proof of adequate funds (min. 20,000 THB per traveller)'
        ],
        muslimNote: 'Abundant Halal food across Southern Thailand (Hat Yai, Krabi, Phuket) and Bangkok (Sukhumvit, Ramkhamhaeng). Look for the CICOT Halal logo.',
        embassyUrl: 'https://kualalumpur.thaiembassy.org'
      },
      'indonesia': {
        destination: 'Indonesia',
        flag: '🇮🇩',
        required: 'Visa Free (ASEAN Member)',
        badgeType: 'visa-free',
        duration: 'Up to 30 days',
        cost: 'FREE',
        processingDays: 'Instant at immigration',
        importantNotice: '🇮🇩 MANDATORY ELECTRONIC CUSTOMS (e-CD): All travellers must complete the online e-CD at ecd.beacukai.go.id within 3 days prior to arrival to receive a customs QR code. If travelling to Bali, the provincial tourism levy (150,000 IDR) must be paid at lovebali.baliprov.go.id.',
        officialPortal: {
          name: 'Official Indonesia e-CD Customs Portal',
          url: 'https://ecd.beacukai.go.id'
        },
        documents: [
          'Valid Malaysian passport (min. 6 months validity)',
          'Completed e-CD QR code',
          'Confirmed return flight ticket',
          'Love Bali Levy voucher (if visiting Bali)'
        ],
        muslimNote: 'World\'s largest Muslim-majority nation. Halal food and mosques are everywhere. In Bali, halal dining is clustered in Kuta and Denpasar.',
        embassyUrl: 'https://kemlu.go.id/kualalumpur'
      },
      'taiwan': {
        destination: 'Taiwan',
        flag: '🇹🇼',
        required: 'Visa Free',
        badgeType: 'visa-free',
        duration: 'Up to 30 days',
        cost: 'FREE',
        processingDays: 'Instant',
        importantNotice: '🇹🇼 ONLINE ARRIVAL CARD: Complete the online Taiwan Arrival Card before departure (via National Immigration Agency) to streamline immigration at Taipei Taoyuan or Songshan airports.',
        officialPortal: {
          name: 'Taiwan National Immigration Agency (Online Arrival Card)',
          url: 'https://niaspeedy.immigration.gov.tw/webacrn/'
        },
        documents: [
          'Valid Malaysian passport (min. 6 months validity)',
          'Confirmed return / onward flight ticket',
          'Proof of accommodation'
        ],
        muslimNote: 'Over 300 Halal-certified dining spots in Taiwan. Major train stations, national scenic areas, and airports offer dedicated Muslim prayer rooms.',
        embassyUrl: 'https://www.taiwanembassy.org/my/'
      },
      'turkey': {
        destination: 'Turkey (Türkiye)',
        flag: '🇹🇷',
        required: 'Visa Free',
        badgeType: 'visa-free',
        duration: 'Up to 90 days',
        cost: 'FREE',
        processingDays: 'Instant at passport control',
        importantNotice: '🇹🇷 90-DAY VISA-FREE: Malaysian passport holders can travel visa-free in Turkey for up to 90 days within any 180-day period. Ensure your passport has at least 150 days of remaining validity.',
        documents: [
          'Malaysian passport (min. 150 days validity remaining)',
          'Return flight ticket & hotel booking'
        ],
        muslimNote: 'Muslim-majority country. All food is halal. Historical mosques (Hagia Sophia, Blue Mosque, Suleymaniye) are open for prayers daily.',
        embassyUrl: 'https://kualalumpur.emb.mfa.gov.tr'
      },
      'united arab emirates': {
        destination: 'United Arab Emirates',
        flag: '🇦🇪',
        required: 'Visa Free (Entry Stamp on Arrival)',
        badgeType: 'visa-free',
        duration: 'Up to 30 days (free of charge)',
        cost: 'FREE',
        processingDays: 'Instant at immigration',
        importantNotice: '🇦🇪 30-DAY FREE ENTRY STAMP: Malaysian citizens receive a 30-day tourist entry stamp free of charge at Dubai (DXB), Abu Dhabi (AUH), and Sharjah airports upon arrival.',
        documents: [
          'Valid Malaysian passport (min. 6 months validity)',
          'Confirmed return flight ticket',
          'Proof of accommodation'
        ],
        muslimNote: 'World-class Muslim-friendly destination. Prayer rooms in every mall and station. Sheikh Zayed Grand Mosque in Abu Dhabi is an architectural masterpiece.',
        embassyUrl: 'https://www.mofa.gov.ae/en/Missions/Kuala-Lumpur'
      },
      'usa': {
        destination: 'United States',
        flag: '🇺🇸',
        required: 'Visa Required (B1/B2 Tourist Visa)',
        badgeType: 'visa-required',
        duration: 'Up to 6 months per entry (up to 10-year validity)',
        cost: '$185 USD (~MYR 850 MRV application fee)',
        processingDays: '2 - 4 weeks (In-person interview required)',
        importantNotice: '🇺🇸 EMBASSY INTERVIEW MANDATORY: Malaysia is NOT part of the US Visa Waiver Program (ESTA). Malaysian citizens MUST submit form DS-160 online, pay the $185 USD fee, and attend an in-person interview at the US Embassy in Kuala Lumpur.',
        officialPortal: {
          name: 'US Department of State CEAC DS-160 Portal',
          url: 'https://ceac.state.gov/genniv/'
        },
        documents: [
          'Valid Malaysian passport',
          'Form DS-160 confirmation page with barcode',
          'Appointment confirmation letter',
          'Proof of finances (bank statements) & strong ties to Malaysia'
        ],
        muslimNote: 'Halal restaurants are abundant in New York, Chicago, Los Angeles, and Washington DC. Prayer facilities exist at major US airports.',
        embassyUrl: 'https://my.usembassy.gov'
      },
      'canada': {
        destination: 'Canada',
        flag: '🇨🇦',
        required: 'Visa Required (Temporary Resident Visa - TRV)',
        badgeType: 'visa-required',
        duration: 'Up to 6 months per visit',
        cost: 'CAD 100 Visa + CAD 85 Biometrics (~MYR 650)',
        processingDays: '20 - 45 working days',
        importantNotice: '🇨🇦 MANDATORY TRV & BIOMETRICS: Malaysian citizens must apply for a Visitor Visa (TRV) online via IRCC and book an appointment for fingerprint and photo biometrics at the VFS Canada VAC in Kuala Lumpur.',
        officialPortal: {
          name: 'Official IRCC Canada Visitor Visa Portal',
          url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada.html'
        },
        documents: [
          'Valid Malaysian passport',
          'Biometrics collection confirmation',
          'Proof of financial support and employment in Malaysia',
          'Travel itinerary and flight reservations'
        ],
        muslimNote: 'Toronto, Vancouver, and Montreal have large Muslim communities with halal food and mosques throughout the metropolitan areas.',
        embassyUrl: 'https://www.international.gc.ca'
      },
      'india': {
        destination: 'India',
        flag: '🇮🇳',
        required: 'eVisa Required (e-Tourist Visa)',
        badgeType: 'evisa',
        duration: '30 days (double entry) or 1 year',
        cost: '$10 - $25 USD (~MYR 45 - 110)',
        processingDays: '3 - 4 working days online',
        importantNotice: '🇮🇳 MANDATORY INDIAN EVISA: Malaysian passport holders MUST apply online for an Indian e-Visa via the official portal indianvisaonline.gov.in at least 4 to 30 days before departure.',
        officialPortal: {
          name: 'Official Indian Government eVisa Portal',
          url: 'https://indianvisaonline.gov.in/evisa/'
        },
        documents: [
          'Passport bio page copy (PDF) with min. 6 months validity',
          'Passport-sized photo with white background (JPEG)',
          'Printed Electronic Travel Authorization (ETA) confirmation'
        ],
        muslimNote: 'Over 200 million Muslims live in India. Halal dining is common in Old Delhi, Hyderabad, Mumbai, Lucknow, and Kerala.',
        embassyUrl: 'https://www.hcikl.gov.my'
      },
      'egypt': {
        destination: 'Egypt',
        flag: '🇪🇬',
        required: 'Visa on Arrival / eVisa',
        badgeType: 'visa-arrival',
        duration: '30 days',
        cost: '$25 USD (~MYR 115 payable at airport bank counters)',
        processingDays: 'Instant on arrival or 7 days via visa2egypt.gov.eg',
        importantNotice: '🇪🇬 VISA ON ARRIVAL AVAILABLE: Malaysian citizens can purchase a $25 USD visa sticker at designated bank counters inside Cairo (CAI) airport prior to passport control.',
        officialPortal: {
          name: 'Official Egypt eVisa Portal',
          url: 'https://visa2egypt.gov.eg'
        },
        documents: [
          'Valid passport (min. 6 months validity)',
          '$25 USD cash (exact change recommended)',
          'Return flight ticket'
        ],
        muslimNote: 'Historic Muslim-majority nation. Al-Azhar Mosque and historic Islamic Cairo are world-famous.',
        embassyUrl: 'https://www.kln.gov.my/web/egy_cairo'
      },
      'morocco': {
        destination: 'Morocco',
        flag: '🇲🇦',
        required: 'Visa Free',
        badgeType: 'visa-free',
        duration: 'Up to 90 days',
        cost: 'FREE',
        processingDays: 'Instant at border control',
        importantNotice: '🇲🇦 90-DAY VISA-FREE: Malaysian passport holders enjoy visa-free entry for tourism up to 90 days in Morocco.',
        documents: [
          'Valid Malaysian passport (min. 6 months validity)',
          'Return flight ticket',
          'Proof of lodging'
        ],
        muslimNote: 'Muslim country. Halal food is universal. Hassan II Mosque in Casablanca and Koutoubia in Marrakech are iconic landmarks.',
        embassyUrl: 'https://www.kln.gov.my/web/mar_rabat'
      },
      'maldives': {
        destination: 'Maldives',
        flag: '🇲🇻',
        required: 'Visa Free (30-Day Tourist Visa on Arrival)',
        badgeType: 'visa-free',
        duration: 'Up to 30 days',
        cost: 'FREE',
        processingDays: 'Instant on arrival',
        importantNotice: '🏝️ IMUGA DECLARATION: All travellers must submit the free online Traveler Declaration (IMUGA) at imuga.immigration.gov.mv within 96 hours before arrival and departure.',
        officialPortal: {
          name: 'Official Maldives IMUGA Traveler Declaration',
          url: 'https://imuga.immigration.gov.mv'
        },
        documents: [
          'Valid passport (min. 1 month validity)',
          'Completed IMUGA declaration QR code',
          'Confirmed resort / guesthouse booking',
          'Return flight ticket'
        ],
        muslimNote: '100% Muslim nation. All food is halal. Note: Alcohol is strictly prohibited on local inhabited islands and only permitted in isolated private luxury resort islands.',
        embassyUrl: 'https://www.immigration.gov.mv'
      },
      'qatar': {
        destination: 'Qatar',
        flag: '🇶🇦',
        required: 'Visa Free (Entry Waiver on Arrival)',
        badgeType: 'visa-free',
        duration: 'Up to 30 days (extendable)',
        cost: 'FREE',
        processingDays: 'Instant at Hamad International Airport',
        importantNotice: '🇶🇦 30-DAY FREE WAIVER: Malaysian passport holders receive a visa-free waiver on arrival at Doha (DOH) for 30 days.',
        documents: [
          'Valid passport (min. 6 months validity)',
          'Confirmed return flight ticket',
          'Hotel booking via Discover Qatar if required'
        ],
        muslimNote: 'Modern Islamic capital with world-class halal dining, prayer facilities, and the renowned Museum of Islamic Art in Doha.',
        embassyUrl: 'https://kualalumpur.embassy.qa'
      },
      'uzbekistan': {
        destination: 'Uzbekistan',
        flag: '🇺🇿',
        required: 'Visa Free',
        badgeType: 'visa-free',
        duration: 'Up to 30 days',
        cost: 'FREE',
        processingDays: 'Instant at airport immigration',
        importantNotice: '🇺🇿 SILK ROAD VISA WAIVER: Malaysian citizens can enter Uzbekistan visa-free for up to 30 days to explore historic Silk Road cities (Samarkand, Bukhara, Khiva).',
        documents: [
          'Valid passport (min. 6 months validity)',
          'Return flight ticket',
          'Hotel registration slip (retained by hotels)'
        ],
        muslimNote: 'Historic cradle of Islamic scholarship (Imam Al-Bukhari, Imam At-Tirmidhi). Halal food and stunning blue-tiled madrasahs everywhere.',
        embassyUrl: 'https://www.kln.gov.my/web/uzb_tashkent'
      },
      'jordan': {
        destination: 'Jordan',
        flag: '🇯🇴',
        required: 'Visa on Arrival / Jordan Pass',
        badgeType: 'visa-arrival',
        duration: 'Up to 30 days',
        cost: '40 JOD (~MYR 260, or WAIVED if purchasing a Jordan Pass)',
        processingDays: 'Instant on arrival at Queen Alia Airport (Amman)',
        importantNotice: '🇯🇴 TIP: BUY THE JORDAN PASS: Purchasing the Jordan Pass online (jordanpass.jo) before travel waives the 40 JOD visa fee and includes entry to Petra and over 40 attractions.',
        officialPortal: {
          name: 'Official Jordan Pass Portal',
          url: 'https://jordanpass.jo'
        },
        documents: [
          'Valid passport (min. 6 months validity)',
          'Jordan Pass or 40 JOD cash/card',
          'Confirmed return ticket'
        ],
        muslimNote: 'Blessed land of the Prophets and the historic Battle of Mu\'tah. Halal dining and mosques throughout Amman, Aqaba, and Petra.',
        embassyUrl: 'https://www.kln.gov.my/web/jor_amman'
      },
      'vietnam': {
        destination: 'Vietnam',
        flag: '🇻🇳',
        required: 'Visa Free (ASEAN Member)',
        badgeType: 'visa-free',
        duration: 'Up to 30 days',
        cost: 'FREE',
        processingDays: 'Instant at immigration',
        importantNotice: '🇻🇳 30-DAY VISA-FREE: Malaysian passport holders can travel visa-free in Vietnam for up to 30 days.',
        documents: ['Valid Malaysian passport (min. 6 months validity)', 'Return flight ticket'],
        muslimNote: 'Halal street food and Malaysian/Cham restaurants are popular along "Malaysia Street" (Nguyen An Ninh) next to Ben Thanh Market in Ho Chi Minh City.',
        embassyUrl: 'https://vnembassy-kualalumpur.mofa.gov.vn'
      }
    };

    // Alias and city mapping
    const ALIAS_MAP = {
      'korea': 'south korea',
      'korea selatan': 'south korea',
      'south korea': 'south korea',
      'seoul': 'south korea',
      'busan': 'south korea',
      'jeju': 'south korea',
      'incheon': 'south korea',
      'japan': 'japan',
      'jepun': 'japan',
      'tokyo': 'japan',
      'osaka': 'japan',
      'kyoto': 'japan',
      'hokkaido': 'japan',
      'uk': 'united kingdom',
      'united kingdom': 'united kingdom',
      'england': 'united kingdom',
      'london': 'united kingdom',
      'britain': 'united kingdom',
      'great britain': 'united kingdom',
      'scotland': 'united kingdom',
      'manchester': 'united kingdom',
      'france': 'schengen',
      'paris': 'schengen',
      'germany': 'schengen',
      'berlin': 'schengen',
      'frankfurt': 'schengen',
      'munich': 'schengen',
      'italy': 'schengen',
      'italia': 'schengen',
      'rome': 'schengen',
      'milan': 'schengen',
      'venice': 'schengen',
      'switzerland': 'schengen',
      'swiss': 'schengen',
      'zurich': 'schengen',
      'geneva': 'schengen',
      'spain': 'schengen',
      'madrid': 'schengen',
      'barcelona': 'schengen',
      'austria': 'schengen',
      'vienna': 'schengen',
      'netherlands': 'schengen',
      'amsterdam': 'schengen',
      'belgium': 'schengen',
      'brussels': 'schengen',
      'australia': 'australia',
      'sydney': 'australia',
      'melbourne': 'australia',
      'perth': 'australia',
      'brisbane': 'australia',
      'gold coast': 'australia',
      'new zealand': 'new zealand',
      'nz': 'new zealand',
      'auckland': 'new zealand',
      'queenstown': 'new zealand',
      'christchurch': 'new zealand',
      'singapore': 'singapore',
      'singapura': 'singapore',
      'china': 'china',
      'beijing': 'china',
      'shanghai': 'china',
      'guangzhou': 'china',
      'shenzhen': 'china',
      'taiwan': 'taiwan',
      'taipei': 'taiwan',
      'hong kong': 'china',
      'hongkong': 'china',
      'macau': 'china',
      'thailand': 'thailand',
      'thai': 'thailand',
      'bangkok': 'thailand',
      'phuket': 'thailand',
      'hat yai': 'thailand',
      'krabi': 'thailand',
      'indonesia': 'indonesia',
      'bali': 'indonesia',
      'jakarta': 'indonesia',
      'surabaya': 'indonesia',
      'bandung': 'indonesia',
      'saudi': 'saudi arabia',
      'saudi arabia': 'saudi arabia',
      'makkah': 'saudi arabia',
      'mecca': 'saudi arabia',
      'madinah': 'saudi arabia',
      'medina': 'saudi arabia',
      'jeddah': 'saudi arabia',
      'riyadh': 'saudi arabia',
      'uae': 'united arab emirates',
      'united arab emirates': 'united arab emirates',
      'dubai': 'united arab emirates',
      'abu dhabi': 'united arab emirates',
      'turkey': 'turkey',
      'turkiye': 'turkey',
      'türkiye': 'turkey',
      'istanbul': 'turkey',
      'ankara': 'turkey',
      'usa': 'usa',
      'united states': 'usa',
      'america': 'usa',
      'us': 'usa',
      'new york': 'usa',
      'los angeles': 'usa',
      'canada': 'canada',
      'toronto': 'canada',
      'vancouver': 'canada',
      'montreal': 'canada',
      'india': 'india',
      'new delhi': 'india',
      'delhi': 'india',
      'mumbai': 'india',
      'vietnam': 'vietnam',
      'hanoi': 'vietnam',
      'ho chi minh': 'vietnam',
      'da nang': 'vietnam',
      'morocco': 'morocco',
      'marrakech': 'morocco',
      'casablanca': 'morocco',
      'egypt': 'egypt',
      'cairo': 'egypt',
      'maldives': 'maldives',
      'male': 'maldives',
      'qatar': 'qatar',
      'doha': 'qatar',
      'uzbekistan': 'uzbekistan',
      'tashkent': 'uzbekistan',
      'samarkand': 'uzbekistan',
      'jordan': 'jordan',
      'amman': 'jordan',
      'petra': 'jordan'
    };

    // 1. Check exact alias map
    let matchKey = ALIAS_MAP[dest];

    // 2. Fuzzy check across alias map keys
    if (!matchKey) {
      const foundAlias = Object.keys(ALIAS_MAP).find(k => dest.includes(k) || k.includes(dest));
      if (foundAlias) matchKey = ALIAS_MAP[foundAlias];
    }

    // 3. Fuzzy check direct VISA_DB keys
    if (!matchKey) {
      matchKey = Object.keys(VISA_DB).find(k => dest.includes(k) || k.includes(dest));
    }

    if (matchKey && VISA_DB[matchKey]) {
      const data = VISA_DB[matchKey];
      return res.json({
        ...data,
        searchedQuery: destination
      });
    }

    // 4. If destination not in database, use Gemini AI fallback for dynamic Malaysian passport visa analysis
    if (ai) {
      try {
        const prompt = `You are an international consular & immigration travel expert.
Analyze the tourist visa and entry requirements specifically for a MALAYSIAN CITIZEN holding a valid MALAYSIAN PASSPORT travelling to "${destination}".
Respond ONLY with a valid JSON object (no markdown, no code blocks):
{
  "destination": "${destination}",
  "flag": "Flag emoji",
  "required": "e.g. Visa Free, eVisa, Visa on Arrival, Visa Required, or ETA Required",
  "badgeType": "visa-free, k-eta, eta, evisa, visa-arrival, or visa-required",
  "duration": "e.g. Up to 30 days, 90 days, or 6 months",
  "cost": "e.g. FREE or approximate MYR/foreign currency fee",
  "processingDays": "e.g. Instant, 1-3 days, or 2 weeks",
  "importantNotice": "Mention any mandatory pre-arrival electronic forms (like K-ETA, Visit Japan Web, SG Arrival Card, E-Customs declaration, etc.) or critical entry rules.",
  "officialPortal": {
    "name": "Official government or visa portal name",
    "url": "Official portal URL"
  },
  "exemptionNotes": "Any age or passport exemption details if applicable",
  "documents": [
    "Valid Malaysian passport (min 6 months validity)",
    "Return flight ticket",
    "Proof of accommodation",
    "Travel insurance"
  ],
  "muslimNote": "Brief practical advice on Halal food and prayer facilities at this destination.",
  "embassyUrl": "https://www.kln.gov.my"
}`;
        const aiText = await generateVisaWithFallback(prompt);
        if (aiText) {
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return res.json({
              ...parsed,
              searchedQuery: destination
            });
          }
        }
      } catch (aiErr) {
        console.warn('Gemini dynamic visa lookup failed, using fallback:', aiErr.message);
      }
    }

    // 5. General fallback
    res.json({
      destination,
      flag: '🌐',
      required: 'Check Official Embassy',
      badgeType: 'visa-required',
      duration: 'Varies by visa type',
      cost: 'Check embassy schedule',
      processingDays: '3 - 15 working days',
      importantNotice: 'Please verify entry requirements directly with the Malaysian Ministry of Foreign Affairs (KLN) or the destination\'s official embassy before travelling.',
      officialPortal: {
        name: 'Ministry of Foreign Affairs Malaysia (KLN)',
        url: 'https://www.kln.gov.my'
      },
      documents: [
        'Valid Malaysian passport (minimum 6 months validity)',
        'Confirmed return / onward flight tickets',
        'Proof of accommodation (hotel booking / invitation)',
        'Travel insurance & proof of sufficient funds'
      ],
      muslimNote: 'Research halal food certifications and mosque availability before travelling.',
      embassyUrl: 'https://www.kln.gov.my',
      searchedQuery: destination
    });
  } catch (error) {
    console.error('Failed to fetch visa info:', error.message);
    res.status(500).json({ message: 'Failed to fetch visa info', error: error.message });
  }
};

// ─── MUSLIM-FRIENDLY ACCOMMODATION ───────────────────────────────────────────
// Uses Google Places API (New)
exports.getMuslimAccommodation = async (req, res) => {
  try {
    const { lat, lng, radius = 5000, city, country } = req.query;

    if (!PLACES_API_KEY) {
      return res.status(500).json({ message: 'Google Places API key is not configured' });
    }

    const locationQuery = [city, country].filter(Boolean).join(', ');
    const textQuery = locationQuery ? `muslim friendly hotels accommodation in ${locationQuery}` : 'hotels and accommodation';

    const requestBody = {
      textQuery,
      includedType: 'lodging',
      maxResultCount: 8
    };

    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      requestBody.locationBias = {
        circle: {
          center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
          radius: Math.min(parseFloat(radius) || 5000, 10000)
        }
      };
    }

    const response = await axios.post(
      'https://places.googleapis.com/v1/places:searchText',
      requestBody,
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
            'places.photos',
            'places.location',
            'places.types'
          ].join(',')
        }
      }
    );

    const hotels = (response.data.places || []).map((place) => {
      const photoName = place.photos?.[0]?.name;
      const photo = photoName
        ? `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=400&key=${PLACES_API_KEY}`
        : null;

      const priceLevelMap = {
        PRICE_LEVEL_FREE: 0,
        PRICE_LEVEL_INEXPENSIVE: 1,
        PRICE_LEVEL_MODERATE: 2,
        PRICE_LEVEL_EXPENSIVE: 3,
        PRICE_LEVEL_VERY_EXPENSIVE: 4
      };
      const priceLevel = priceLevelMap[place.priceLevel] ?? 2;

      let priceRange = 'MYR 150–350/night';
      let priceTier = 'mid-range';
      if (priceLevel <= 1) { priceRange = 'MYR 80–180/night'; priceTier = 'budget'; }
      else if (priceLevel === 2) { priceRange = 'MYR 200–450/night'; priceTier = 'mid-range'; }
      else if (priceLevel === 3) { priceRange = 'MYR 500–900/night'; priceTier = 'premium'; }
      else if (priceLevel >= 4) { priceRange = 'MYR 1000+/night'; priceTier = 'luxury'; }

      return {
        id: place.id,
        name: place.displayName?.text || 'Accommodation',
        lat: place.location?.latitude,
        lng: place.location?.longitude,
        address: place.formattedAddress || 'Address available on map',
        rating: place.rating || null,
        totalRatings: place.userRatingCount || 0,
        priceLevel,
        priceRange,
        priceTier,
        isOpen: true,
        photo,
        muslimFeatures: inferMuslimFeatures(place.displayName?.text, place.types)
      };
    });

    res.json({ count: hotels.length, hotels });
  } catch (error) {
    console.error('Failed to fetch accommodation:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to fetch accommodation. Please try again.', error: error.message });
  }
};

function inferMuslimFeatures(name, types) {
  const lowerName = (name || '').toLowerCase();
  const features = [];
  if (lowerName.includes('halal') || lowerName.includes('muslim') || lowerName.includes('islamic')) {
    features.push('🕌 Muslim-Owned');
    features.push('🍽️ Halal Dining');
    features.push('🙏 Prayer Amenities');
  } else {
    features.push('🙏 Prayer Space Nearby');
    features.push('🍽️ Halal Dining Nearby');
  }
  if (lowerName.includes('family') || lowerName.includes('suite')) features.push('👨‍👩‍👧 Family Rooms');
  if (lowerName.includes('resort') || lowerName.includes('spa')) features.push('🏊 Pool Available');
  return features;
}
