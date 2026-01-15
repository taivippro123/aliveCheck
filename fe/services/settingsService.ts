import api from './api';

export interface Settings {
  emergencyContact: {
    email: string | null;
    message: string | null;
    // Optional: lời nhắn cuối cùng sau 7 ngày không điểm danh
    lastMessage7d?: string | null;
  };
  checkInInterval: '12h' | '24h' | '3d' | '1w';
  emailNotificationDelay: 'immediate' | '1d';
  isDisabled?: boolean;
}

export const settingsService = {
  getSettings: async (): Promise<{ success: boolean; settings: Settings }> => {
    const response = await api.get('/settings');
    return response.data;
  },

  updateSettings: async (settings: Partial<Settings>): Promise<{ success: boolean; settings: Settings }> => {
    const response = await api.put('/settings', settings);
    return response.data;
  },

  sendTestEmail: async (): Promise<{ success: boolean; message?: string; error?: string }> => {
    const response = await api.post('/settings/test-email');
    return response.data;
  },

  savePushToken: async (expoPushToken: string): Promise<{ success: boolean }> => {
    const response = await api.post('/settings/push-token', { expoPushToken });
    return response.data;
  },
};
