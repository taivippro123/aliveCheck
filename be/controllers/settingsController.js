import User from '../models/User.js';
import { sendEmail } from '../config/email.js';
import { buildUserInfoHtml } from '../services/emailService.js';

export const updateSettings = async (req, res) => {
  try {
    const { emergencyContact, checkInInterval, emailNotificationDelay } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update emergency contact
    if (emergencyContact !== undefined) {
      if (emergencyContact.email !== undefined) {
        user.emergencyContact.email = emergencyContact.email;
      }
      if (emergencyContact.message !== undefined) {
        user.emergencyContact.message = emergencyContact.message;
      }
      // Optional: special final message after 7 days without check-in
      if (emergencyContact.lastMessage7d !== undefined) {
        user.emergencyContact.lastMessage7d = emergencyContact.lastMessage7d;
      }
    }

    // Update check-in interval
    if (checkInInterval !== undefined) {
      if (!['12h', '24h', '3d', '1w'].includes(checkInInterval)) {
        return res.status(400).json({ error: 'Invalid check-in interval' });
      }
      user.checkInInterval = checkInInterval;
    }

    // Update email notification delay
    if (emailNotificationDelay !== undefined) {
      if (!['immediate', '1d'].includes(emailNotificationDelay)) {
        return res.status(400).json({ error: 'Invalid email notification delay' });
      }
      user.emailNotificationDelay = emailNotificationDelay;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: {
        emergencyContact: user.emergencyContact,
        checkInInterval: user.checkInInterval,
        emailNotificationDelay: user.emailNotificationDelay,
      },
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings', message: error.message });
  }
};

export const savePushToken = async (req, res) => {
  try {
    const { expoPushToken } = req.body;

    if (!expoPushToken) {
      return res.status(400).json({ error: 'Missing expoPushToken' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.expoPushToken = expoPushToken;
    await user.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Save push token error:', error);
    res.status(500).json({ error: 'Failed to save push token', message: error.message });
  }
};

export const getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      settings: {
        emergencyContact: user.emergencyContact,
        checkInInterval: user.checkInInterval,
        emailNotificationDelay: user.emailNotificationDelay,
      },
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings', message: error.message });
  }
};

export const sendTestEmail = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if emergency contact email is configured
    if (!user.emergencyContact?.email) {
      return res.status(400).json({ error: 'Vui lòng cấu hình email người thân trước khi gửi email test' });
    }

    // Prepare test email content
    const subject = `[TEST] Cảnh báo điểm danh từ ${user.name}`;
    const hoursSince = user.lastCheckIn 
      ? user.getHoursSinceLastCheckIn() 
      : null;
    const daysSince = user.lastCheckIn 
      ? user.getDaysSinceLastCheckIn() 
      : null;
    
    const timeInfo = hoursSince !== null 
      ? `${hoursSince} giờ (${daysSince} ngày)`
      : 'chưa điểm danh lần nào';

    const message = user.emergencyContact.message || 
      `Xin chào, đây là email TEST từ ứng dụng Alive Check. ${user.name} đã không điểm danh trong ${timeInfo}. Vui lòng liên hệ để đảm bảo an toàn.`;
    
    const htmlMessage = `
      <h2>[TEST] Cảnh báo điểm danh</h2>
      <p>Xin chào,</p>
      <p><strong style="color: blue;">Đây là email TEST để kiểm tra tính năng gửi email của ứng dụng Alive Check.</strong></p>
      <p>Đây là tin nhắn tự động từ ứng dụng <strong>Alive Check</strong>.</p>
      <p><strong>${user.name}</strong> đã không điểm danh trong <strong>${timeInfo}</strong>.</p>
      <p><strong>Nội dung tin nhắn:</strong></p>
      <p>${user.emergencyContact.message || 'Vui lòng liên hệ để đảm bảo an toàn.'}</p>
      ${buildUserInfoHtml(user)}
      ${user.lastCheckIn ? `<p>Thời gian điểm danh cuối: ${new Date(user.lastCheckIn).toLocaleString('vi-VN')}</p>` : '<p>Chưa có lịch sử điểm danh.</p>'}
      <hr>
      <p style="color: blue; font-weight: bold;">⚠️ Đây là email TEST - không phải cảnh báo thật!</p>
      <p style="color: gray; font-size: 12px;">Nếu bạn nhận được email này, có nghĩa là tính năng gửi email đang hoạt động bình thường.</p>
    `;

    // Send test email
    const result = await sendEmail(
      user.emergencyContact.email,
      subject,
      message,
      htmlMessage
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Đã gửi email test thành công',
      });
    } else {
      res.status(500).json({
        error: 'Không thể gửi email test',
        message: result.error || 'Lỗi không xác định',
      });
    }
  } catch (error) {
    console.error('Send test email error:', error);
    res.status(500).json({ error: 'Failed to send test email', message: error.message });
  }
};
