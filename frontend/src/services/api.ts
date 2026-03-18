import axios from 'axios';
import { getToken } from './tokenService';

export const api = axios.create({
  baseURL: 'http://192.168.0.6:3000',
  timeout: 10000,
});

api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
