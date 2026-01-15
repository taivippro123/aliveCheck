import axios from 'axios';

export const sendPushNotification = async (expoPushToken, title, body) => {
  if (!expoPushToken) return { success: false, error: 'Missing expoPushToken' };

  try {
    const response = await axios.post('https://exp.host/--/api/v2/push/send', {
      to: expoPushToken,
      sound: 'default',
      title,
      body,
    });

    if (response.data?.data?.status === 'ok') {
      return { success: true };
    }

    return {
      success: false,
      error: response.data?.data?.message || 'Unknown push error',
    };
  } catch (error) {
    console.error('Send push notification error:', error?.message || error);
    return { success: false, error: error.message || 'Failed to send push notification' };
  }
};

