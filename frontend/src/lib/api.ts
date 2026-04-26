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

// Admin
export const createRun = (run: object) => api.post("/admin/runs", run);
export const updateRun = (runId: number, updates: object) =>
  api.patch(`/admin/runs/${runId}`, updates);
export const listAllRuns = () => api.get("/admin/runs");
export const listUsers = () => api.get("/admin/users");
export const updateUser = (userId: number, updates: object) =>
  api.patch(`/admin/users/${userId}`, updates);

// Survey
export const submitSurvey = (runId: number, payload: object) =>
  api.post(`/survey/runs/${runId}/submit`, payload);
export const getMySurvey = (runId: number) => api.get(`/survey/runs/${runId}/my`);
export const getSurveyAggregate = (runId: number) =>
  api.get(`/admin/survey/runs/${runId}`);

// Analytics
export const getRunSummary = (runId: number) =>
  api.get(`/analytics/runs/${runId}/summary`);

export const getAgentPerformance = (runId: number) =>
  api.get(`/analytics/runs/${runId}/agents`);

export const getNegotiation = (runId: number, negotiationId: number) =>
  api.get(`/marketplace/runs/${runId}/negotiations/${negotiationId}`);

export default api;
