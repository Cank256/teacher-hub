import { Resource, ResourceRating } from '../types';
import logger from '../utils/logger';

export interface ContentCategory {
  id: string;
  name: string;
  description: string;
  parentId?: string;
  level: number;
  isActive: boolean;
}

export interface CurriculumStandard {
  id: string;
  code: string;
  title: string;
  description: string;
  subject: string;
  gradeLevel: string;
  strand?: string;
  subStrand?: string;
  learningOutcome: string;
  keywords: string[];
}

export interface ContentTag {
  id: string;
  name: string;
  category: string;
  weight: number;
  synonyms: string[];
  isSystemGenerated: boolean;
}

export interface CategorizationResult {
  suggestedCategories: string[];
  suggestedTags: string[];
  curriculumAlignments: CurriculumAlignment[];
  confidence: number;
  reasoning: string[];
}

export interface CurriculumAlignment {
  standardId: string;
  confidence: number;
  matchedKeywords: string[];
  alignmentType: 'direct' | 'partial' | 'related';
}

export interface ContentRatingData {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: { [key: number]: number };
  qualityScore: number;
  relevanceScore: number;
}

class ContentCategorizationService {
  private categories: ContentCategory[] = [];
  private curriculumStandards: CurriculumStandard[] = [];
  private contentTags: ContentTag[] = [];

  constructor() {
    this.initializeDefaultCategories();
    this.initializeUgandanCurriculumStandards();
    this.initializeContentTags();
  }

  /**
   * Initialize default content categories for Ugandan education system
   */
  private initializeDefaultCategories(): void {
    this.categories = [
      // Primary Education Categories
      { id: 'primary', name: 'Primary Education', description: 'Content for primary school levels', level: 0, isActive: true },
      { id: 'primary-literacy', name: 'Literacy', description: 'Reading and writing skills', parentId: 'primary', level: 1, isActive: true },
      { id: 'primary-numeracy', name: 'Numeracy', description: 'Basic mathematics skills', parentId: 'primary', level: 1, isActive: true },
      { id: 'primary-science', name: 'Science', description: 'Basic science concepts', parentId: 'primary', level: 1, isActive: true },
      { id: 'primary-social', name: 'Social Studies', description: 'Social and cultural studies', parentId: 'primary', level: 1, isActive: true },
      
      // Secondary Education Categories
      { id: 'secondary', name: 'Secondary Education', description: 'Content for secondary school levels', level: 0, isActive: true },
      { id: 'secondary-sciences', name: 'Sciences', description: 'Physics, Chemistry, Biology', parentId: 'secondary', level: 1, isActive: true },
      { id: 'secondary-mathematics', name: 'Mathematics', description: 'Advanced mathematics', parentId: 'secondary', level: 1, isActive: true },
      { id: 'secondary-languages', name: 'Languages', description: 'English, Luganda, other languages', parentId: 'secondary', level: 1, isActive: true },
      { id: 'secondary-humanities', name: 'Humanities', description: 'History, Geography, Religious Education', parentId: 'secondary', level: 1, isActive: true },
      
      // Vocational Categories
      { id: 'vocational', name: 'Vocational Education', description: 'Technical and vocational skills', level: 0, isActive: true },
      { id: 'vocational-agriculture', name: 'Agriculture', description: 'Agricultural skills and knowledge', parentId: 'vocational', level: 1, isActive: true },
      { id: 'vocational-technical', name: 'Technical Skills', description: 'Technical and engineering skills', parentId: 'vocational', level: 1, isActive: true },
      
      // Professional Development
      { id: 'professional', name: 'Professional Development', description: 'Teacher training and development', level: 0, isActive: true },
      { id: 'professional-pedagogy', name: 'Pedagogy', description: 'Teaching methods and strategies', parentId: 'professional', level: 1, isActive: true },
      { id: 'professional-assessment', name: 'Assessment', description: 'Student assessment techniques', parentId: 'professional', level: 1, isActive: true },
    ];
  }

  /**
   * Initialize Ugandan curriculum standards based on NCDC guidelines
   */
  private initializeUgandanCurriculumStandards(): void {
    this.curriculumStandards = [
      // Primary Mathematics Standards
      {
        id: 'p1-math-numbers',
        code: 'P1.MATH.NUM.001',
        title: 'Number Recognition and Counting',
        description: 'Recognize and count numbers 1-20',
        subject: 'Mathematics',
        gradeLevel: 'P1',
        strand: 'Numbers',
        learningOutcome: 'Learner should be able to recognize and count numbers from 1 to 20',
        keywords: ['counting', 'numbers', 'recognition', 'one to twenty', 'numerals']
      },
      {
        id: 'p2-math-addition',
        code: 'P2.MATH.NUM.002',
        title: 'Basic Addition',
        description: 'Perform simple addition within 50',
        subject: 'Mathematics',
        gradeLevel: 'P2',
        strand: 'Numbers',
        learningOutcome: 'Learner should be able to add numbers within 50',
        keywords: ['addition', 'sum', 'plus', 'basic arithmetic', 'fifty', 'worksheet', 'practice']
      },
      
      // Primary English Standards
      {
        id: 'p1-eng-phonics',
        code: 'P1.ENG.READ.001',
        title: 'Letter Sounds and Phonics',
        description: 'Recognize letter sounds and basic phonics',
        subject: 'English',
        gradeLevel: 'P1',
        strand: 'Reading',
        learningOutcome: 'Learner should be able to identify letter sounds and apply basic phonics',
        keywords: ['phonics', 'letter sounds', 'alphabet', 'reading', 'pronunciation']
      },
      
      // Secondary Science Standards
      {
        id: 's1-bio-cells',
        code: 'S1.BIO.CELL.001',
        title: 'Cell Structure and Function',
        description: 'Understanding basic cell structure and functions',
        subject: 'Biology',
        gradeLevel: 'S1',
        strand: 'Cell Biology',
        learningOutcome: 'Learner should understand the basic structure and function of cells',
        keywords: ['cell', 'structure', 'function', 'organelles', 'biology', 'microscope']
      },
      
      // Add more standards as needed...
    ];
  }

  /**
   * Initialize content tags for automatic categorization
   */
  private initializeContentTags(): void {
    this.contentTags = [
      // Subject-based tags
      { id: 'math', name: 'Mathematics', category: 'subject', weight: 1.0, synonyms: ['maths', 'arithmetic', 'calculation'], isSystemGenerated: true },
      { id: 'english', name: 'English', category: 'subject', weight: 1.0, synonyms: ['language', 'literacy', 'reading', 'writing'], isSystemGenerated: true },
      { id: 'science', name: 'Science', category: 'subject', weight: 1.0, synonyms: ['biology', 'chemistry', 'physics'], isSystemGenerated: true },
      
      // Grade level tags
      { id: 'primary', name: 'Primary', category: 'level', weight: 0.9, synonyms: ['elementary', 'lower primary', 'upper primary'], isSystemGenerated: true },
      { id: 'secondary', name: 'Secondary', category: 'level', weight: 0.9, synonyms: ['high school', 'ordinary level', 'advanced level'], isSystemGenerated: true },
      
      // Content type tags
      { id: 'lesson-plan', name: 'Lesson Plan', category: 'type', weight: 0.8, synonyms: ['teaching plan', 'curriculum plan'], isSystemGenerated: true },
      { id: 'worksheet', name: 'Worksheet', category: 'type', weight: 0.8, synonyms: ['exercise', 'practice sheet', 'activity'], isSystemGenerated: true },
      { id: 'assessment', name: 'Assessment', category: 'type', weight: 0.8, synonyms: ['test', 'exam', 'quiz', 'evaluation'], isSystemGenerated: true },
      
      // Pedagogical tags
      { id: 'interactive', name: 'Interactive', category: 'pedagogy', weight: 0.7, synonyms: ['hands-on', 'engaging', 'participatory'], isSystemGenerated: true },
      { id: 'visual', name: 'Visual Learning', category: 'pedagogy', weight: 0.7, synonyms: ['diagrams', 'charts', 'images', 'visual aids'], isSystemGenerated: true },
    ];
  }

  /**
   * Automatically categorize content based on title, description, and metadata
   */
  async categorizeContent(resource: Partial<Resource>): Promise<CategorizationResult> {
    const text = `${resource.title || ''} ${resource.description || ''}`.toLowerCase();
    const existingTags = resource.tags || [];
    const subjects = resource.subjects || [];
    const gradeLevels = resource.gradeLevels || [];

    const suggestedCategories: string[] = [];
    const suggestedTags: string[] = [];
    const curriculumAlignments: CurriculumAlignment[] = [];
    const reasoning: string[] = [];

    // Analyze text content for keywords
    const words = text.split(/\s+/).filter(word => word.length > 2);
    
    // Match against curriculum standards
    for (const standard of this.curriculumStandards) {
      const matchedKeywords = standard.keywords.filter(keyword => 
        text.includes(keyword.toLowerCase())
      );
      
      if (matchedKeywords.length > 0) {
        const confidence = matchedKeywords.length / standard.keywords.length;
        
        if (confidence >= 0.3) { // At least 30% keyword match
          curriculumAlignments.push({
            standardId: standard.id,
            confidence,
            matchedKeywords,
            alignmentType: confidence >= 0.7 ? 'direct' : confidence >= 0.5 ? 'partial' : 'related'
          });
          
          reasoning.push(`Matched curriculum standard "${standard.title}" with ${Math.round(confidence * 100)}% confidence`);
        }
      }
    }

    // Match against content tags
    for (const tag of this.contentTags) {
      const tagMatches = [tag.name.toLowerCase(), ...tag.synonyms].some(term => 
        text.includes(term)
      );
      
      // Also check if the tag matches subjects or grade levels
      const subjectMatch = subjects.some(subject => 
        tag.name.toLowerCase().includes(subject.toLowerCase()) || 
        tag.synonyms.some(synonym => synonym.toLowerCase().includes(subject.toLowerCase()))
      );
      
      const gradeLevelMatch = gradeLevels.some(level => 
        tag.name.toLowerCase().includes(level.toLowerCase()) ||
        tag.synonyms.some(synonym => synonym.toLowerCase().includes(level.toLowerCase()))
      );
      
      if ((tagMatches || subjectMatch || gradeLevelMatch) && !existingTags.includes(tag.name)) {
        suggestedTags.push(tag.name);
        reasoning.push(`Suggested tag "${tag.name}" based on content analysis`);
      }
    }

    // Suggest categories based on subjects and grade levels
    if (subjects.length > 0 || gradeLevels.length > 0) {
      // First, determine the education level based on grade levels
      const isPrimary = gradeLevels.some(level => level.toLowerCase().startsWith('p'));
      const isSecondary = gradeLevels.some(level => level.toLowerCase().startsWith('s'));
      
      for (const category of this.categories) {
        // Match grade level categories first
        if (isPrimary && category.id === 'primary') {
          suggestedCategories.push(category.id);
          reasoning.push(`Suggested category "${category.name}" based on grade level match`);
        }
        
        if (isSecondary && category.id === 'secondary') {
          suggestedCategories.push(category.id);
          reasoning.push(`Suggested category "${category.name}" based on grade level match`);
        }
        
        // Then match subject-specific subcategories
        if (subjects.some(subject => category.name.toLowerCase().includes(subject.toLowerCase()))) {
          // Only suggest if it matches the education level
          if ((isPrimary && category.parentId === 'primary') || 
              (isSecondary && category.parentId === 'secondary') ||
              (!isPrimary && !isSecondary)) {
            suggestedCategories.push(category.id);
            reasoning.push(`Suggested category "${category.name}" based on subject match`);
          }
        }
      }
    }

    // Calculate overall confidence
    const confidence = Math.min(
      (curriculumAlignments.length * 0.4) + 
      (suggestedTags.length * 0.3) + 
      (suggestedCategories.length * 0.3),
      1.0
    );

    return {
      suggestedCategories: [...new Set(suggestedCategories)], // Remove duplicates
      suggestedTags: [...new Set(suggestedTags)],
      curriculumAlignments: curriculumAlignments.sort((a, b) => b.confidence - a.confidence),
      confidence,
      reasoning
    };
  }

  /**
   * Calculate content rating data from individual ratings
   */
  calculateRatingData(ratings: ResourceRating[]): ContentRatingData {
    if (ratings.length === 0) {
      return {
        averageRating: 0,
        totalRatings: 0,
        ratingDistribution: {},
        qualityScore: 0,
        relevanceScore: 0
      };
    }

    const totalRatings = ratings.length;
    const sumRatings = ratings.reduce((sum, rating) => sum + rating.rating, 0);
    const averageRating = sumRatings / totalRatings;

    // Calculate rating distribution
    const ratingDistribution: { [key: number]: number } = {};
    for (let i = 1; i <= 5; i++) {
      ratingDistribution[i] = ratings.filter(r => r.rating === i).length;
    }

    // Calculate quality score (weighted towards higher ratings)
    const qualityScore = (
      ((ratingDistribution[5] || 0) * 1.0) +
      ((ratingDistribution[4] || 0) * 0.8) +
      ((ratingDistribution[3] || 0) * 0.6) +
      ((ratingDistribution[2] || 0) * 0.4) +
      ((ratingDistribution[1] || 0) * 0.2)
    ) / totalRatings;

    // Calculate relevance score based on number of ratings and recency
    const recentRatings = ratings.filter(r => {
      const daysSinceRating = (Date.now() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceRating <= 30; // Last 30 days
    }).length;

    const relevanceScore = Math.min(
      (recentRatings / Math.max(totalRatings, 1)) * 0.7 + 
      (Math.log(totalRatings + 1) / Math.log(100)) * 0.3,
      1.0
    );

    return {
      averageRating: Math.round(averageRating * 100) / 100,
      totalRatings,
      ratingDistribution,
      qualityScore: Math.round(qualityScore * 100) / 100,
      relevanceScore: Math.round(relevanceScore * 100) / 100
    };
  }

  /**
   * Get curriculum standards by subject and grade level
   */
  getCurriculumStandards(subject?: string, gradeLevel?: string): CurriculumStandard[] {
    return this.curriculumStandards.filter(standard => {
      const subjectMatch = !subject || standard.subject.toLowerCase().includes(subject.toLowerCase());
      const gradeMatch = !gradeLevel || standard.gradeLevel.toLowerCase() === gradeLevel.toLowerCase();
      return subjectMatch && gradeMatch;
    });
  }

  /**
   * Get content categories by level or parent
   */
  getCategories(parentId?: string, level?: number): ContentCategory[] {
    return this.categories.filter(category => {
      const parentMatch = parentId ? category.parentId === parentId : parentId === undefined ? !category.parentId : true;
      const levelMatch = level !== undefined ? category.level === level : true;
      return parentMatch && levelMatch && category.isActive;
    });
  }

  /**
   * Get content tags by category
   */
  getContentTags(category?: string): ContentTag[] {
    return this.contentTags.filter(tag => 
      !category || tag.category === category
    );
  }

  /**
   * Add custom content tag
   */
  addContentTag(tag: Omit<ContentTag, 'id'>): ContentTag {
    const newTag: ContentTag = {
      id: `custom-${Date.now()}`,
      ...tag
    };
    
    this.contentTags.push(newTag);
    logger.info(`Added custom content tag: ${newTag.name}`);
    
    return newTag;
  }

  /**
   * Validate curriculum alignment
   */
  validateCurriculumAlignment(alignments: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const alignment of alignments) {
      const standard = this.curriculumStandards.find(s => s.id === alignment || s.code === alignment);
      if (standard) {
        valid.push(alignment);
      } else {
        invalid.push(alignment);
      }
    }

    return { valid, invalid };
  }
}

export const contentCategorizationService = new ContentCategorizationService();