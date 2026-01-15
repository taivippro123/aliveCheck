import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { checkInService } from '@/services/checkInService';
import { Colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

export default function HomeScreen() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInStatus, setCheckInStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  
  // Animation values
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const checkmarkOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(1);

  useEffect(() => {
    if (!user) return;

    // Nếu chưa cấu hình email người thân thì không gọi API trạng thái,
    // chỉ hiển thị thông báo trên UI
    if (!user.emergencyContact?.email) {
      setLoadingStatus(false);
      return;
    }

    // Khi đã có cấu hình thì mới load trạng thái điểm danh
    loadCheckInStatus();
    const interval = setInterval(loadCheckInStatus, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Reload khi quay lại từ Settings để cập nhật thời điểm tiếp theo sau khi đổi checkInInterval
  useFocusEffect(
    React.useCallback(() => {
      if (user && user.emergencyContact?.email) {
        loadCheckInStatus();
      }
    }, [user])
  );

  const loadCheckInStatus = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoadingStatus(true);
      }
      const response = await checkInService.getStatus();
      if (response.success) {
        console.log('Check-in status response:', response);

        // Nếu backend chưa trả nextCheckIn (hoặc null), tính trên client để chắc chắn luôn có giá trị
        let nextCheckIn = response.nextCheckIn;
        if (!nextCheckIn && response.lastCheckIn && response.checkInInterval) {
          const base = new Date(response.lastCheckIn);
          const intervalsMs: Record<string, number> = {
            '12h': 12 * 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '3d': 3 * 24 * 60 * 60 * 1000,
            '1w': 7 * 24 * 60 * 60 * 1000,
          };
          const delta = intervalsMs[response.checkInInterval] ?? intervalsMs['24h'];
          nextCheckIn = new Date(base.getTime() + delta).toISOString();
        }

        setCheckInStatus({ ...response, nextCheckIn });
      } else {
        console.warn('Failed to get check-in status:', response);
      }
    } catch (error) {
      console.error('Failed to load check-in status:', error);
    } finally {
      if (showRefreshing) {
        setRefreshing(false);
      } else {
        setLoadingStatus(false);
      }
    }
  };

  const onRefresh = async () => {
    await loadCheckInStatus(true);
  };

  const handleCheckIn = async () => {
    try {
      setCheckingIn(true);
      setHasCheckedIn(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Animation: Xoay tròn 1 vòng
      rotation.value = withTiming(360, { duration: 600 });
      scale.value = withSequence(
        withSpring(0.9, { damping: 10 }),
        withSpring(1, { damping: 10 })
      );
      
      const response = await checkInService.checkIn();
      if (response.success) {
        // Animation: Ẩn chữ, hiện tick
        textOpacity.value = withTiming(0, { duration: 200 });
        rotation.value = withTiming(0, { duration: 0 }); // Reset rotation
        checkmarkOpacity.value = withTiming(1, { duration: 300 });
        setHasCheckedIn(true);
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        updateUser({ lastCheckIn: response.lastCheckIn, status: response.status });
        
        // Reload status sau khi điểm danh
        await loadCheckInStatus();
        
        // Reset animation sau 2 giây
        setTimeout(() => {
          checkmarkOpacity.value = withTiming(0, { duration: 300 });
          textOpacity.value = withTiming(1, { duration: 300 });
          setHasCheckedIn(false);
        }, 2000);
      }
    } catch (error: any) {
      // Reset animation on error
      rotation.value = withTiming(0, { duration: 0 });
      scale.value = withTiming(1, { duration: 0 });
      checkmarkOpacity.value = withTiming(0, { duration: 0 });
      textOpacity.value = withTiming(1, { duration: 0 });
      setHasCheckedIn(false);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Lỗi', error.response?.data?.error || 'Failed to check in');
    } finally {
      setCheckingIn(false);
    }
  };

  const formatTimeAgo = (hours: number | null) => {
    if (hours === null) return 'Chưa điểm danh';
    if (hours < 1) return 'Vừa xong';
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

  const getStatusColor = () => {
    if (!checkInStatus) return Colors.light.icon;
    if (checkInStatus.needsCheckIn) return '#FF6B6B';
    return '#51CF66';
  };

  const getStatusText = () => {
    if (!checkInStatus) return 'Đang tải...';
    if (checkInStatus.needsCheckIn) return 'Cần điểm danh';
    return 'Đã điểm danh';
  };

  const formatNextCheckIn = (nextCheckIn?: string | Date | null) => {
    if (!nextCheckIn) return 'Chưa có thời gian điểm danh tiếp theo';

    const d = new Date(nextCheckIn);
    const now = new Date();

    const isToday =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();

    const isTomorrow = (() => {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      return (
        d.getFullYear() === tomorrow.getFullYear() &&
        d.getMonth() === tomorrow.getMonth() &&
        d.getDate() === tomorrow.getDate()
      );
    })();

    const timeStr = d.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (isToday) {
      return `Hôm nay lúc ${timeStr}`;
    }
    if (isTomorrow) {
      return `Ngày mai lúc ${timeStr}`;
    }

    const dateStr = d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return `${dateStr} lúc ${timeStr}`;
  };

  const needsInitialSetup = !!user && !user.emergencyContact?.email;

  // Kiểm tra xem đã đến thời gian điểm danh tiếp theo chưa
  const canCheckIn = () => {
    if (!checkInStatus?.nextCheckIn) return true; // Nếu chưa có nextCheckIn thì cho phép điểm danh
    const now = new Date();
    const nextCheckInTime = new Date(checkInStatus.nextCheckIn);
    return now >= nextCheckInTime; // Chỉ cho phép khi đã đến hoặc quá thời gian
  };

  const isCheckInDisabled = checkingIn || !canCheckIn();

  // Animated styles - Phải đặt trước early return để tuân thủ quy tắc hooks
  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotation.value}deg` },
        { scale: scale.value },
      ],
    };
  });

  const checkmarkAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: checkmarkOpacity.value,
      transform: [
        { scale: interpolate(checkmarkOpacity.value, [0, 1], [0.5, 1], Extrapolate.CLAMP) },
      ],
    };
  });

  const textAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: textOpacity.value,
    };
  });

  if (loadingStatus) {
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Xin chào,</Text>
          <Text style={styles.userName}>{user?.name ? `${user.name}!` : 'Người dùng'}</Text>
        </View>

         {/* Initial setup notice */}
        {needsInitialSetup && (
          <View style={styles.setupCard}>
            <Text style={styles.setupTitle}>Thiết lập thông tin người thân</Text>
            <Text style={styles.setupText}>
              Vui lòng cài đặt email người thân và thời gian điểm danh trong mục Cài đặt
            </Text>
            <TouchableOpacity
              style={styles.setupButton}
              onPress={() => router.push('/settings')}
            >
              <Text style={styles.setupButtonText}>Đi đến Cài đặt</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Status Card (chỉ hiển thị khi đã cấu hình) */}
        {!needsInitialSetup && (
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>Trạng thái</Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusIndicator,
                  { backgroundColor: getStatusColor() },
                ]}
              />
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>
            {checkInStatus?.lastCheckIn && (
              <Text style={styles.lastCheckIn}>
                Lần cuối: {formatTimeAgo(checkInStatus.hoursSinceLastCheckIn)}
              </Text>
            )}
            {checkInStatus?.nextCheckIn && (
              <Text style={styles.nextCheckIn}>
                Lần tiếp theo: {formatNextCheckIn(checkInStatus.nextCheckIn)}
              </Text>
            )}
          </View>
        )}

        {/* Check-in Button */}
        {!needsInitialSetup && (
        <View style={styles.checkInContainer}>
          <TouchableOpacity
            style={[
              styles.checkInButton,
              isCheckInDisabled && styles.checkInButtonDisabled,
            ]}
            onPress={handleCheckIn}
            disabled={isCheckInDisabled}
            activeOpacity={0.8}
          >
            <Animated.View style={[styles.checkInButtonInner, buttonAnimatedStyle]}>
              {checkingIn ? (
                <ActivityIndicator color="#fff" size="large" />
              ) : hasCheckedIn ? (
                <Animated.View style={[styles.checkmarkContainer, checkmarkAnimatedStyle]}>
                  <Text style={styles.checkmark}>✓</Text>
                </Animated.View>
              ) : (
                <Animated.Text style={[styles.checkInButtonText, textAnimatedStyle]}>
                  ĐIỂM DANH
                </Animated.Text>
              )}
            </Animated.View>
          </TouchableOpacity>
       
        </View>
        )}
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
    flexGrow: 1,
    padding: 24,
  },
  header: {
    marginBottom: 32,
    marginTop: 16,
  },
  greeting: {
    fontSize: 18,
    color: Colors.light.icon,
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusLabel: {
    fontSize: 16,
    color: Colors.light.icon,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 20,
    fontWeight: '600',
  },
  lastCheckIn: {
    fontSize: 16,
    color: Colors.light.icon,
    marginTop: 4,
  },
  nextCheckIn: {
    fontSize: 16,
    color: Colors.light.icon,
    marginTop: 4,
  },
  checkInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkInButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  checkInButtonDisabled: {
    opacity: 0.6,
  },
  checkInButtonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkInButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  checkmarkContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 80,
    fontWeight: 'bold',
  },
  settingsButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 24,
  },
  settingsButtonText: {
    fontSize: 16,
    color: Colors.light.tint,
    fontWeight: '500',
  },
  setupCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  setupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  setupText: {
    fontSize: 14,
    color: Colors.light.icon,
    marginBottom: 16,
    lineHeight: 20,
  },
  setupButton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.light.tint,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  waitMessage: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.light.icon,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
