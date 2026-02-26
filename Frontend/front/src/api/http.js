import axios from "axios";
import { authStore } from "../store/auth";


export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";


export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});


http.interceptors.request.use((config) => {
  const token = authStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});


http.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) authStore.getState().logout();
    return Promise.reject(err);
  }
);