import express from 'express';
import { EventService } from '../services/eventService';
import { authMiddleware } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();
const eventService = new EventService();

// Create a new event
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      startDate,
      endDate,
      location,
      isVirtual,
      virtualLink,
      maxAttendees,
      tags,
      subjects,
      targetAudience,
      registrationDeadline,
      status
    } = req.body;

    const organizerId = req.user?.id;
    if (!organizerId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!title || !description || !type || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const event = await eventService.createEvent({
      title,
      description,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      location,
      isVirtual: isVirtual || false,
      virtualLink,
      maxAttendees,
      organizerId,
      tags: tags || [],
      subjects: subjects || [],
      targetAudience: targetAudience || [],
      registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : undefined,
      status: status || 'draft'
    });

    res.status(201).json({ event });
  } catch (error) {
    logger.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Get all events with filtering
router.get('/', authMiddleware, async (req, res) => {
  try {
    const {
      type,
      startDate,
      endDate,
      subjects,
      location,
      isVirtual,
      status,
      organizerId,
      limit = 50,
      offset = 0
    } = req.query;

    const filters: any = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    };

    if (type) filters.type = type;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    if (subjects) filters.subjects = Array.isArray(subjects) ? subjects : [subjects];
    if (location) filters.location = location;
    if (isVirtual !== undefined) filters.isVirtual = isVirtual === 'true';
    if (status) filters.status = status;
    if (organizerId) filters.organizerId = organizerId;

    const events = await eventService.getEvents(filters);
    res.json({ events });
  } catch (error) {
    logger.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get upcoming events
router.get('/upcoming', authMiddleware, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const userId = req.user?.id;
    
    const events = await eventService.getUpcomingEvents(userId, parseInt(limit as string));
    res.json({ events });
  } catch (error) {
    logger.error('Error fetching upcoming events:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
});

// Get a specific event
router.get('/:eventId', authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await eventService.getEvent(eventId);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({ event });
  } catch (error) {
    logger.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Update an event
router.put('/:eventId', authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // TODO: Add authorization check to ensure user is the organizer or has admin rights
    
    const updates = req.body;
    if (updates.startDate) updates.startDate = new Date(updates.startDate);
    if (updates.endDate) updates.endDate = new Date(updates.endDate);
    if (updates.registrationDeadline) updates.registrationDeadline = new Date(updates.registrationDeadline);

    const event = await eventService.updateEvent(eventId, updates);
    
    // Notify registered users of the update
    if (updates.title || updates.startDate || updates.endDate || updates.location) {
      await eventService.notifyEventUpdate(eventId, 'Event details have been updated. Please check the latest information.');
    }
    
    res.json({ event });
  } catch (error) {
    logger.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete an event
router.delete('/:eventId', authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // TODO: Add authorization check to ensure user is the organizer or has admin rights
    
    await eventService.deleteEvent(eventId);
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    logger.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Register for an event
router.post('/:eventId/register', authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const registration = await eventService.registerForEvent(eventId, userId);
    res.status(201).json({ registration });
  } catch (error) {
    logger.error('Error registering for event:', error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to register for event' });
    }
  }
});

// Cancel event registration
router.delete('/:eventId/register', authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await eventService.cancelRegistration(eventId, userId);
    res.json({ message: 'Registration cancelled successfully' });
  } catch (error) {
    logger.error('Error cancelling registration:', error);
    res.status(500).json({ error: 'Failed to cancel registration' });
  }
});

// Get event registrations (for organizers)
router.get('/:eventId/registrations', authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // TODO: Add authorization check to ensure user is the organizer or has admin rights
    
    const registrations = await eventService.getEventRegistrations(eventId);
    res.json({ registrations });
  } catch (error) {
    logger.error('Error fetching event registrations:', error);
    res.status(500).json({ error: 'Failed to fetch event registrations' });
  }
});

// Get user's registrations
router.get('/user/:userId/registrations', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?.id;
    
    if (!requestingUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Users can only view their own registrations unless they're admin
    if (userId !== requestingUserId) {
      // TODO: Add admin role check
      return res.status(403).json({ error: 'Access denied' });
    }

    const registrations = await eventService.getUserRegistrations(userId);
    res.json({ registrations });
  } catch (error) {
    logger.error('Error fetching user registrations:', error);
    res.status(500).json({ error: 'Failed to fetch user registrations' });
  }
});

// Send event reminders
router.post('/:eventId/reminders', authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { hoursBeforeEvent = 24 } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // TODO: Add authorization check to ensure user is the organizer or has admin rights
    
    await eventService.sendEventReminders(eventId, hoursBeforeEvent);
    res.json({ message: 'Reminders scheduled successfully' });
  } catch (error) {
    logger.error('Error sending reminders:', error);
    res.status(500).json({ error: 'Failed to send reminders' });
  }
});

// Get event analytics
router.get('/:eventId/analytics', authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // TODO: Add authorization check to ensure user is the organizer or has admin rights
    
    const analytics = await eventService.getEventAnalytics(eventId);
    res.json({ analytics });
  } catch (error) {
    logger.error('Error fetching event analytics:', error);
    res.status(500).json({ error: 'Failed to fetch event analytics' });
  }
});

// Generate calendar event data
router.get('/:eventId/calendar', authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;
    const calendarEvent = await eventService.generateCalendarEvent(eventId);
    res.json({ calendarEvent });
  } catch (error) {
    logger.error('Error generating calendar event:', error);
    res.status(500).json({ error: 'Failed to generate calendar event' });
  }
});

export default router;