import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/theme';
import { authService } from '@/services/authService';

type Mode = 'login' | 'register' | 'verify' | 'forgot-password' | 'reset-password';

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const { login, applyAuth } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ tên, email và mật khẩu');
      return;
    }

    try {
      setLoading(true);
      await authService.register({
        name,
        age: age ? Number(age) : undefined,
        address,
        email,
        phone,
        password,
      });

      Alert.alert('Thành công', 'Đã gửi mã OTP tới email của bạn');
      setMode('verify');
    } catch (error: any) {
      console.error('Register error:', error.response?.data || error);
      Alert.alert(
        'Đăng ký thất bại',
        error.response?.data?.error || 'Vui lòng thử lại'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!email || !otp) {
      Alert.alert('Lỗi', 'Vui lòng nhập email và mã OTP');
      return;
    }

    try {
      setLoading(true);
      const data = await authService.verifyEmail({ email, code: otp });
      if (data.success) {
        await applyAuth(data);
        router.replace('/(tabs)');
      } else {
        Alert.alert('Lỗi', 'Xác thực email thất bại');
      }
    } catch (error: any) {
      console.error('Verify email error:', error.response?.data || error);
      Alert.alert(
        'Xác thực thất bại',
        error.response?.data?.error || 'Vui lòng thử lại'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập email và mật khẩu');
      return;
    }
    try {
      setLoading(true);
      await login(email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error);
      Alert.alert(
        'Đăng nhập thất bại',
        error.response?.data?.error || 'Sai email hoặc mật khẩu'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Lỗi', 'Vui lòng nhập email');
      return;
    }

    try {
      setLoading(true);
      const result = await authService.forgotPassword(email);
      Alert.alert('Thành công', result.message || 'Đã gửi mã OTP tới email của bạn');
      setMode('reset-password');
    } catch (error: any) {
      console.error('Forgot password error:', error.response?.data || error);
      Alert.alert(
        'Gửi email thất bại',
        error.response?.data?.error || 'Vui lòng thử lại'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email || !otp || !newPassword || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }

    try {
      setLoading(true);
      const result = await authService.resetPassword({
        email,
        code: otp,
        newPassword,
      });
      Alert.alert('Thành công', result.message || 'Đặt lại mật khẩu thành công', [
        {
          text: 'OK',
          onPress: () => {
            setMode('login');
            setOtp('');
            setNewPassword('');
            setConfirmPassword('');
          },
        },
      ]);
    } catch (error: any) {
      console.error('Reset password error:', error.response?.data || error);
      Alert.alert(
        'Đặt lại mật khẩu thất bại',
        error.response?.data?.error || 'Vui lòng thử lại'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Text style={styles.title}>Alive Check</Text>
            <Text style={styles.subtitle}>
              Ứng dụng điểm danh cho người sống một mình
            </Text>

            <View style={styles.iconContainer}>
              <Text style={styles.icon}>✓</Text>
            </View>

            {mode === 'register' && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Họ và tên"
                  placeholderTextColor={Colors.light.icon}
                  value={name}
                  onChangeText={setName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Tuổi"
                  placeholderTextColor={Colors.light.icon}
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Địa chỉ"
                  placeholderTextColor={Colors.light.icon}
                  value={address}
                  onChangeText={setAddress}
                />
              </>
            )}

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={Colors.light.icon}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            {(mode === 'login' || mode === 'register') && (
              <TextInput
                style={styles.input}
                placeholder="Mật khẩu"
                placeholderTextColor={Colors.light.icon}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            )}

            {mode === 'register' && (
              <TextInput
                style={styles.input}
                placeholder="Số điện thoại"
                placeholderTextColor={Colors.light.icon}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            )}

            {(mode === 'verify' || mode === 'reset-password') && (
              <TextInput
                style={styles.input}
                placeholder="Mã OTP"
                placeholderTextColor={Colors.light.icon}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
              />
            )}

            {mode === 'reset-password' && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Mật khẩu mới"
                  placeholderTextColor={Colors.light.icon}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
                <TextInput
                  style={styles.input}
                  placeholder="Xác nhận mật khẩu mới"
                  placeholderTextColor={Colors.light.icon}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={
                mode === 'login'
                  ? handleLogin
                  : mode === 'register'
                  ? handleRegister
                  : mode === 'verify'
                  ? handleVerify
                  : mode === 'forgot-password'
                  ? handleForgotPassword
                  : handleResetPassword
              }
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>
                  {mode === 'login'
                    ? 'Đăng nhập'
                    : mode === 'register'
                    ? 'Đăng ký'
                    : mode === 'verify'
                    ? 'Xác nhận OTP'
                    : mode === 'forgot-password'
                    ? 'Gửi mã OTP'
                    : 'Đặt lại mật khẩu'}
                </Text>
              )}
            </TouchableOpacity>

            {mode === 'login' && (
              <TouchableOpacity
                style={styles.forgotPasswordButton}
                onPress={() => setMode('forgot-password')}
                disabled={loading}
              >
                <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() =>
                switchMode(
                  mode === 'login'
                    ? 'register'
                    : mode === 'register'
                    ? 'login'
                    : 'login'
                )
              }
              disabled={loading}
            >
              <Text style={styles.switchButtonText}>
                {mode === 'login'
                  ? 'Chưa có tài khoản? Đăng ký'
                  : mode === 'register'
                  ? 'Đã có tài khoản? Đăng nhập'
                  : 'Quay lại màn hình đăng nhập'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.note}>
              Bằng cách đăng ký, bạn đồng ý với các điều khoản sử dụng của ứng dụng
            </Text>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  content: {
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.light.icon,
    textAlign: 'center',
    marginBottom: 48,
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
  },
  icon: {
    fontSize: 64,
    color: '#fff',
    fontWeight: 'bold',
  },
  loginButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    marginBottom: 24,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: Colors.light.icon,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  input: {
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  switchButton: {
    marginTop: 12,
  },
  switchButtonText: {
    color: Colors.light.tint,
    fontSize: 14,
  },
  forgotPasswordButton: {
    marginTop: 8,
    marginBottom: 12,
  },
  forgotPasswordText: {
    color: Colors.light.tint,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});