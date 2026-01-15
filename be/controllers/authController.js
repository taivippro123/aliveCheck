import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendEmail } from '../config/email.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Helper to generate Access Token (short-lived)
const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' } // Access token: 7 ngày
  );
};

// Helper to generate Refresh Token (long-lived)
const generateRefreshToken = () => {
  return jwt.sign(
    {},
    process.env.JWT_SECRET,
    { expiresIn: '365d' } // Refresh token: 1 năm
  );
};

// Helper to generate both tokens
const generateTokens = async (user) => {
  const accessToken = generateToken(user);
  const refreshToken = generateRefreshToken();
  
  // Lưu refresh token vào database với thời gian hết hạn 1 năm
  user.refreshToken = refreshToken;
  user.refreshTokenExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  await user.save();
  
  return { accessToken, refreshToken };
};

// Helper to shape user response
const buildUserResponse = (user) => ({
  id: user._id,
  email: user.email,
  name: user.name,
  age: user.age,
  address: user.address,
  phone: user.phone,
  emergencyContact: user.emergencyContact,
  checkInInterval: user.checkInInterval,
  emailNotificationDelay: user.emailNotificationDelay,
  lastCheckIn: user.lastCheckIn,
  status: user.status,
});

// Đăng ký tài khoản: tạo user + gửi OTP qua email, chưa kích hoạt
export const register = async (req, res) => {
  try {
    const { name, age, address, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: 'Name, email và password là bắt buộc' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    let user = await User.findOne({ email: normalizedEmail });

    if (user && user.isEmailVerified) {
      return res
        .status(400)
        .json({ error: 'Email đã được đăng ký, vui lòng đăng nhập' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Tạo mã OTP 6 chữ số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

    if (!user) {
      user = new User({
        name,
        age,
        address,
        email: normalizedEmail,
        phone,
        passwordHash,
        isEmailVerified: false,
        emailVerificationCode: otp,
        emailVerificationExpiresAt: expiresAt,
      });
    } else {
      // Cập nhật lại thông tin + OTP nếu user tồn tại nhưng chưa verify
      user.name = name;
      user.age = age;
      user.address = address;
      user.phone = phone;
      user.passwordHash = passwordHash;
      user.isEmailVerified = false;
      user.emailVerificationCode = otp;
      user.emailVerificationExpiresAt = expiresAt;
    }

    await user.save();

    // Gửi email OTP
    const subject = 'Mã xác nhận đăng ký AliveCheck';
    const text = `Mã OTP của bạn là: ${otp}. Mã có hiệu lực trong 10 phút.`;
    const html = `
      <h2>Chào ${user.name},</h2>
      <p>Cảm ơn bạn đã đăng ký AliveCheck.</p>
      <p>Mã OTP của bạn là: <strong>${otp}</strong></p>
      <p>Mã có hiệu lực trong 10 phút.</p>
    `;

    const emailResult = await sendEmail(user.email, subject, text, html);

    if (!emailResult.success) {
      console.error('Failed to send OTP email:', emailResult.error);
      return res
        .status(500)
        .json({ error: 'Không gửi được email OTP, vui lòng thử lại sau' });
    }

    res.json({
      success: true,
      message: 'Đã gửi mã OTP tới email, vui lòng kiểm tra hộp thư',
    });
  } catch (error) {
    console.error('Register error:', error);
    res
      .status(500)
      .json({ error: 'Đăng ký thất bại', message: error.message });
  }
};

// Xác nhận email bằng OTP
export const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res
        .status(400)
        .json({ error: 'Email và mã OTP là bắt buộc' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    }

    if (user.isEmailVerified) {
      return res
        .status(400)
        .json({ error: 'Email đã được xác thực, vui lòng đăng nhập' });
    }

    if (
      !user.emailVerificationCode ||
      !user.emailVerificationExpiresAt ||
      user.emailVerificationCode !== code
    ) {
      return res.status(400).json({ error: 'Mã OTP không chính xác' });
    }

    if (user.emailVerificationExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Mã OTP đã hết hạn' });
    }

    user.isEmailVerified = true;
    user.emailVerificationCode = null;
    user.emailVerificationExpiresAt = null;

    await user.save();

    const { accessToken, refreshToken } = await generateTokens(user);

    res.json({
      success: true,
      token: accessToken,
      refreshToken,
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res
      .status(500)
      .json({ error: 'Xác thực email thất bại', message: error.message });
  }
};

// Đăng nhập bằng email + password (chỉ khi email đã verify)
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: 'Email và password là bắt buộc' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ error: 'Sai email hoặc mật khẩu' });
    }

    if (!user.isEmailVerified) {
      return res
        .status(400)
        .json({ error: 'Email chưa được xác thực, vui lòng kiểm tra email' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Sai email hoặc mật khẩu' });
    }

    const { accessToken, refreshToken } = await generateTokens(user);

    res.json({
      success: true,
      token: accessToken,
      refreshToken,
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    res
      .status(500)
      .json({ error: 'Đăng nhập thất bại', message: error.message });
  }
};

// Refresh access token using refresh token
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: providedRefreshToken } = req.body;

    if (!providedRefreshToken) {
      return res.status(400).json({ error: 'Refresh token là bắt buộc' });
    }

    // Tìm user có refresh token này
    const user = await User.findOne({
      refreshToken: providedRefreshToken,
      refreshTokenExpiresAt: { $gt: new Date() }, // Chưa hết hạn
    });

    if (!user) {
      return res.status(401).json({ error: 'Refresh token không hợp lệ hoặc đã hết hạn' });
    }

    // Verify refresh token
    try {
      jwt.verify(providedRefreshToken, process.env.JWT_SECRET);
    } catch (error) {
      // Token không hợp lệ, xóa khỏi database
      user.refreshToken = null;
      user.refreshTokenExpiresAt = null;
      await user.save();
      return res.status(401).json({ error: 'Refresh token không hợp lệ' });
    }

    // Tạo access token mới
    const accessToken = generateToken(user);

    res.json({
      success: true,
      token: accessToken,
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Làm mới token thất bại', message: error.message });
  }
};

// Quên mật khẩu: gửi OTP qua email
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email là bắt buộc' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ error: 'Email không tồn tại trong hệ thống' });
    }

    if (!user.isEmailVerified) {
      return res.status(400).json({ error: 'Email chưa được xác thực, vui lòng xác thực email trước' });
    }

    // Tạo mã OTP 6 chữ số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

    user.passwordResetCode = otp;
    user.passwordResetExpiresAt = expiresAt;
    await user.save();

    // Gửi email OTP
    const subject = 'Mã xác nhận đặt lại mật khẩu AliveCheck';
    const text = `Mã OTP để đặt lại mật khẩu của bạn là: ${otp}. Mã có hiệu lực trong 10 phút.`;
    const html = `
      <h2>Chào ${user.name},</h2>
      <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản AliveCheck.</p>
      <p>Mã OTP của bạn là: <strong>${otp}</strong></p>
      <p>Mã có hiệu lực trong 10 phút.</p>
      <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
    `;

    const emailResult = await sendEmail(user.email, subject, text, html);

    if (!emailResult.success) {
      console.error('Failed to send password reset OTP email:', emailResult.error);
      return res
        .status(500)
        .json({ error: 'Không gửi được email OTP, vui lòng thử lại sau' });
    }

    res.json({
      success: true,
      message: 'Đã gửi mã OTP tới email của bạn',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res
      .status(500)
      .json({ error: 'Gửi email đặt lại mật khẩu thất bại', message: error.message });
  }
};

// Đặt lại mật khẩu bằng OTP
export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res
        .status(400)
        .json({ error: 'Email, mã OTP và mật khẩu mới là bắt buộc' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    }

    if (!user.isEmailVerified) {
      return res
        .status(400)
        .json({ error: 'Email chưa được xác thực, vui lòng xác thực email trước' });
    }

    if (
      !user.passwordResetCode ||
      !user.passwordResetExpiresAt ||
      user.passwordResetCode !== code
    ) {
      return res.status(400).json({ error: 'Mã OTP không chính xác' });
    }

    if (user.passwordResetExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Mã OTP đã hết hạn' });
    }

    // Đặt lại mật khẩu
    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = passwordHash;
    user.passwordResetCode = null;
    user.passwordResetExpiresAt = null;
    await user.save();

    res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công, vui lòng đăng nhập lại',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res
      .status(500)
      .json({ error: 'Đặt lại mật khẩu thất bại', message: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-__v');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        ...buildUserResponse(user),
        checkInHistory: user.checkInHistory.slice(-10), // Last 10 check-ins
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile', message: error.message });
  }
};
