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
export const generateItinerary = (data) => API.post('/itinerary/generate', data);
export const getItineraries = () => API.get('/itinerary');
export const deleteItinerary = (id) => API.delete(`/itinerary/${id}`);

// Budget
export const createBudget = (data) => API.post('/budget', data);
export const getBudgets = () => API.get('/budget');
export const addExpense = (budgetId, data) => API.post(`/budget/${budgetId}/expense`, data);
export const deleteExpense = (budgetId, expenseId) => API.delete(`/budget/${budgetId}/expense/${expenseId}`);
export const deleteBudget = (id) => API.delete(`/budget/${id}`);

export default API;
