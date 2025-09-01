/**
 * Posts Types Tests
 */

import { 
  PostVisibility, 
  PostSortBy, 
  MediaType, 
  InteractionType, 
  SharePlatform 
} from '../posts';

describe('Posts Types', () => {
  describe('PostVisibility enum', () => {
    it('should have correct values', () => {
      expect(PostVisibility.PUBLIC).toBe('public');
      expect(PostVisibility.COMMUNITY).toBe('community');
      expect(PostVisibility.FOLLOWERS).toBe('followers');
      expect(PostVisibility.PRIVATE).toBe('private');
    });
  });

  describe('PostSortBy enum', () => {
    it('should have correct values', () => {
      expect(PostSortBy.CREATED_AT).toBe('created_at');
      expect(PostSortBy.UPDATED_AT).toBe('updated_at');
      expect(PostSortBy.LIKES).toBe('likes');
      expect(PostSortBy.COMMENTS).toBe('comments');
      expect(PostSortBy.SHARES).toBe('shares');
      expect(PostSortBy.RELEVANCE).toBe('relevance');
    });
  });

  describe('MediaType enum', () => {
    it('should have correct values', () => {
      expect(MediaType.IMAGE).toBe('image');
      expect(MediaType.VIDEO).toBe('video');
      expect(MediaType.DOCUMENT).toBe('document');
      expect(MediaType.AUDIO).toBe('audio');
    });
  });

  describe('InteractionType enum', () => {
    it('should have correct values', () => {
      expect(InteractionType.LIKE).toBe('like');
      expect(InteractionType.BOOKMARK).toBe('bookmark');
      expect(InteractionType.SHARE).toBe('share');
      expect(InteractionType.VIEW).toBe('view');
    });
  });

  describe('SharePlatform enum', () => {
    it('should have correct values', () => {
      expect(SharePlatform.WHATSAPP).toBe('whatsapp');
      expect(SharePlatform.FACEBOOK).toBe('facebook');
      expect(SharePlatform.TWITTER).toBe('twitter');
      expect(SharePlatform.EMAIL).toBe('email');
      expect(SharePlatform.SMS).toBe('sms');
      expect(SharePlatform.COPY_LINK).toBe('copy_link');
      expect(SharePlatform.MORE).toBe('more');
    });
  });
});