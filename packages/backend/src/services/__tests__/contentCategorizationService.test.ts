import { contentCategorizationService } from '../contentCategorizationService';
import { Resource, ResourceRating } from '../../types';

describe('ContentCategorizationService', () => {
  describe('categorizeContent', () => {
    it('should categorize mathematics content correctly', async () => {
      const resource: Partial<Resource> = {
        title: 'Basic Addition Worksheet for Primary 2',
        description: 'Practice addition problems with numbers up to 50. Includes counting exercises.',
        subjects: ['Mathematics'],
        gradeLevels: ['P2'],
        tags: []
      };

      const result = await contentCategorizationService.categorizeContent(resource);

      expect(result.suggestedTags).toContain('Mathematics');
      expect(result.suggestedTags).toContain('Worksheet');
      expect(result.suggestedTags).toContain('Primary');
      expect(result.suggestedCategories).toContain('primary');
      expect(result.curriculumAlignments.length).toBeGreaterThan(0);
      expect(result.curriculumAlignments[0]?.standardId).toBe('p2-math-addition');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should identify curriculum alignments for English content', async () => {
      const resource: Partial<Resource> = {
        title: 'Phonics Learning Guide',
        description: 'Learn letter sounds and basic phonics for reading development. Alphabet recognition activities.',
        subjects: ['English'],
        gradeLevels: ['P1'],
        tags: []
      };

      const result = await contentCategorizationService.categorizeContent(resource);

      expect(result.curriculumAlignments).toHaveLength(1);
      expect(result.curriculumAlignments[0]?.standardId).toBe('p1-eng-phonics');
      expect(result.curriculumAlignments[0]?.alignmentType).toBe('direct');
      expect(result.suggestedTags).toContain('English');
    });

    it('should handle content with multiple subject alignments', async () => {
      const resource: Partial<Resource> = {
        title: 'Science and Math Integration Lesson',
        description: 'Combining mathematics calculations with biology cell measurements and microscope observations.',
        subjects: ['Science', 'Mathematics'],
        gradeLevels: ['S1'],
        tags: []
      };

      const result = await contentCategorizationService.categorizeContent(resource);

      expect(result.curriculumAlignments.length).toBeGreaterThan(0);
      expect(result.suggestedTags).toContain('Mathematics');
      expect(result.suggestedTags).toContain('Science');
      expect(result.suggestedCategories).toContain('secondary-sciences');
    });

    it('should not suggest existing tags', async () => {
      const resource: Partial<Resource> = {
        title: 'Mathematics Worksheet',
        description: 'Basic arithmetic problems',
        subjects: ['Mathematics'],
        gradeLevels: ['P1'],
        tags: ['Mathematics', 'Worksheet'] // Already has these tags
      };

      const result = await contentCategorizationService.categorizeContent(resource);

      expect(result.suggestedTags).not.toContain('Mathematics');
      expect(result.suggestedTags).not.toContain('Worksheet');
    });

    it('should handle empty content gracefully', async () => {
      const resource: Partial<Resource> = {
        title: '',
        description: '',
        subjects: [],
        gradeLevels: [],
        tags: []
      };

      const result = await contentCategorizationService.categorizeContent(resource);

      expect(result.suggestedTags).toEqual([]);
      expect(result.suggestedCategories).toEqual([]);
      expect(result.curriculumAlignments).toEqual([]);
      expect(result.confidence).toBe(0);
    });

    it('should provide reasoning for suggestions', async () => {
      const resource: Partial<Resource> = {
        title: 'Interactive Science Lesson',
        description: 'Hands-on biology experiments with visual aids and diagrams',
        subjects: ['Science'],
        gradeLevels: ['S1'],
        tags: []
      };

      const result = await contentCategorizationService.categorizeContent(resource);

      expect(result.reasoning.some(r => r.includes('Suggested tag') && r.includes('based on content analysis'))).toBe(true);
      expect(result.reasoning.some(r => r.includes('Suggested category') && r.includes('based on'))).toBe(true);
    });
  });

  describe('calculateRatingData', () => {
    it('should calculate rating data correctly with multiple ratings', () => {
      const ratings: ResourceRating[] = [
        { id: '1', resourceId: 'res1', userId: 'user1', rating: 5, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', resourceId: 'res1', userId: 'user2', rating: 4, createdAt: new Date(), updatedAt: new Date() },
        { id: '3', resourceId: 'res1', userId: 'user3', rating: 5, createdAt: new Date(), updatedAt: new Date() },
        { id: '4', resourceId: 'res1', userId: 'user4', rating: 3, createdAt: new Date(), updatedAt: new Date() },
      ];

      const result = contentCategorizationService.calculateRatingData(ratings);

      expect(result.averageRating).toBe(4.25);
      expect(result.totalRatings).toBe(4);
      expect(result.ratingDistribution[5]).toBe(2);
      expect(result.ratingDistribution[4]).toBe(1);
      expect(result.ratingDistribution[3]).toBe(1);
      expect(result.qualityScore).toBeGreaterThan(0.8);
    });

    it('should handle empty ratings array', () => {
      const ratings: ResourceRating[] = [];

      const result = contentCategorizationService.calculateRatingData(ratings);

      expect(result.averageRating).toBe(0);
      expect(result.totalRatings).toBe(0);
      expect(result.ratingDistribution).toEqual({});
      expect(result.qualityScore).toBe(0);
      expect(result.relevanceScore).toBe(0);
    });

    it('should calculate quality score weighted towards higher ratings', () => {
      const highRatings: ResourceRating[] = [
        { id: '1', resourceId: 'res1', userId: 'user1', rating: 5, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', resourceId: 'res1', userId: 'user2', rating: 5, createdAt: new Date(), updatedAt: new Date() },
      ];

      const lowRatings: ResourceRating[] = [
        { id: '3', resourceId: 'res2', userId: 'user3', rating: 1, createdAt: new Date(), updatedAt: new Date() },
        { id: '4', resourceId: 'res2', userId: 'user4', rating: 2, createdAt: new Date(), updatedAt: new Date() },
      ];

      const highResult = contentCategorizationService.calculateRatingData(highRatings);
      const lowResult = contentCategorizationService.calculateRatingData(lowRatings);

      expect(highResult.qualityScore).toBeGreaterThan(lowResult.qualityScore);
      expect(highResult.qualityScore).toBe(1.0);
      expect(lowResult.qualityScore).toBe(0.3);
    });

    it('should calculate relevance score based on recent ratings', () => {
      const recentDate = new Date();
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60); // 60 days ago

      const ratingsWithRecent: ResourceRating[] = [
        { id: '1', resourceId: 'res1', userId: 'user1', rating: 5, createdAt: recentDate, updatedAt: recentDate },
        { id: '2', resourceId: 'res1', userId: 'user2', rating: 4, createdAt: oldDate, updatedAt: oldDate },
      ];

      const ratingsAllOld: ResourceRating[] = [
        { id: '3', resourceId: 'res2', userId: 'user3', rating: 5, createdAt: oldDate, updatedAt: oldDate },
        { id: '4', resourceId: 'res2', userId: 'user4', rating: 4, createdAt: oldDate, updatedAt: oldDate },
      ];

      const recentResult = contentCategorizationService.calculateRatingData(ratingsWithRecent);
      const oldResult = contentCategorizationService.calculateRatingData(ratingsAllOld);

      expect(recentResult.relevanceScore).toBeGreaterThan(oldResult.relevanceScore);
    });
  });

  describe('getCurriculumStandards', () => {
    it('should return all standards when no filters applied', () => {
      const standards = contentCategorizationService.getCurriculumStandards();
      expect(standards.length).toBeGreaterThan(0);
    });

    it('should filter by subject', () => {
      const mathStandards = contentCategorizationService.getCurriculumStandards('Mathematics');
      expect(mathStandards.every(s => s.subject === 'Mathematics')).toBe(true);
      expect(mathStandards.length).toBeGreaterThan(0);
    });

    it('should filter by grade level', () => {
      const p1Standards = contentCategorizationService.getCurriculumStandards(undefined, 'P1');
      expect(p1Standards.every(s => s.gradeLevel === 'P1')).toBe(true);
      expect(p1Standards.length).toBeGreaterThan(0);
    });

    it('should filter by both subject and grade level', () => {
      const p1MathStandards = contentCategorizationService.getCurriculumStandards('Mathematics', 'P1');
      expect(p1MathStandards.every(s => s.subject === 'Mathematics' && s.gradeLevel === 'P1')).toBe(true);
    });
  });

  describe('getCategories', () => {
    it('should return top-level categories when no parent specified', () => {
      const topCategories = contentCategorizationService.getCategories();
      expect(topCategories.every(c => !c.parentId)).toBe(true);
      expect(topCategories.length).toBeGreaterThan(0);
    });

    it('should return child categories for a parent', () => {
      const primarySubCategories = contentCategorizationService.getCategories('primary');
      expect(primarySubCategories.every(c => c.parentId === 'primary')).toBe(true);
      expect(primarySubCategories.length).toBeGreaterThan(0);
    });

    it('should filter by level', () => {
      const level0Categories = contentCategorizationService.getCategories(undefined, 0);
      expect(level0Categories.every(c => c.level === 0)).toBe(true);
    });

    it('should only return active categories', () => {
      const categories = contentCategorizationService.getCategories();
      expect(categories.every(c => c.isActive)).toBe(true);
    });
  });

  describe('getContentTags', () => {
    it('should return all tags when no category specified', () => {
      const tags = contentCategorizationService.getContentTags();
      expect(tags.length).toBeGreaterThan(0);
    });

    it('should filter by category', () => {
      const subjectTags = contentCategorizationService.getContentTags('subject');
      expect(subjectTags.every(t => t.category === 'subject')).toBe(true);
      expect(subjectTags.length).toBeGreaterThan(0);
    });
  });

  describe('addContentTag', () => {
    it('should add a custom content tag', () => {
      const initialTagCount = contentCategorizationService.getContentTags().length;
      
      const newTag = contentCategorizationService.addContentTag({
        name: 'Custom Tag',
        category: 'custom',
        weight: 0.5,
        synonyms: ['custom', 'test'],
        isSystemGenerated: false
      });

      expect(newTag.id).toMatch(/^custom-\d+$/);
      expect(newTag.name).toBe('Custom Tag');
      expect(contentCategorizationService.getContentTags().length).toBe(initialTagCount + 1);
    });
  });

  describe('validateCurriculumAlignment', () => {
    it('should validate existing curriculum alignments', () => {
      const alignments = ['p1-math-numbers', 'p2-math-addition', 'invalid-alignment'];
      
      const result = contentCategorizationService.validateCurriculumAlignment(alignments);
      
      expect(result.valid).toContain('p1-math-numbers');
      expect(result.valid).toContain('p2-math-addition');
      expect(result.invalid).toContain('invalid-alignment');
      expect(result.valid.length).toBe(2);
      expect(result.invalid.length).toBe(1);
    });

    it('should handle empty alignment array', () => {
      const result = contentCategorizationService.validateCurriculumAlignment([]);
      
      expect(result.valid).toEqual([]);
      expect(result.invalid).toEqual([]);
    });

    it('should validate by curriculum code as well as ID', () => {
      const alignments = ['P1.MATH.NUM.001']; // Using code instead of ID
      
      const result = contentCategorizationService.validateCurriculumAlignment(alignments);
      
      expect(result.valid).toContain('P1.MATH.NUM.001');
      expect(result.invalid.length).toBe(0);
    });
  });
});