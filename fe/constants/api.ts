import { Platform } from 'react-native';

// Android emulator dùng 10.0.2.2 để truy cập localhost của máy host
// iOS simulator có thể dùng localhost
// Physical device cần dùng IP máy tính trên cùng mạng WiFi
export const API_URL = Platform.select({
  android: 'https://alivecheck.onrender.com/api', // Android emulator
  ios: 'https://alivecheck.onrender.com/api', // iOS simulator
  default: 'https://alivecheck.onrender.com/api', // Web hoặc fallback
});

// Debug: Log API URL để kiểm tra khi app chạy
if (__DEV__) {
  console.log('🔗 API_URL configured:', API_URL);
  console.log('🔗 Platform:', Platform.OS);
}