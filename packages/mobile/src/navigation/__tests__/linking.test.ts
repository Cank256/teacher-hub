import { validateDeepLink, extractDeepLinkParams, createDeepLink } from '../linking';

describe('Deep Linking', () => {
  describe('validateDeepLink', () => {
    it('should validate teacherhub:// scheme URLs', () => {
      expect(validateDeepLink('teacherhub://posts/123')).toBe(true);
      expect(validateDeepLink('teacherhub://auth/login')).toBe(true);
    });

    it('should validate https URLs with valid hosts', () => {
      expect(validateDeepLink('https://teacherhub.ug/posts/123')).toBe(true);
      expect(validateDeepLink('https://app.teacherhub.ug/auth/login')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateDeepLink('https://malicious.com/posts/123')).toBe(false);
      expect(validateDeepLink('http://teacherhub.ug/posts/123')).toBe(false);
      expect(validateDeepLink('invalid-url')).toBe(false);
    });
  });

  describe('extractDeepLinkParams', () => {
    it('should extract query parameters', () => {
      const params = extractDeepLinkParams('https://teacherhub.ug/posts?category=math&grade=5');
      
      expect(params).toEqual({
        category: 'math',
        grade: '5',
      });
    });

    it('should handle URLs without parameters', () => {
      const params = extractDeepLinkParams('https://teacherhub.ug/posts');
      
      expect(params).toEqual({});
    });

    it('should handle invalid URLs gracefully', () => {
      const params = extractDeepLinkParams('invalid-url');
      
      expect(params).toEqual({});
    });
  });

  describe('createDeepLink', () => {
    it('should create login deep link', () => {
      const link = createDeepLink.login();
      expect(link).toContain('auth/login');
    });

    it('should create post detail deep link', () => {
      const link = createDeepLink.postDetail('123');
      expect(link).toContain('posts/123');
    });

    it('should create community detail deep link', () => {
      const link = createDeepLink.communityDetail('456');
      expect(link).toContain('communities/456');
    });

    it('should create chat deep link', () => {
      const link = createDeepLink.chat('789');
      expect(link).toContain('messages/789');
    });

    it('should create resource detail deep link', () => {
      const link = createDeepLink.resourceDetail('abc');
      expect(link).toContain('resources/abc');
    });
  });
});