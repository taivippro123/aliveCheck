import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import * as Updates from 'expo-updates';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const rootSegment = segments[0];
    const inTabsGroup = rootSegment === '(tabs)';
    const isOnLoginScreen = rootSegment === 'login';

    // Nếu chưa đăng nhập mà đang ở trong nhóm tabs => đá về login
    if (!user && inTabsGroup) {
      router.replace('/login');
    }
    // Nếu đã đăng nhập mà vẫn đang ở màn login => chuyển sang tabs
    else if (user && isOnLoginScreen) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="settings" 
          options={{ 
            presentation: 'modal',
            title: 'Cài đặt',
            headerShown: true,
            headerStyle: {
              backgroundColor: '#fff',
            },
            headerTintColor: '#000',
            headerTitleStyle: {
              fontWeight: '600',
            },
            headerShadowVisible: true,
          }} 
        />
        <Stack.Screen 
          name="settings/checkin" 
          options={{ 
            title: 'Cài đặt điểm danh',
            headerShown: true,
            headerStyle: {
              backgroundColor: '#fff',
            },
            headerTintColor: '#000',
            headerTitleStyle: {
              fontWeight: '600',
            },
            headerShadowVisible: true,
          }} 
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // Check for OTA updates on app start
    async function onFetchUpdateAsync() {
      try {
        // Only check for updates in production builds
        if (!__DEV__ && Updates.isEnabled) {
          console.log('🔄 Checking for OTA updates...');
          const update = await Updates.checkForUpdateAsync();

          if (update.isAvailable) {
            console.log('✅ New update available! Downloading...');
            await Updates.fetchUpdateAsync();
            console.log('✅ Update downloaded! Reloading app...');
            // Reload app to use new update
            await Updates.reloadAsync();
          } else {
            console.log('✅ App is up to date');
          }
        } else {
          console.log('ℹ️ Updates check skipped (dev mode or updates disabled)');
        }
      } catch (error) {
        console.error('❌ Error checking for updates:', error);
        // Don't block app if update check fails
      }
    }

    onFetchUpdateAsync();
  }, []);

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
