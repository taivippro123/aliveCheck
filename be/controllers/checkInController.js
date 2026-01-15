import User from '../models/User.js';

const getNextCheckInTime = (lastCheckIn, interval) => {
  if (!lastCheckIn) return null;

  const base = new Date(lastCheckIn);
  const intervalsMs = {
    '12h': 12 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '3d': 3 * 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
  };

  const delta = intervalsMs[interval] ?? intervalsMs['24h'];
  return new Date(base.getTime() + delta);
};

export const checkIn = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update last check-in
    user.lastCheckIn = new Date();
    user.status = 'active';
    user.checkInHistory.push({ timestamp: new Date() });

    // Keep only last 100 check-ins
    if (user.checkInHistory.length > 100) {
      user.checkInHistory = user.checkInHistory.slice(-100);
    }

    await user.save();

    const nextCheckIn = getNextCheckInTime(user.lastCheckIn, user.checkInInterval);

    res.json({
      success: true,
      message: 'Check-in successful',
      lastCheckIn: user.lastCheckIn,
      nextCheckIn,
      status: user.status,
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Check-in failed', message: error.message });
  }
};

export const getCheckInStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const needsCheckIn = user.needsCheckIn();
    const hoursSince = user.getHoursSinceLastCheckIn();
    const daysSince = user.getDaysSinceLastCheckIn();
    const nextCheckIn = getNextCheckInTime(user.lastCheckIn, user.checkInInterval);

    res.json({
      success: true,
      needsCheckIn,
      lastCheckIn: user.lastCheckIn,
      nextCheckIn,
      hoursSinceLastCheckIn: hoursSince,
      daysSinceLastCheckIn: daysSince,
      checkInInterval: user.checkInInterval,
      status: user.status,
    });
  } catch (error) {
    console.error('Get check-in status error:', error);
    res.status(500).json({ error: 'Failed to get check-in status', message: error.message });
  }
};

export const getCheckInHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Chỉ lấy lịch sử trong 2 tuần (14 ngày) gần nhất
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const history = user.checkInHistory
      .filter((checkIn) => {
        const checkInDate = new Date(checkIn.timestamp);
        return checkInDate >= twoWeeksAgo;
      })
      .map((checkIn) => ({
        timestamp: checkIn.timestamp,
      }))
      .reverse(); // Mới nhất lên đầu

    res.json({
      success: true,
      history,
      total: user.checkInHistory.length, // Tổng số bản ghi trong database
    });
  } catch (error) {
    console.error('Get check-in history error:', error);
    res.status(500).json({ error: 'Failed to get check-in history', message: error.message });
  }
};
