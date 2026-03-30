import axios from "axios";

// Hardcoded API URLs for development
const API_GATEWAY_URL = "http://localhost:8080";
const EVENT_SERVICE_URL = "http://localhost:4002";

// API instance for GraphQL (via API Gateway)
const api = axios.create({
  baseURL: API_GATEWAY_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
});

// API instance for Event REST API
export const eventApi = axios.create({
  baseURL: EVENT_SERVICE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("socniti_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

eventApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("socniti_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
