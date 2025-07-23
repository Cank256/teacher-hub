import express from 'express';
import { GamificationService } from '../services/gamificationService';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();
const gamificationService = new GamificationService();

// Get all available badges
router.get('/badges', authMiddleware, async (req, res) => {
  try {
    const badges = await gamificationService.getBadges();
    res.json({ badges });
  } catch (error) {
    logger.error('Error fetching badges:', error);
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

// Get user's earned badges
router.get('/badges/user/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const userBadges = await gamificationService.getUserBadges(userId);
    res.json({ badges: userBadges });
  } catch (error) {
    logger.error('Error fetching user badges:', error);
    res.status(500).json({ error: 'Failed to fetch user badges' });
  }
});

// Get leaderboard
router.get('/leaderboard', authMiddleware, async (req, res) => {
  try {
    const { timeframe = 'all_time', limit = 50 } = req.query;
    const leaderboard = await gamificationService.getLeaderboard(
      timeframe as 'weekly' | 'monthly' | 'all_time',
      parseInt(limit as string)
    );
    res.json({ leaderboard });
  } catch (error) {
    logger.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get user's rank
router.get('/rank/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeframe = 'all_time' } = req.query;
    const rank = await gamificationService.getUserRank(
      userId,
      timeframe as 'weekly' | 'monthly' | 'all_time'
    );
    res.json({ rank });
  } catch (error) {
    logger.error('Error fetching user rank:', error);
    res.status(500).json({ error: 'Failed to fetch user rank' });
  }
});

// Create peer nomination
router.post('/nominations', authMiddleware, async (req, res) => {
  try {
    const { nomineeId, category, reason } = req.body;
    const nominatorId = req.user?.userId;

    if (!nominatorId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!nomineeId || !category || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (nominatorId === nomineeId) {
      return res.status(400).json({ error: 'Cannot nominate yourself' });
    }

    const nomination = await gamificationService.createPeerNomination({
      nominatorId,
      nomineeId,
      category,
      reason
    });

    res.status(201).json({ nomination });
  } catch (error) {
    logger.error('Error creating peer nomination:', error);
    res.status(500).json({ error: 'Failed to create peer nomination' });
  }
});

// Get peer nominations for a user
router.get('/nominations/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { type = 'received' } = req.query;
    
    const nominations = await gamificationService.getPeerNominations(
      userId,
      type as 'sent' | 'received'
    );
    
    res.json({ nominations });
  } catch (error) {
    logger.error('Error fetching peer nominations:', error);
    res.status(500).json({ error: 'Failed to fetch peer nominations' });
  }
});

// Review peer nomination (admin/moderator only)
router.put('/nominations/:nominationId/review', authMiddleware, async (req, res) => {
  try {
    const { nominationId } = req.params;
    const { approved } = req.body;
    const reviewerId = req.user?.userId;

    if (!reviewerId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // TODO: Add role-based authorization check for moderators/admins
    
    await gamificationService.reviewPeerNomination(nominationId, reviewerId, approved);
    
    res.json({ message: 'Nomination reviewed successfully' });
  } catch (error) {
    logger.error('Error reviewing peer nomination:', error);
    res.status(500).json({ error: 'Failed to review peer nomination' });
  }
});

// Get user achievements
router.get('/achievements/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;
    
    const achievements = await gamificationService.getUserAchievements(
      userId,
      parseInt(limit as string)
    );
    
    res.json({ achievements });
  } catch (error) {
    logger.error('Error fetching user achievements:', error);
    res.status(500).json({ error: 'Failed to fetch user achievements' });
  }
});

// Award points to user (internal API)
router.post('/points/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { points, reason } = req.body;

    if (!points || !reason) {
      return res.status(400).json({ error: 'Points and reason are required' });
    }

    await gamificationService.addUserPoints(userId, points, reason);
    
    // Check for new badges
    const newBadges = await gamificationService.checkAndAwardBadges(
      userId,
      'points_awarded',
      points
    );

    res.json({ 
      message: 'Points awarded successfully',
      newBadges: newBadges.length > 0 ? newBadges : undefined
    });
  } catch (error) {
    logger.error('Error awarding points:', error);
    res.status(500).json({ error: 'Failed to award points' });
  }
});

export default router;