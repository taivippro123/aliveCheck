import express from 'express';
import { checkIn, getCheckInStatus, getCheckInHistory } from '../controllers/checkInController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/checkin:
 *   post:
 *     summary: Điểm danh
 *     tags: [Check-in]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Điểm danh thành công
 *       401:
 *         description: Chưa đăng nhập
 *       500:
 *         description: Lỗi server
 */
router.post('/', authenticateToken, checkIn);

/**
 * @swagger
 * /api/checkin/status:
 *   get:
 *     summary: Lấy trạng thái điểm danh
 *     tags: [Check-in]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trạng thái điểm danh
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/status', authenticateToken, getCheckInStatus);

/**
 * @swagger
 * /api/checkin/history:
 *   get:
 *     summary: Lấy lịch sử điểm danh
 *     tags: [Check-in]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Số lượng bản ghi trả về
 *     responses:
 *       200:
 *         description: Lịch sử điểm danh
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/history', authenticateToken, getCheckInHistory);

export default router;
