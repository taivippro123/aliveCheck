import User from '../models/User.js';
import { sendEmail } from '../config/email.js';

export const buildUserInfoHtml = (user) => {
  const ageText =
    user.age !== undefined && user.age !== null ? user.age : 'Không cung cấp';
  const addressText = user.address || 'Không cung cấp';
  const phoneText = user.phone || 'Không cung cấp';

  return `
      <p><strong>Thông tin người dùng:</strong></p>
      <p>Họ tên: ${user.name}</p>
      <p>Tuổi: ${ageText}</p>
      <p>Địa chỉ: ${addressText}</p>
      <p>Số điện thoại: ${phoneText}</p>
      <p>Email: ${user.email}</p>
    `;
};

export const checkAndSendEmails = async () => {
  try {
    const users = await User.find({
      'emergencyContact.email': { $ne: null },
    });

    const now = new Date();

    for (const user of users) {
      // Skip if user has never checked in (they might be new)
      // But if they've been registered for more than their check-in interval, we should notify
      if (!user.lastCheckIn) {
        const accountAgeHours = Math.floor(
          (now - new Date(user.createdAt)) / (1000 * 60 * 60)
        );
        const intervals = {
          '12h': 12,
          '24h': 24,
          '3d': 72,
          '1w': 168,
        };
        // Only notify if account is older than check-in interval
        if (accountAgeHours < intervals[user.checkInInterval]) {
          continue;
        }
        // User has never checked in and account is old enough - treat as missed check-in
        const daysSince = Math.floor(accountAgeHours / 24);
        const hoursSince = accountAgeHours;
        
        // Determine if we should send email based on notification delay
        let shouldSendEmail = false;
        const emailDelayHours = user.emailNotificationDelay === 'immediate' ? 0 : 24;

        if (hoursSince >= emailDelayHours) {
          shouldSendEmail = true;
        }

        // Check if we already sent an email recently (prevent spam)
        if (user.lastEmailSent) {
          const hoursSinceLastEmail = Math.floor(
            (now - new Date(user.lastEmailSent)) / (1000 * 60 * 60)
          );
          if (hoursSinceLastEmail < 12) {
            shouldSendEmail = false;
          }
        }

        if (shouldSendEmail) {
          let subject, message, htmlMessage;
          
          if (daysSince >= 7) {
            user.status = 'final';
            subject = `[QUAN TRỌNG] Tin nhắn cuối từ ${user.name}`;
            const finalMessage =
              user.emergencyContact.lastMessage7d ||
              user.emergencyContact.message ||
              `Xin chào, đây là tin nhắn tự động từ ứng dụng Alive Check. ${user.name} đã không điểm danh trong ${daysSince} ngày kể từ khi đăng ký. Đây là tin nhắn cuối cùng.`;
            message = finalMessage;
            htmlMessage = `
              <h2>Tin nhắn cuối cùng</h2>
              <p>Xin chào,</p>
              <p>Đây là tin nhắn tự động từ ứng dụng <strong>Alive Check</strong>.</p>
              <p><strong>${user.name}</strong> đã không điểm danh trong <strong>${daysSince} ngày</strong> kể từ khi đăng ký.</p>
              <p><strong>Nội dung tin nhắn:</strong></p>
              <p>${finalMessage}</p>
              ${buildUserInfoHtml(user)}
              <hr>
              <p style="color: red; font-weight: bold;">Đây là tin nhắn tự động. Vui lòng kiểm tra ngay!</p>
            `;
          } else {
            user.status = daysSince >= 3 ? 'critical' : 'warning';
            subject = `[CẢNH BÁO] ${user.name} chưa điểm danh`;
            message = user.emergencyContact.message || 
              `Xin chào, đây là tin nhắn tự động từ ứng dụng Alive Check. ${user.name} đã không điểm danh trong ${hoursSince} giờ (${daysSince} ngày) kể từ khi đăng ký. Vui lòng liên hệ để đảm bảo an toàn.`;
            htmlMessage = `
              <h2>Cảnh báo điểm danh</h2>
              <p>Xin chào,</p>
              <p>Đây là tin nhắn tự động từ ứng dụng <strong>Alive Check</strong>.</p>
              <p><strong>${user.name}</strong> đã không điểm danh trong <strong>${hoursSince} giờ</strong> (${daysSince} ngày) kể từ khi đăng ký.</p>
              <p><strong>Nội dung tin nhắn:</strong></p>
              <p>${user.emergencyContact.message || 'Vui lòng liên hệ để đảm bảo an toàn.'}</p>
              ${buildUserInfoHtml(user)}
              <hr>
              <p style="color: orange;">Đây là tin nhắn tự động.</p>
            `;
          }

          const result = await sendEmail(
            user.emergencyContact.email,
            subject,
            message,
            htmlMessage
          );

          if (result.success) {
            user.lastEmailSent = now;
            await user.save();
            console.log(`Email sent to ${user.emergencyContact.email} for user ${user.name} (never checked in)`);
          }
        }
        continue;
      }

      const daysSince = user.getDaysSinceLastCheckIn();
      const hoursSince = user.getHoursSinceLastCheckIn();

      // Check if user needs check-in (has missed their check-in window)
      if (!user.needsCheckIn()) continue;

      // Determine if we should send email based on notification delay
      let shouldSendEmail = false;
      const emailDelayHours = user.emailNotificationDelay === 'immediate' ? 0 : 24;

      if (hoursSince >= emailDelayHours) {
        shouldSendEmail = true;
      }

      // Check if we already sent an email recently (prevent spam)
      if (user.lastEmailSent) {
        const hoursSinceLastEmail = Math.floor(
          (now - new Date(user.lastEmailSent)) / (1000 * 60 * 60)
        );
        // Don't send if we sent an email in the last 12 hours
        if (hoursSinceLastEmail < 12) {
          shouldSendEmail = false;
        }
      }

      if (!shouldSendEmail) continue;

      // Determine message based on days since last check-in
      let subject, message, htmlMessage;

      if (daysSince >= 7) {
        // Final message after 7 days
        user.status = 'final';
        subject = `[QUAN TRỌNG] Tin nhắn cuối từ ${user.name}`;
        const finalMessage =
          user.emergencyContact.lastMessage7d ||
          user.emergencyContact.message ||
          `Xin chào, đây là tin nhắn tự động từ ứng dụng Alive Check. ${user.name} đã không điểm danh trong ${daysSince} ngày. Đây là tin nhắn cuối cùng. Vui lòng liên hệ ngay với ${user.name} hoặc các cơ quan chức năng nếu cần thiết.`;
        message = finalMessage;
        htmlMessage = `
          <h2>Tin nhắn cuối cùng</h2>
          <p>Xin chào,</p>
          <p>Đây là tin nhắn tự động từ ứng dụng <strong>Alive Check</strong>.</p>
          <p><strong>${user.name}</strong> đã không điểm danh trong <strong>${daysSince} ngày</strong>.</p>
          <p><strong>Nội dung tin nhắn:</strong></p>
          <p>${finalMessage}</p>
          ${buildUserInfoHtml(user)}
          <p>Thời gian điểm danh cuối: ${new Date(user.lastCheckIn).toLocaleString('vi-VN')}</p>
          <hr>
          <p style="color: red; font-weight: bold;">Đây là tin nhắn tự động. Vui lòng kiểm tra ngay!</p>
        `;
      } else {
        // Regular warning message
        user.status = daysSince >= 3 ? 'critical' : 'warning';
        subject = `[CẢNH BÁO] ${user.name} chưa điểm danh`;
        message = user.emergencyContact.message || 
          `Xin chào, đây là tin nhắn tự động từ ứng dụng Alive Check. ${user.name} đã không điểm danh trong ${hoursSince} giờ (${daysSince} ngày). Vui lòng liên hệ để đảm bảo an toàn.`;
        htmlMessage = `
          <h2>Cảnh báo điểm danh</h2>
          <p>Xin chào,</p>
          <p>Đây là tin nhắn tự động từ ứng dụng <strong>Alive Check</strong>.</p>
          <p><strong>${user.name}</strong> đã không điểm danh trong <strong>${hoursSince} giờ</strong> (${daysSince} ngày).</p>
          <p><strong>Nội dung tin nhắn:</strong></p>
          <p>${user.emergencyContact.message || 'Vui lòng liên hệ để đảm bảo an toàn.'}</p>
          ${buildUserInfoHtml(user)}
          <p>Thời gian điểm danh cuối: ${new Date(user.lastCheckIn).toLocaleString('vi-VN')}</p>
          <hr>
          <p style="color: orange;">Đây là tin nhắn tự động.</p>
        `;
      }

      // Send email
      const result = await sendEmail(
        user.emergencyContact.email,
        subject,
        message,
        htmlMessage
      );

      if (result.success) {
        user.lastEmailSent = now;
        await user.save();
        console.log(`Email sent to ${user.emergencyContact.email} for user ${user.name}`);
      } else {
        console.error(`Failed to send email to ${user.emergencyContact.email}:`, result.error);
      }
    }
  } catch (error) {
    console.error('Error in checkAndSendEmails:', error);
  }
};
