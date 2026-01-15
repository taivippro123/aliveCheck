import cron from 'node-cron';
import { checkAndSendEmails } from '../services/emailService.js';
import User from '../models/User.js';
import { sendPushNotification } from '../services/pushService.js';

// Helper: tính nextCheckIn từ lastCheckIn + checkInInterval
const getNextCheckInTime = (user) => {
  if (!user.lastCheckIn) return null;

  const last = new Date(user.lastCheckIn);
  const intervals = {
    '12h': 12 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '3d': 3 * 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
  };

  const ms = intervals[user.checkInInterval] || intervals['24h'];
  return new Date(last.getTime() + ms);
};

// Gửi push khi đến giờ (hoặc vừa quá) nextCheckIn
const checkAndSendPushReminders = async () => {
  const now = new Date();

  // Lấy user có token push
  const users = await User.find({
    expoPushToken: { $ne: null },
    lastCheckIn: { $ne: null },
  });

  for (const user of users) {
    const next = getNextCheckInTime(user);
    if (!next) continue;

    // Nếu chưa đến giờ thì bỏ qua
    if (next > now) continue;

    // Nếu đã gửi push sau lần điểm danh cuối rồi thì bỏ qua (tránh spam)
    if (user.lastPushNotifiedAt && user.lastPushNotifiedAt >= next) {
      continue;
    }

    const title = 'Alive Check - Đến giờ điểm danh';
    const body =
      'Đã đến thời điểm điểm danh tiếp theo, vui lòng mở ứng dụng Alive Check và bấm nút Điểm danh để xác nhận bạn vẫn ổn.';

    const result = await sendPushNotification(user.expoPushToken, title, body);
    if (result.success) {
      user.lastPushNotifiedAt = now;
      await user.save();
      console.log(`Sent push reminder to user ${user._id}`);
    } else {
      console.error(`Failed to send push to user ${user._id}:`, result.error);
    }
  }
};

// Run every hour to check for missed check-ins + push reminders
export const startEmailJob = () => {
  // Run at minute 0 of every hour (e.g., 1:00, 2:00, 3:00...)
  cron.schedule('0 * * * *', async () => {
    console.log('Running email & push check job at', new Date().toISOString());
    await checkAndSendEmails();
    await checkAndSendPushReminders();
  });

  console.log('Email & push check job started - running every hour');
};
