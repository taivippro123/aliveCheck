import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/constants/api';
import { authService } from './authService';

// Debug: Log API URL khi khởi tạo axios instance
console.log('🌐 Axios instance created with baseURL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Debug: Log request URL để kiểm tra endpoint đang được gọi
    const fullUrl = config.baseURL && config.url ? config.baseURL + config.url : config.url || 'unknown';
    console.log('📤 API Request:', config.method?.toUpperCase(), config.url, '-> Full URL:', fullUrl);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors and auto-refresh token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Debug: Log error để kiểm tra
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.statusText, 'URL:', originalRequest?.url);
      const errorFullUrl = originalRequest?.baseURL && originalRequest?.url ? originalRequest.baseURL + originalRequest.url : originalRequest?.url || 'unknown';
      console.error('❌ Full Error URL:', errorFullUrl);
      console.error('❌ Error data:', error.response.data);
    } else if (error.request) {
      const errorUrl = originalRequest?.baseURL && originalRequest?.url ? originalRequest.baseURL + originalRequest.url : originalRequest?.url || 'unknown';
      console.error('❌ Network Error - No response received. Request URL:', errorUrl);
      console.error('❌ Check if backend is accessible at:', originalRequest?.baseURL);
    } else {
      console.error('❌ Request setup error:', error.message);
    }
    
    // Nếu là lỗi 401 và không phải request refresh token
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !originalRequest.url?.includes('/auth/refresh')) {
      if (isRefreshing) {
        // Đang refresh, thêm vào queue
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        
        if (!refreshToken) {
          // Không có refresh token, xóa tất cả và logout
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('refreshToken');
          await AsyncStorage.removeItem('user');
          processQueue(new Error('No refresh token'), null);
          return Promise.reject(error);
        }

        // Thử refresh token
        const refreshResponse = await authService.refreshToken(refreshToken);
        
        if (refreshResponse.success && refreshResponse.token) {
          // Lưu token mới
          await AsyncStorage.setItem('authToken', refreshResponse.token);
          if (refreshResponse.user) {
            await AsyncStorage.setItem('user', JSON.stringify(refreshResponse.user));
          }

          // Retry request ban đầu với token mới
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${refreshResponse.token}`;
          }

          processQueue(null, refreshResponse.token);
          isRefreshing = false;

          return api(originalRequest);
        } else {
          throw new Error('Refresh token failed');
        }
      } catch (refreshError) {
        // Refresh thất bại, xóa tất cả và logout
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('refreshToken');
        await AsyncStorage.removeItem('user');
        processQueue(refreshError, null);
        isRefreshing = false;
        return Promise.reject(refreshError);
      }
    }

    // Các lỗi khác hoặc không phải 401
    return Promise.reject(error);
  }
);

export default api;
