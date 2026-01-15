import api from './api';

export const checkInService = {
  checkIn: async () => {
    const response = await api.post('/checkin');
    return response.data;
  },

  getStatus: async () => {
    const response = await api.get('/checkin/status');
    return response.data;
  },

  getHistory: async () => {
    // Backend tự động filter 2 tuần gần nhất, không cần limit
    const response = await api.get('/checkin/history');
    return response.data;
  },
};
