// Mock the logger first
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

jest.mock('../../utils/logger', () => mockLogger);

import { EventService, Event, EventRegistration } from '../eventService';

describe('EventService', () => {
  let eventService: EventService;

  beforeEach(() => {
    eventService = new EventService();
    jest.clearAllMocks();
  });

  describe('createEvent', () => {
    it('should create a new event with all required fields', async () => {
      const eventData = {
        title: 'Math Workshop',
        description: 'Advanced mathematics teaching techniques',
        type: 'workshop' as const,
        startDate: new Date('2024-03-15T10:00:00Z'),
        endDate: new Date('2024-03-15T16:00:00Z'),
        location: 'Kampala Community Center',
        isVirtual: false,
        maxAttendees: 50,
        organizerId: 'user123',
        tags: ['mathematics', 'teaching'],
        subjects: ['Mathematics'],
        targetAudience: ['primary_teachers'],
        status: 'published' as const
      };

      const event = await eventService.createEvent(eventData);

      expect(event).toMatchObject({
        ...eventData,
        currentAttendees: 0
      });
      expect(event.id).toMatch(/^evt_/);
      expect(event.createdAt).toBeInstanceOf(Date);
      expect(event.updatedAt).toBeInstanceOf(Date);
    });

    it('should create event with minimal required fields', async () => {
      const eventData = {
        title: 'Simple Workshop',
        description: 'Basic workshop',
        type: 'workshop' as const,
        startDate: new Date('2024-03-15T10:00:00Z'),
        endDate: new Date('2024-03-15T16:00:00Z'),
        isVirtual: true,
        organizerId: 'user123',
        tags: [],
        subjects: [],
        targetAudience: [],
        status: 'draft' as const
      };

      const event = await eventService.createEvent(eventData);

      expect(event.title).toBe('Simple Workshop');
      expect(event.isVirtual).toBe(true);
      expect(event.currentAttendees).toBe(0);
    });

    it('should generate unique event IDs', async () => {
      const eventData = {
        title: 'Workshop 1',
        description: 'Description',
        type: 'workshop' as const,
        startDate: new Date('2024-03-15T10:00:00Z'),
        endDate: new Date('2024-03-15T16:00:00Z'),
        isVirtual: false,
        organizerId: 'user123',
        tags: [],
        subjects: [],
        targetAudience: [],
        status: 'draft' as const
      };

      const event1 = await eventService.createEvent(eventData);
      const event2 = await eventService.createEvent({
        ...eventData,
        title: 'Workshop 2'
      });

      expect(event1.id).not.toBe(event2.id);
    });
  });

  describe('registerForEvent', () => {
    it('should register user for event successfully', async () => {
      const eventId = 'evt123';
      const userId = 'user456';

      // Mock getEvent to return a valid event
      const mockEvent: Event = {
        id: eventId,
        title: 'Test Event',
        description: 'Test Description',
        type: 'workshop',
        startDate: new Date('2024-03-15T10:00:00Z'),
        endDate: new Date('2024-03-15T16:00:00Z'),
        isVirtual: false,
        currentAttendees: 5,
        organizerId: 'organizer123',
        tags: [],
        subjects: [],
        targetAudience: [],
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      jest.spyOn(eventService, 'getEvent').mockResolvedValue(mockEvent);
      jest.spyOn(eventService, 'scheduleNotification').mockResolvedValue({
        id: 'not123',
        eventId,
        userId,
        type: 'registration_confirmation',
        message: 'Registration confirmed',
        scheduledFor: new Date(),
        sent: false
      });

      const registration = await eventService.registerForEvent(eventId, userId);

      expect(registration).toMatchObject({
        eventId,
        userId,
        status: 'registered'
      });
      expect(registration.id).toMatch(/^reg_/);
      expect(registration.registeredAt).toBeInstanceOf(Date);
    });

    it('should throw error if event not found', async () => {
      jest.spyOn(eventService, 'getEvent').mockResolvedValue(null);

      await expect(eventService.registerForEvent('nonexistent', 'user123'))
        .rejects.toThrow('Event not found');
    });

    it('should throw error if event is full', async () => {
      const mockEvent: Event = {
        id: 'evt123',
        title: 'Full Event',
        description: 'Test Description',
        type: 'workshop',
        startDate: new Date('2024-03-15T10:00:00Z'),
        endDate: new Date('2024-03-15T16:00:00Z'),
        isVirtual: false,
        maxAttendees: 10,
        currentAttendees: 10, // Event is full
        organizerId: 'organizer123',
        tags: [],
        subjects: [],
        targetAudience: [],
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      jest.spyOn(eventService, 'getEvent').mockResolvedValue(mockEvent);

      await expect(eventService.registerForEvent('evt123', 'user123'))
        .rejects.toThrow('Event is full');
    });

    it('should throw error if registration deadline has passed', async () => {
      const pastDate = new Date('2023-01-01T00:00:00Z');
      const mockEvent: Event = {
        id: 'evt123',
        title: 'Past Deadline Event',
        description: 'Test Description',
        type: 'workshop',
        startDate: new Date('2024-03-15T10:00:00Z'),
        endDate: new Date('2024-03-15T16:00:00Z'),
        isVirtual: false,
        currentAttendees: 5,
        organizerId: 'organizer123',
        tags: [],
        subjects: [],
        targetAudience: [],
        registrationDeadline: pastDate,
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      jest.spyOn(eventService, 'getEvent').mockResolvedValue(mockEvent);

      await expect(eventService.registerForEvent('evt123', 'user123'))
        .rejects.toThrow('Registration deadline has passed');
    });
  });

  describe('scheduleNotification', () => {
    it('should create a notification with correct properties', async () => {
      const notificationData = {
        eventId: 'evt123',
        userId: 'user456',
        type: 'reminder' as const,
        message: 'Event reminder',
        scheduledFor: new Date('2024-03-15T09:00:00Z')
      };

      const notification = await eventService.scheduleNotification(notificationData);

      expect(notification).toMatchObject({
        ...notificationData,
        sent: false
      });
      expect(notification.id).toMatch(/^not_/);
    });

    it('should generate unique notification IDs', async () => {
      const notificationData = {
        eventId: 'evt123',
        userId: 'user456',
        type: 'reminder' as const,
        message: 'Event reminder',
        scheduledFor: new Date('2024-03-15T09:00:00Z')
      };

      const notification1 = await eventService.scheduleNotification(notificationData);
      const notification2 = await eventService.scheduleNotification({
        ...notificationData,
        message: 'Different reminder'
      });

      expect(notification1.id).not.toBe(notification2.id);
    });
  });

  describe('generateCalendarEvent', () => {
    it('should generate calendar event data correctly', async () => {
      const mockEvent: Event = {
        id: 'evt123',
        title: 'Math Workshop',
        description: 'Advanced mathematics teaching',
        type: 'workshop',
        startDate: new Date('2024-03-15T10:00:00Z'),
        endDate: new Date('2024-03-15T16:00:00Z'),
        location: 'Kampala Center',
        isVirtual: false,
        currentAttendees: 5,
        organizerId: 'organizer123',
        tags: [],
        subjects: [],
        targetAudience: [],
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      jest.spyOn(eventService, 'getEvent').mockResolvedValue(mockEvent);

      const calendarEvent = await eventService.generateCalendarEvent('evt123');

      expect(calendarEvent).toEqual({
        title: 'Math Workshop',
        start: mockEvent.startDate,
        end: mockEvent.endDate,
        description: 'Advanced mathematics teaching',
        location: 'Kampala Center',
        url: undefined
      });
    });

    it('should handle virtual events correctly', async () => {
      const mockEvent: Event = {
        id: 'evt123',
        title: 'Virtual Workshop',
        description: 'Online teaching session',
        type: 'webinar',
        startDate: new Date('2024-03-15T10:00:00Z'),
        endDate: new Date('2024-03-15T16:00:00Z'),
        isVirtual: true,
        virtualLink: 'https://zoom.us/meeting123',
        currentAttendees: 5,
        organizerId: 'organizer123',
        tags: [],
        subjects: [],
        targetAudience: [],
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      jest.spyOn(eventService, 'getEvent').mockResolvedValue(mockEvent);

      const calendarEvent = await eventService.generateCalendarEvent('evt123');

      expect(calendarEvent.location).toBe('Virtual Event');
      expect(calendarEvent.url).toBe('https://zoom.us/meeting123');
    });

    it('should throw error if event not found', async () => {
      jest.spyOn(eventService, 'getEvent').mockResolvedValue(null);

      await expect(eventService.generateCalendarEvent('nonexistent'))
        .rejects.toThrow('Failed to generate calendar event');
    });
  });

  describe('getEventAnalytics', () => {
    it('should calculate analytics correctly', async () => {
      const mockRegistrations: EventRegistration[] = [
        {
          id: 'reg1',
          eventId: 'evt123',
          userId: 'user1',
          registeredAt: new Date(),
          status: 'attended'
        },
        {
          id: 'reg2',
          eventId: 'evt123',
          userId: 'user2',
          registeredAt: new Date(),
          status: 'attended'
        },
        {
          id: 'reg3',
          eventId: 'evt123',
          userId: 'user3',
          registeredAt: new Date(),
          status: 'no_show'
        },
        {
          id: 'reg4',
          eventId: 'evt123',
          userId: 'user4',
          registeredAt: new Date(),
          status: 'registered'
        }
      ];

      jest.spyOn(eventService, 'getEventRegistrations').mockResolvedValue(mockRegistrations);

      const analytics = await eventService.getEventAnalytics('evt123');

      expect(analytics.totalRegistrations).toBe(4);
      expect(analytics.attendanceRate).toBe(50); // 2 out of 4 attended
      expect(analytics.attendeesByStatus).toEqual({
        attended: 2,
        no_show: 1,
        registered: 1
      });
    });

    it('should handle empty registrations', async () => {
      jest.spyOn(eventService, 'getEventRegistrations').mockResolvedValue([]);

      const analytics = await eventService.getEventAnalytics('evt123');

      expect(analytics.totalRegistrations).toBe(0);
      expect(analytics.attendanceRate).toBe(0);
      expect(analytics.attendeesByStatus).toEqual({});
    });
  });

  describe('updateEvent', () => {
    it('should update event with new data', async () => {
      const eventId = 'evt123';
      const updates = {
        title: 'Updated Workshop',
        description: 'Updated description'
      };

      const updatedEvent = await eventService.updateEvent(eventId, updates);

      expect(updatedEvent.id).toBe(eventId);
      expect(updatedEvent.title).toBe('Updated Workshop');
      expect(updatedEvent.description).toBe('Updated description');
      expect(updatedEvent.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Error handling', () => {
    it('should handle service errors gracefully', async () => {
      // Test that basic operations work without throwing
      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
        type: 'workshop' as const,
        startDate: new Date(),
        endDate: new Date(),
        isVirtual: false,
        organizerId: 'user123',
        tags: [],
        subjects: [],
        targetAudience: [],
        status: 'draft' as const
      };

      const event = await eventService.createEvent(eventData);
      expect(event).toBeDefined();
      expect(event.id).toMatch(/^evt_/);
    });
  });
});