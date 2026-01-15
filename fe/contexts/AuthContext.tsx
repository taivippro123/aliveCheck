import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, AuthResponse, UserResponse } from '@/services/authService';
import * as Notifications from 'expo-notifications';
import { settingsService } from '@/services/settingsService';

type User = UserResponse;

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  applyAuth: (data: AuthResponse) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
      const storedUser = await AsyncStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        // Refresh user data
        try {
          const profileData = await authService.getProfile();
          if (profileData.success) {
            setUser(profileData.user);
            await AsyncStorage.setItem('user', JSON.stringify(profileData.user));
          }
        } catch (error: any) {
          // Nếu access token hết hạn, thử refresh
          if (error.response?.status === 401 && storedRefreshToken) {
            try {
              const refreshResponse = await authService.refreshToken(storedRefreshToken);
              if (refreshResponse.success && refreshResponse.token) {
                setToken(refreshResponse.token);
                await AsyncStorage.setItem('authToken', refreshResponse.token);
                if (refreshResponse.user) {
                  setUser(refreshResponse.user);
                  await AsyncStorage.setItem('user', JSON.stringify(refreshResponse.user));
                }
              }
            } catch (refreshError) {
              console.error('Failed to refresh token:', refreshError);
              // Xóa tất cả nếu refresh thất bại
              await AsyncStorage.removeItem('authToken');
              await AsyncStorage.removeItem('refreshToken');
              await AsyncStorage.removeItem('user');
              setToken(null);
              setUser(null);
            }
          } else {
            console.error('Failed to refresh profile:', error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const registerForPushNotificationsAsync = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permission not granted');
        return;
      }

      try {
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: 'e1fd0854-2eb8-4478-b959-12fa8bfc229a',
        });

        if (token?.data) {
          try {
            await settingsService.savePushToken(token.data);
            console.log('✅ Saved expo push token:', token.data.substring(0, 20) + '...');
          } catch (error) {
            console.error('Failed to save push token to server:', error);
          }
        }
      } catch (tokenError: any) {
        // Handle Firebase initialization error gracefully
        if (tokenError?.message?.includes('FirebaseApp') || tokenError?.message?.includes('Firebase')) {
          console.warn('⚠️ Firebase not initialized. Push notifications may not work on Android.');
          console.warn('⚠️ To enable push notifications on Android, you need to:');
          console.warn('   1. Create a Firebase project at https://console.firebase.google.com/');
          console.warn('   2. Add Android app with package: com.taivippro123.alivecheck');
          console.warn('   3. Download google-services.json and place it in project root');
          console.warn('   4. Add "googleServicesFile": "./google-services.json" to android config in app.json');
          console.warn('   5. Rebuild the app with: eas build -p android');
          // Don't throw error, just log warning - app can still work without push notifications
        } else {
          // Re-throw other errors
          throw tokenError;
        }
      }
    } catch (error) {
      console.error('registerForPushNotificationsAsync error:', error);
      // Don't block app functionality if push notifications fail
    }
  };

  const applyAuth = async (data: AuthResponse) => {
    setToken(data.token);
    setUser(data.user);

    await AsyncStorage.setItem('authToken', data.token);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    
    // Lưu refresh token nếu có
    if (data.refreshToken) {
      await AsyncStorage.setItem('refreshToken', data.refreshToken);
    }

     // Sau khi đăng nhập thành công thì đăng ký push token
     await registerForPushNotificationsAsync();
  };

  const login = async (email: string, password: string) => {
    try {
      const response: AuthResponse = await authService.login({ email, password });

      if (response.success) {
        await applyAuth(response);
      } else {
        throw new Error('Đăng nhập thất bại');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('refreshToken');
    await AsyncStorage.removeItem('user');
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, applyAuth, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
