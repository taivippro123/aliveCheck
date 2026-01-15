import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { settingsService, Settings } from '@/services/settingsService';
import { Colors } from '@/constants/theme';

export default function CheckInSettingsScreen() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    emergencyContact: {
      email: null,
      message: null,
      lastMessage7d: null,
    },
    checkInInterval: '24h',
    emailNotificationDelay: 'immediate',
    isDisabled: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsService.getSettings();
      if (response.success) {
        setSettings({
          ...response.settings,
          emergencyContact: {
            ...response.settings.emergencyContact,
            lastMessage7d: response.settings.emergencyContact.lastMessage7d ?? null,
          },
          isDisabled: response.settings.isDisabled ?? false,
        });
        setIsDirty(false);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings.emergencyContact.email) {
      Alert.alert('Lỗi', 'Vui lòng nhập email người thân');
      return;
    }

    try {
      setSaving(true);
      // Chỉ gửi các field liên quan đến check-in
      const response = await settingsService.updateSettings({
        emergencyContact: settings.emergencyContact,
        checkInInterval: settings.checkInInterval,
        emailNotificationDelay: settings.emailNotificationDelay,
      });
      if (response.success) {
        updateUser({
          emergencyContact: response.settings.emergencyContact,
          checkInInterval: response.settings.checkInInterval,
          emailNotificationDelay: response.settings.emailNotificationDelay,
        });
        setIsDirty(false);
        Alert.alert('Thành công', 'Đã lưu cài đặt', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin người thân</Text>
          
          <Text style={styles.label}>Email người thân *</Text>
          <TextInput
            style={styles.input}
            placeholder="relative@example.com"
            placeholderTextColor={Colors.light.icon}
            value={settings.emergencyContact.email || ''}
            onChangeText={(text) => {
              setSettings({
                ...settings,
                emergencyContact: { ...settings.emergencyContact, email: text },
              });
              setIsDirty(true);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Tin nhắn</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Nhập tin nhắn sẽ gửi khi bạn quên điểm danh..."
            placeholderTextColor={Colors.light.icon}
            value={settings.emergencyContact.message || ''}
            onChangeText={(text) => {
              setSettings({
                ...settings,
                emergencyContact: { ...settings.emergencyContact, message: text },
              });
              setIsDirty(true);
            }}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lời nhắn cuối cùng sau 7 ngày không điểm danh</Text>
          <Text style={styles.description}>
            Đây là lời nhắn quan trọng sẽ được gửi cho người thân nếu bạn dùng app nhưng không điểm danh trong 7 ngày liên tiếp.
            Nếu để trống, hệ thống sẽ dùng lời nhắn mặc định ở trên.
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Ví dụ: Nếu bạn nhận được email này nghĩa là tôi đã không thể liên lạc trong thời gian dài. Vui lòng kiểm tra tình trạng của tôi hoặc liên hệ cơ quan chức năng nếu cần."
            placeholderTextColor={Colors.light.icon}
            value={settings.emergencyContact.lastMessage7d || ''}
            onChangeText={(text) => {
              setSettings({
                ...settings,
                emergencyContact: { ...settings.emergencyContact, lastMessage7d: text || null },
              });
              setIsDirty(true);
            }}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thời gian mỗi lần điểm danh</Text>
          {(['12h', '24h', '3d', '1w'] as const).map((interval) => (
            <TouchableOpacity
              key={interval}
              style={[
                styles.option,
                settings.checkInInterval === interval && styles.optionSelected,
              ]}
              onPress={() => {
                setSettings({ ...settings, checkInInterval: interval });
                setIsDirty(true);
              }}
            >
              <Text
                style={[
                  styles.optionText,
                  settings.checkInInterval === interval && styles.optionTextSelected,
                ]}
              >
                {interval === '12h' && '12 giờ'}
                {interval === '24h' && '24 giờ'}
                {interval === '3d' && '3 ngày'}
                {interval === '1w' && '1 tuần'}
              </Text>
              {settings.checkInInterval === interval && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thời gian gửi email khi quên điểm danh</Text>
          {(['immediate', '1d'] as const).map((delay) => (
            <TouchableOpacity
              key={delay}
              style={[
                styles.option,
                settings.emailNotificationDelay === delay && styles.optionSelected,
              ]}
              onPress={() => {
                setSettings({ ...settings, emailNotificationDelay: delay });
                setIsDirty(true);
              }}
            >
              <Text
                style={[
                  styles.optionText,
                  settings.emailNotificationDelay === delay && styles.optionTextSelected,
                ]}
              >
                {delay === 'immediate' && 'Ngay lập tức'}
                {delay === '1d' && 'Sau 1 ngày'}
              </Text>
              {settings.emailNotificationDelay === delay && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton,
            (saving || !isDirty) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={saving || !isDirty}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Lưu cài đặt</Text>
          )}
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 8,
    marginTop: 8,
  },
  description: {
    fontSize: 13,
    color: Colors.light.icon,
    marginBottom: 8,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.icon,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.icon,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  optionSelected: {
    borderColor: Colors.light.tint,
    backgroundColor: '#E6F4FE',
  },
  optionText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  optionTextSelected: {
    color: Colors.light.tint,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: Colors.light.tint,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
