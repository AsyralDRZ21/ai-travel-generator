import axios from 'axios';

const API = axios.create({ baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}` });

// Attach token to every request if present
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('travel_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const register = (data) => API.post('/auth/register', data);
export const login = (data) => API.post('/auth/login', data);

// Itinerary
export const generateItinerary  = (data)       => API.post('/itinerary/generate', data);
export const getItineraries     = ()            => API.get('/itinerary');
export const deleteItinerary    = (id)          => API.delete(`/itinerary/${id}`);
export const updateItineraryPlan = (id, plan)   => API.put(`/itinerary/${id}/plan`, { plan });
export const suggestPlaces      = (id, data)    => API.post(`/itinerary/${id}/suggest`, data);

// Budget
export const createBudget = (data) => API.post('/budget', data);
export const getBudgets = () => API.get('/budget');
export const addExpense = (budgetId, data) => API.post(`/budget/${budgetId}/expense`, data);
export const deleteExpense = (budgetId, expenseId) => API.delete(`/budget/${budgetId}/expense/${expenseId}`);
export const deleteBudget = (id) => API.delete(`/budget/${id}`);

// Hotels
export const searchHotels = (destination, params = {}) => {
  const query = new URLSearchParams({ destination, ...params }).toString();
  return API.get(`/hotels/search?${query}`);
};

// Muslim Module
export const getPrayerTimes       = (city, country, date) => API.get(`/muslim/prayer-times?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}${date ? `&date=${date}` : ''}`);
export const getMosques           = (lat, lng, radius, city, country) => API.get(`/muslim/mosques?lat=${lat || ''}&lng=${lng || ''}&radius=${radius || 5000}${city ? `&city=${encodeURIComponent(city)}` : ''}${country ? `&country=${encodeURIComponent(country)}` : ''}`);
export const getHalalFood         = (lat, lng, radius, city, country) => API.get(`/muslim/halal-food?lat=${lat || ''}&lng=${lng || ''}&radius=${radius || 5000}${city ? `&city=${encodeURIComponent(city)}` : ''}${country ? `&country=${encodeURIComponent(country)}` : ''}`);
export const getHistoricalWeather = (lat, lng, month)                 => API.get(`/muslim/weather-history?lat=${lat}&lng=${lng}&month=${month}`);
export const getVisaInfo          = (destination)                     => API.get(`/muslim/visa?destination=${encodeURIComponent(destination)}`);
export const getMuslimAccomm      = (lat, lng, radius, city, country) => API.get(`/muslim/accommodation?lat=${lat || ''}&lng=${lng || ''}&radius=${radius || 5000}${city ? `&city=${encodeURIComponent(city)}` : ''}${country ? `&country=${encodeURIComponent(country)}` : ''}`);

export default API;
