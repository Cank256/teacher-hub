// Mock the logger first
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

jest.mock('../../utils/logger', () => mockLogger);

import { EventService } from '../eventService';

describe('Event Management Workflow Integration Tests', () => {
  let eventService: EventService;

  beforeEach(() => {
    eventService = new EventService();
    jest.clearAllMocks();
  });

  describe('Complete event lifecycle', () => {
    it('should handle complete event creation and registration workflow', async () => {
      // Step 1: Create an event
      const eventData = {
        title: 'Mathematics Teaching Workshop',
        description: 'Learn advanced mathematics teaching techniques for primary school',
        type: 'workshop' as const,
        startDate: new Date('2025-04-15T09:00:00Z'),
        endDate: new Date('2025-04-15T17:00:00Z'),
        location: 'Kampala Teachers Center',
        isVirtual: false,
        maxAttendees: 30,
        organizerId: 'organizer123',
        tags: ['mathematics', 'primary', 'teaching'],
        subjects: ['Mathematics'],
        targetAudience: ['primary_teachers'],

        status: 'published' as const
      };

      const event = await eventService.createEvent(eventData);
      
      expect(event).toMatchObject({
        title: 'Mathematics Teaching Workshop',
        type: 'workshop',
        maxAttendees: 30,
        currentAttendees: 0,
        status: 'published'
      });

      // Step 2: Mock getEvent to return the created event for registration
      jest.spyOn(eventService, 'getEvent').mockResolvedValue(event);
      jest.spyOn(eventService, 'scheduleNotification').mockResolvedValue({
        id: 'not123',
        eventId: event.id,
        userId: 'teacher1',
        type: 'registration_confirmation',
        message: 'Registration confirmed',
        scheduledFor: new Date(),
        sent: false
      });

      // Step 3: Register multiple users
      const teacher1Registration = await eventService.registerForEvent(event.id, 'teacher1');
      const teacher2Registration = await eventService.registerForEvent(event.id, 'teacher2');

      expect(teacher1Registration.status).toBe('registered');
      expect(teacher2Registration.status).toBe('registered');

      // Step 4: Generate calendar event
      const calendarEvent = await eventService.generateCalendarEvent(event.id);
      
      expect(calendarEvent).toEqual({
        title: 'Mathematics Teaching Workshop',
        start: event.startDate,
        end: event.endDate,
        description: event.description,
        location: 'Kampala Teachers Center',
        url: undefined
      });

      // Step 5: Schedule reminders
      jest.spyOn(eventService, 'getEventRegistrations').mockResolvedValue([
        teacher1Registration,
        teacher2Registration
      ]);

      await eventService.sendEventReminders(event.id, 24);

      // Verify that the workflow completed successfully
      expect(mockLogger.info).toHaveBeenCalledWith(`Event created: ${event.id}`);
      expect(mockLogger.info).toHaveBeenCalledWith(`User teacher1 registered for event ${event.id}`);
      expect(mockLogger.info).toHaveBeenCalledWith(`User teacher2 registered for event ${event.id}`);
      expect(mockLogger.info).toHaveBeenCalledWith(`Reminders scheduled for event ${event.id}`);
    });

    it('should handle event updates and notifications', async () => {
      // Create initial event
      const eventData = {
        title: 'Science Workshop',
        description: 'Basic science teaching',
        type: 'workshop' as const,
        startDate: new Date('2024-05-15T10:00:00Z'),
        endDate: new Date('2024-05-15T16:00:00Z'),
        isVirtual: true,
        organizerId: 'organizer456',
        tags: ['science'],
        subjects: ['Science'],
        targetAudience: ['secondary_teachers'],
        status: 'published' as const
      };

      const event = await eventService.createEvent(eventData);

      // Update the event
      const updates = {
        title: 'Advanced Science Workshop',
        startDate: new Date('2024-05-16T10:00:00Z'),
        virtualLink: 'https://zoom.us/meeting/updated'
      };

      const updatedEvent = await eventService.updateEvent(event.id, updates);

      expect(updatedEvent.title).toBe('Advanced Science Workshop');
      expect(updatedEvent.startDate).toEqual(new Date('2024-05-16T10:00:00Z'));

      // Mock registrations for notification
      jest.spyOn(eventService, 'getEventRegistrations').mockResolvedValue([
        {
          id: 'reg1',
          eventId: event.id,
          userId: 'teacher1',
          registeredAt: new Date(),
          status: 'registered'
        }
      ]);

      // Send update notification
      await eventService.notifyEventUpdate(event.id, 'Event has been updated with new details');

      expect(mockLogger.info).toHaveBeenCalledWith(`Update notifications sent for event ${event.id}`);
    });

    it('should handle event analytics calculation', async () => {
      const eventId = 'evt_analytics_test';

      // Mock various registration statuses
      const mockRegistrations = [
        {
          id: 'reg1',
          eventId,
          userId: 'user1',
          registeredAt: new Date('2024-04-01'),
          status: 'attended' as const
        },
        {
          id: 'reg2',
          eventId,
          userId: 'user2',
          registeredAt: new Date('2024-04-02'),
          status: 'attended' as const
        },
        {
          id: 'reg3',
          eventId,
          userId: 'user3',
          registeredAt: new Date('2024-04-03'),
          status: 'no_show' as const
        },
        {
          id: 'reg4',
          eventId,
          userId: 'user4',
          registeredAt: new Date('2024-04-04'),
          status: 'cancelled' as const
        },
        {
          id: 'reg5',
          eventId,
          userId: 'user5',
          registeredAt: new Date('2024-04-05'),
          status: 'registered' as const
        }
      ];

      jest.spyOn(eventService, 'getEventRegistrations').mockResolvedValue(mockRegistrations);

      const analytics = await eventService.getEventAnalytics(eventId);

      expect(analytics).toEqual({
        totalRegistrations: 5,
        attendanceRate: 40, // 2 out of 5 attended
        registrationsByDate: [],
        attendeesByStatus: {
          attended: 2,
          no_show: 1,
          cancelled: 1,
          registered: 1
        }
      });
    });

    it('should handle virtual event workflow', async () => {
      // Create virtual event
      const virtualEventData = {
        title: 'Online Teaching Strategies',
        description: 'Learn effective online teaching methods',
        type: 'webinar' as const,
        startDate: new Date('2024-06-15T14:00:00Z'),
        endDate: new Date('2024-06-15T16:00:00Z'),
        isVirtual: true,
        virtualLink: 'https://zoom.us/meeting/virtual123',
        maxAttendees: 100,
        organizerId: 'organizer789',
        tags: ['online', 'teaching', 'digital'],
        subjects: ['General'],
        targetAudience: ['all_teachers'],
        status: 'published' as const
      };

      const virtualEvent = await eventService.createEvent(virtualEventData);

      expect(virtualEvent.isVirtual).toBe(true);
      expect(virtualEvent.virtualLink).toBe('https://zoom.us/meeting/virtual123');

      // Mock getEvent for calendar generation
      jest.spyOn(eventService, 'getEvent').mockResolvedValue(virtualEvent);

      // Generate calendar event for virtual event
      const calendarEvent = await eventService.generateCalendarEvent(virtualEvent.id);

      expect(calendarEvent.location).toBe('Virtual Event');
      expect(calendarEvent.url).toBe('https://zoom.us/meeting/virtual123');
    });

    it('should handle registration limits correctly', async () => {
      // Create event with limited capacity
      const limitedEvent = {
        title: 'Small Group Workshop',
        description: 'Intensive small group session',
        type: 'workshop' as const,
        startDate: new Date('2024-07-15T10:00:00Z'),
        endDate: new Date('2024-07-15T12:00:00Z'),
        isVirtual: false,
        location: 'Small Conference Room',
        maxAttendees: 2, // Very limited capacity
        organizerId: 'organizer999',
        tags: ['intensive'],
        subjects: ['General'],
        targetAudience: ['experienced_teachers'],
        status: 'published' as const
      };

      const event = await eventService.createEvent(limitedEvent);

      // Mock getEvent to return event with current attendees
      const mockEventWithAttendees = {
        ...event,
        currentAttendees: 2 // Event is full
      };

      jest.spyOn(eventService, 'getEvent').mockResolvedValue(mockEventWithAttendees);

      // Try to register when event is full
      await expect(eventService.registerForEvent(event.id, 'teacher_late'))
        .rejects.toThrow('Event is full');
    });
  });

  describe('Error scenarios', () => {
    it('should handle registration after deadline', async () => {
      const pastDeadlineEvent = {
        title: 'Past Deadline Event',
        description: 'Event with past registration deadline',
        type: 'meeting' as const,
        startDate: new Date('2024-08-15T10:00:00Z'),
        endDate: new Date('2024-08-15T11:00:00Z'),
        isVirtual: true,
        organizerId: 'organizer111',
        tags: ['test'],
        subjects: ['General'],
        targetAudience: ['all_teachers'],
        registrationDeadline: new Date('2023-01-01T00:00:00Z'), // Past deadline
        status: 'published' as const
      };

      const event = await eventService.createEvent(pastDeadlineEvent);
      jest.spyOn(eventService, 'getEvent').mockResolvedValue(event);

      await expect(eventService.registerForEvent(event.id, 'teacher_late'))
        .rejects.toThrow('Registration deadline has passed');
    });

    it('should handle non-existent event operations', async () => {
      jest.spyOn(eventService, 'getEvent').mockResolvedValue(null);

      await expect(eventService.registerForEvent('nonexistent', 'teacher123'))
        .rejects.toThrow('Event not found');

      await expect(eventService.generateCalendarEvent('nonexistent'))
        .rejects.toThrow('Failed to generate calendar event');
    });
  });
});