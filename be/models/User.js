import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  // Personal information
  name: {
    type: String,
    required: true,
    trim: true,
  },
  age: {
    type: Number,
    min: 0,
  },
  address: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  // Account information
  googleId: {
    type: String,
    default: null,
    sparse: true, // Cho phép nhiều giá trị null, nhưng unique khi có giá trị
    unique: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationCode: {
    type: String,
    default: null,
  },
  emailVerificationExpiresAt: {
    type: Date,
    default: null,
  },
  // Password reset
  passwordResetCode: {
    type: String,
    default: null,
  },
  passwordResetExpiresAt: {
    type: Date,
    default: null,
  },
  // Emergency contact settings
  emergencyContact: {
    email: {
      type: String,
      default: null,
    },
    message: {
      type: String,
      default: null,
    },
    // Optional: special final message after 7 days without check-in
    // Nếu được cấu hình, tin nhắn này sẽ được dùng cho email "Tin nhắn cuối cùng"
    // khi user không điểm danh trong >= 7 ngày nhưng vẫn còn trong hệ thống.
    lastMessage7d: {
      type: String,
      default: null,
    },
  },
  // Check-in settings
  checkInInterval: {
    type: String,
    enum: ['12h', '24h', '3d', '1w'], // 12 hours, 24 hours, 3 days, 1 week
    default: '24h',
  },
  // Email notification delay when missing check-in
  emailNotificationDelay: {
    type: String,
    enum: ['immediate', '1d'], // immediately or after 1 day
    default: 'immediate',
  },
  // Check-in history
  lastCheckIn: {
    type: Date,
    default: null,
  },
  checkInHistory: [
    {
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  // Status tracking
  status: {
    type: String,
    enum: ['active', 'warning', 'critical', 'inactive'],
    default: 'active',
  },
  // Last email sent timestamp to prevent spam
  lastEmailSent: {
    type: Date,
    default: null,
  },
  // Push notification
  expoPushToken: {
    type: String,
    default: null,
  },
  lastPushNotifiedAt: {
    // Lần cuối gửi push nhắc điểm danh (dùng để tránh gửi trùng)
    type: Date,
    default: null,
  },
  // Refresh token for long-term authentication
  refreshToken: {
    type: String,
    default: null,
  },
  refreshTokenExpiresAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update updatedAt before saving
userSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Helper method to check if user needs to check in
userSchema.methods.needsCheckIn = function () {
  if (!this.lastCheckIn) return true;

  const now = new Date();
  const lastCheckIn = new Date(this.lastCheckIn);
  const diffMs = now - lastCheckIn;

  const intervals = {
    '12h': 12 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '3d': 3 * 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
  };

  return diffMs >= intervals[this.checkInInterval];
};

// Helper method to get hours since last check-in
userSchema.methods.getHoursSinceLastCheckIn = function () {
  if (!this.lastCheckIn) return null;
  const now = new Date();
  const lastCheckIn = new Date(this.lastCheckIn);
  return Math.floor((now - lastCheckIn) / (1000 * 60 * 60));
};

// Helper method to get days since last check-in
userSchema.methods.getDaysSinceLastCheckIn = function () {
  if (!this.lastCheckIn) return null;
  const now = new Date();
  const lastCheckIn = new Date(this.lastCheckIn);
  return Math.floor((now - lastCheckIn) / (1000 * 60 * 60 * 24));
};

const User = mongoose.model('User', userSchema);

export default User;
