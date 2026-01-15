import api from './api';

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  age?: number;
  address?: string;
  phone?: string;
  emergencyContact: {
    email: string | null;
    message: string | null;
  };
  checkInInterval: string;
  emailNotificationDelay: string;
  lastCheckIn: string | null;
  status: string;
  isDisabled?: boolean;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  refreshToken?: string;
  user: UserResponse;
}

export const authService = {
  register: async (payload: {
    name: string;
    age?: number;
    address?: string;
    email: string;
    phone?: string;
    password: string;
  }): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/auth/register', payload);
    return response.data;
  },

  verifyEmail: async (payload: {
    email: string;
    code: string;
  }): Promise<AuthResponse> => {
    const response = await api.post('/auth/verify-email', payload);
    return response.data;
  },

  login: async (payload: {
    email: string;
    password: string;
  }): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', payload);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  forgotPassword: async (email: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (payload: {
    email: string;
    code: string;
    newPassword: string;
  }): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/auth/reset-password', payload);
    return response.data;
  },
};
