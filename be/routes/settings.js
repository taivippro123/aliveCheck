import express from 'express';
import { updateSettings, getSettings, sendTestEmail, savePushToken } from '../controllers/settingsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Lấy cài đặt người dùng
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cài đặt người dùng
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/', authenticateToken, getSettings);

/**
 * @swagger
 * /api/settings:
 *   put:
 *     summary: Cập nhật cài đặt người dùng
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emergencyContact:
 *                 type: object
 *                 properties:
 *                   email:
 *                     type: string
 *                     example: relative@example.com
 *                   message:
 *                     type: string
 *                     example: Xin chào, đây là tin nhắn tự động...
 *               checkInInterval:
 *                 type: string
 *                 enum: [12h, 24h, 3d, 1w]
 *                 example: 24h
 *               emailNotificationDelay:
 *                 type: string
 *                 enum: [immediate, 1d]
 *                 example: immediate
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 */
router.put('/', authenticateToken, updateSettings);

/**
 * @swagger
 * /api/settings/test-email:
 *   post:
 *     summary: Gửi email test để kiểm tra tính năng
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Gửi email test thành công
 *       400:
 *         description: Chưa cấu hình email người thân
 *       401:
 *         description: Chưa đăng nhập
 *       500:
 *         description: Lỗi khi gửi email
 */
router.post('/test-email', authenticateToken, sendTestEmail);

/**
 * @swagger
 * /api/settings/push-token:
 *   post:
 *     summary: Lưu Expo push token cho thiết bị hiện tại
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expoPushToken:
 *                 type: string
 *                 example: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
 *     responses:
 *       200:
 *         description: Lưu token thành công
 *       400:
 *         description: Thiếu hoặc token không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       500:
 *         description: Lỗi server
 */
router.post('/push-token', authenticateToken, savePushToken);

export default router;
