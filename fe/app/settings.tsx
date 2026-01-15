import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { settingsService } from '@/services/settingsService';
import { Colors } from '@/constants/theme';

export default function SettingsScreen() {
  const { user, updateUser, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsService.getSettings();
      if (response.success) {
        setIsDisabled(response.settings.isDisabled ?? false);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Đăng xuất', 'Bạn chắc chắn muốn đăng xuất?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  const handleToggleDisabled = async () => {
    const newIsDisabled = !isDisabled;
    const action = newIsDisabled ? 'dừng' : 'bật lại';
    
    Alert.alert(
      newIsDisabled ? 'Dừng dùng app' : 'Bật lại app',
      `Bạn có chắc chắn muốn ${action} dùng app không?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xác nhận',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              const response = await settingsService.updateSettings({ isDisabled: newIsDisabled });
              if (response.success) {
                setIsDisabled(newIsDisabled);
                updateUser({
                  isDisabled: newIsDisabled,
                });
                Alert.alert(
                  'Thành công',
                  newIsDisabled ? 'Đã dừng dùng app' : 'Đã bật lại app'
                );
              }
            } catch (error: any) {
              Alert.alert('Lỗi', error.response?.data?.error || 'Failed to update settings');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleSendTestEmail = async () => {
    if (!user?.emergencyContact?.email) {
      Alert.alert('Lỗi', 'Vui lòng cấu hình email người thân trong Cài đặt điểm danh trước');
      return;
    }

    Alert.alert(
      'Gửi email test',
      'Bạn có chắc chắn muốn gửi email test không?',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Gửi',
          onPress: async () => {
            try {
              setSendingTestEmail(true);
              const response = await settingsService.sendTestEmail();
              if (response.success) {
                Alert.alert('Thành công', 'Đã gửi email test thành công. Vui lòng kiểm tra hộp thư của email người thân.');
              } else {
                Alert.alert('Lỗi', response.error || 'Không thể gửi email test');
              }
            } catch (error: any) {
              Alert.alert('Lỗi', error.response?.data?.error || 'Failed to send test email');
            } finally {
              setSendingTestEmail(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Cài đặt</Text>

        {/* Option 1: Cài đặt điểm danh */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => router.push('/settings/checkin')}
        >
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Cài đặt điểm danh</Text>
            <Text style={styles.optionDescription}>
              Email, lời nhắn và thời gian điểm danh
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        {/* Option 2: Gửi email test */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={handleSendTestEmail}
          disabled={sendingTestEmail}
        >
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Gửi email test</Text>
            <Text style={styles.optionDescription}>
              Kiểm tra tính năng gửi email có hoạt động đúng không
            </Text>
          </View>
          {sendingTestEmail ? (
            <ActivityIndicator color={Colors.light.tint} size="small" />
          ) : (
            <Text style={styles.arrow}>›</Text>
          )}
        </TouchableOpacity>

        {/* Option 3: Dừng dùng app */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={handleToggleDisabled}
          disabled={saving}
        >
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Dừng dùng app</Text>
            <Text style={styles.optionDescription}>
              {isDisabled ? 'Đã dừng - App sẽ không gửi email cảnh báo' : 'Đang hoạt động - Bấm để dừng'}
            </Text>
          </View>
          {saving ? (
            <ActivityIndicator color={Colors.light.tint} size="small" />
          ) : (
            <View style={[styles.statusIndicator, isDisabled && styles.statusIndicatorDisabled]}>
              <Text style={styles.statusText}>{isDisabled ? 'Đã dừng' : 'Hoạt động'}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Option 4: Đăng xuất */}
        <TouchableOpacity
          style={[styles.optionCard, styles.logoutCard]}
          onPress={handleLogout}
        >
          <View style={styles.optionContent}>
            <Text style={[styles.optionTitle, styles.logoutText]}>Đăng xuất</Text>
            <Text style={[styles.optionDescription, styles.logoutText]}>
              Đăng xuất khỏi tài khoản
            </Text>
          </View>
          <Text style={[styles.arrow, styles.logoutText]}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.icon,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  optionContent: {
    flex: 1,
    marginRight: 12,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: Colors.light.icon,
    lineHeight: 20,
  },
  arrow: {
    fontSize: 24,
    color: Colors.light.icon,
    fontWeight: '300',
  },
  statusIndicator: {
    backgroundColor: '#51CF66',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusIndicatorDisabled: {
    backgroundColor: '#FF6B6B',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutCard: {
    borderColor: '#E74C3C',
    backgroundColor: '#fff',
  },
  logoutText: {
    color: '#E74C3C',
  },
});
