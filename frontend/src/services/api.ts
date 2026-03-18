import axios from 'axios';
import { Platform } from 'react-native';
import { getToken } from './tokenService';

const BASE_URL =
  Platform.OS === 'web' ? 'http://localhost:3000' : 'http://192.168.0.6:3000';

console.log(`[API] baseURL: ${BASE_URL} (platform: ${Platform.OS})`);

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      console.error(
        `[API] Response error: ${error.response?.status} ${error.config?.url}`,
        error.response?.data
      );
    } else {
      console.error('[API] Unknown error:', error);
    }
    return Promise.reject(error);
  }
);
