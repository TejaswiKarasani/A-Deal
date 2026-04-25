import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const register = (name: string, email: string, password: string) =>
  api.post("/auth/register", { name, email, password });

export const login = (email: string, password: string) =>
  api.post("/auth/token", new URLSearchParams({ username: email, password }), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

// Onboarding
export const sendInterviewMessage = (message: string, history: object[]) =>
  api.post("/onboarding/chat", { message, history });

export const confirmProfile = (profile: object) =>
  api.post("/onboarding/confirm", { profile });

export const getOnboardingStatus = () => api.get("/onboarding/status");

// Marketplace
export const getRuns = () => api.get("/marketplace/runs");

export const getListings = (runId: number) =>
  api.get(`/marketplace/runs/${runId}/listings`);

export const getDeals = (runId: number) =>
  api.get(`/marketplace/runs/${runId}/deals`);

export const getMyDeals = () => api.get("/marketplace/my/deals");

// Analytics
export const getRunSummary = (runId: number) =>
  api.get(`/analytics/runs/${runId}/summary`);

export const getAgentPerformance = (runId: number) =>
  api.get(`/analytics/runs/${runId}/agents`);
