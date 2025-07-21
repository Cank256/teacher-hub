import { v4 as uuidv4 } from 'uuid';
import { 
  ContentModerationResult, 
  ModerationFlag, 
  ModerationRule, 
  ContentAnalysis,
  ModerationConfig 
} from './types';
import logger from '../utils/logger';

export class ContentScreeningService {
  private rules: ModerationRule[] = [];
  private config: ModerationConfig;

  constructor(config: ModerationConfig) {
    this.config = config;
    this.initializeDefaultRules();
  }

  /**
   * Screen content for moderation issues
   */
  async screenContent(
    contentId: string,
    contentType: 'resource' | 'message' | 'profile' | 'comment',
    content: {
      text?: string;
      title?: string;
      description?: string;
      imageUrls?: string[];
      fileUrls?: string[];
    }
  ): Promise<ContentModerationResult> {
    const startTime = Date.now();
    
    try {
      logger.debug('Starting content screening', { contentId, contentType });

      // Analyze content
      const analysis = await this.analyzeContent(content);
      
      // Apply moderation rules
      const flags = await this.applyModerationRules(content, analysis);
      
      // Calculate overall confidence and status
      const { status, confidence } = this.calculateModerationStatus(flags);

      const result: ContentModerationResult = {
        id: uuidv4(),
        contentId,
        contentType,
        status,
        confidence,
        flags,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const processingTime = Date.now() - startTime;
      logger.info('Content screening completed', {
        contentId,
        status,
        confidence,
        flagCount: flags.length,
        processingTime
      });

      return result;
    } catch (error) {
      logger.error('Content screening failed', { contentId, error });
      
      // Return safe default - require manual review
      return {
        id: uuidv4(),
        contentId,
        contentType,
        status: 'pending_review',
        confidence: 0.5,
        flags: [{
          type: 'misinformation',
          severity: 'medium',
          confidence: 0.5,
          description: 'Content screening failed - requires manual review',
          detectedBy: 'automated'
        }],
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  }

  /**
   * Analyze content using various techniques
   */
  private async analyzeContent(content: {
    text?: string;
    title?: string;
    description?: string;
    imageUrls?: string[];
    fileUrls?: string[];
  }): Promise<ContentAnalysis> {
    const analysis: ContentAnalysis = {
      metadata: {}
    };

    // Analyze text content
    const fullText = [content.text, content.title, content.description]
      .filter(Boolean)
      .join(' ');

    if (fullText) {
      analysis.textAnalysis = await this.analyzeText(fullText);
    }

    // Analyze images if present
    if (content.imageUrls && content.imageUrls.length > 0) {
      analysis.imageAnalysis = await this.analyzeImages(content.imageUrls);
    }

    return analysis;
  }

  /**
   * Analyze text content
   */
  private async analyzeText(text: string): Promise<ContentAnalysis['textAnalysis']> {
    // Simulate text analysis (in production, this would use ML services)
    const words = text.toLowerCase().split(/\s+/);
    const wordCount = words.length;
    
    // Simple toxicity detection based on keyword matching
    const toxicKeywords = [
      'hate', 'stupid', 'idiot', 'kill', 'die', 'murder', 'violence',
      'drugs', 'alcohol', 'sex', 'porn', 'nude', 'naked'
    ];
    
    const toxicMatches = words.filter(word => 
      toxicKeywords.some(toxic => word.includes(toxic))
    );
    
    const toxicity = Math.min(toxicMatches.length / wordCount * 10, 1);

    // Simple sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'helpful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'useless', 'stupid'];
    
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (positiveCount > negativeCount) sentiment = 'positive';
    else if (negativeCount > positiveCount) sentiment = 'negative';

    // Simple readability score (Flesch-like)
    const avgWordsPerSentence = wordCount / Math.max(text.split(/[.!?]+/).length - 1, 1);
    const avgSyllablesPerWord = words.reduce((sum, word) => sum + this.countSyllables(word), 0) / wordCount;
    const readabilityScore = Math.max(0, Math.min(100, 
      206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord)
    ));

    return {
      language: 'en', // Simplified - would use language detection
      sentiment,
      toxicity,
      keywords: this.extractKeywords(text),
      readabilityScore
    };
  }

  /**
   * Analyze images for inappropriate content
   */
  private async analyzeImages(imageUrls: string[]): Promise<ContentAnalysis['imageAnalysis']> {
    // Simulate image analysis (in production, this would use ML services like AWS Rekognition)
    await this.delay(100); // Simulate API call
    
    return {
      hasText: Math.random() > 0.7, // 30% chance of having text
      extractedText: Math.random() > 0.8 ? 'Sample extracted text' : undefined,
      adultContent: Math.random() * 0.3, // Low chance of adult content
      violence: Math.random() * 0.2, // Low chance of violence
      medicalContent: Math.random() * 0.1 // Very low chance of medical content
    };
  }

  /**
   * Apply moderation rules to content
   */
  private async applyModerationRules(
    content: any,
    analysis: ContentAnalysis
  ): Promise<ModerationFlag[]> {
    const flags: ModerationFlag[] = [];

    for (const rule of this.rules.filter(r => r.isActive)) {
      const flag = await this.applyRule(rule, content, analysis);
      if (flag) {
        flags.push(flag);
      }
    }

    return flags;
  }

  /**
   * Apply a single moderation rule
   */
  private async applyRule(
    rule: ModerationRule,
    content: any,
    analysis: ContentAnalysis
  ): Promise<ModerationFlag | null> {
    let confidence = 0;
    let triggered = false;

    switch (rule.type) {
      case 'keyword':
        if (rule.keywords && analysis.textAnalysis) {
          const text = [content.text, content.title, content.description]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          
          const matches = rule.keywords.filter(keyword => 
            text.includes(keyword.toLowerCase())
          );
          
          if (matches.length > 0) {
            confidence = Math.min(matches.length / rule.keywords.length, 1);
            triggered = confidence >= rule.threshold;
          }
        }
        break;

      case 'pattern':
        if (rule.pattern && analysis.textAnalysis) {
          const text = [content.text, content.title, content.description]
            .filter(Boolean)
            .join(' ');
          
          const regex = new RegExp(rule.pattern, 'gi');
          const matches = text.match(regex);
          
          if (matches) {
            confidence = Math.min(matches.length / 10, 1); // Normalize to 0-1
            triggered = confidence >= rule.threshold;
          }
        }
        break;

      case 'ml_model':
        // Simulate ML model prediction
        if (analysis.textAnalysis) {
          switch (rule.category) {
            case 'inappropriate_language':
              confidence = analysis.textAnalysis.toxicity;
              break;
            case 'adult_content':
              confidence = analysis.imageAnalysis?.adultContent || 0;
              break;
            case 'violence':
              confidence = analysis.imageAnalysis?.violence || 0;
              break;
            default:
              confidence = Math.random() * 0.5; // Low random confidence
          }
          triggered = confidence >= rule.threshold;
        }
        break;
    }

    if (triggered) {
      return {
        type: rule.category,
        severity: rule.severity,
        confidence,
        description: `Rule "${rule.name}" triggered with ${(confidence * 100).toFixed(1)}% confidence`,
        detectedBy: 'automated'
      };
    }

    return null;
  }

  /**
   * Calculate overall moderation status based on flags
   */
  private calculateModerationStatus(flags: ModerationFlag[]): {
    status: ContentModerationResult['status'];
    confidence: number;
  } {
    if (flags.length === 0) {
      return { status: 'approved', confidence: 0 };
    }

    // Calculate weighted confidence based on severity and individual confidences
    const severityWeights = { low: 1, medium: 2, high: 3, critical: 4 };
    
    let totalWeight = 0;
    let weightedConfidence = 0;

    flags.forEach(flag => {
      const weight = severityWeights[flag.severity];
      totalWeight += weight;
      weightedConfidence += flag.confidence * weight;
    });

    const overallConfidence = weightedConfidence / totalWeight;

    // Determine status based on thresholds
    if (overallConfidence >= this.config.autoRejectThreshold) {
      return { status: 'rejected', confidence: overallConfidence };
    } else if (overallConfidence >= this.config.requireReviewThreshold) {
      return { status: 'pending_review', confidence: overallConfidence };
    } else if (overallConfidence <= this.config.autoApproveThreshold) {
      return { status: 'approved', confidence: overallConfidence };
    } else {
      return { status: 'flagged', confidence: overallConfidence };
    }
  }

  /**
   * Initialize default moderation rules
   */
  private initializeDefaultRules(): void {
    this.rules = [
      {
        id: uuidv4(),
        name: 'Inappropriate Language',
        type: 'keyword',
        category: 'inappropriate_language',
        severity: 'medium',
        keywords: [
          'fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard',
          'idiot', 'stupid', 'moron', 'retard'
        ],
        isActive: true,
        threshold: 0.3,
        action: 'flag',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: 'Hate Speech',
        type: 'keyword',
        category: 'hate_speech',
        severity: 'high',
        keywords: [
          'hate', 'kill', 'murder', 'die', 'terrorist', 'nazi',
          'racist', 'discrimination'
        ],
        isActive: true,
        threshold: 0.2,
        action: 'require_review',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: 'Adult Content',
        type: 'keyword',
        category: 'adult_content',
        severity: 'high',
        keywords: [
          'sex', 'porn', 'nude', 'naked', 'xxx', 'adult',
          'erotic', 'sexual'
        ],
        isActive: true,
        threshold: 0.3,
        action: 'auto_reject',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: 'Spam Detection',
        type: 'pattern',
        category: 'spam',
        severity: 'low',
        pattern: '(buy now|click here|free money|guaranteed|limited time)',
        isActive: true,
        threshold: 0.4,
        action: 'flag',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: 'Violence Detection',
        type: 'ml_model',
        category: 'violence',
        severity: 'high',
        isActive: true,
        threshold: 0.6,
        action: 'require_review',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  /**
   * Add custom moderation rule
   */
  addRule(rule: Omit<ModerationRule, 'id' | 'createdAt' | 'updatedAt'>): string {
    const newRule: ModerationRule = {
      ...rule,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.rules.push(newRule);
    logger.info('Moderation rule added', { ruleId: newRule.id, name: newRule.name });
    
    return newRule.id;
  }

  /**
   * Update moderation rule
   */
  updateRule(ruleId: string, updates: Partial<ModerationRule>): boolean {
    const ruleIndex = this.rules.findIndex(r => r.id === ruleId);
    
    if (ruleIndex === -1) {
      return false;
    }

    const existingRule = this.rules[ruleIndex];
    if (!existingRule) {
      return false;
    }

    // Create updated rule with proper type safety
    const updatedRule: ModerationRule = {
      id: existingRule.id,
      name: updates.name ?? existingRule.name,
      type: updates.type ?? existingRule.type,
      category: updates.category ?? existingRule.category,
      severity: updates.severity ?? existingRule.severity,
      pattern: updates.pattern ?? existingRule.pattern,
      keywords: updates.keywords ?? existingRule.keywords,
      isActive: updates.isActive ?? existingRule.isActive,
      threshold: updates.threshold ?? existingRule.threshold,
      action: updates.action ?? existingRule.action,
      createdAt: existingRule.createdAt,
      updatedAt: new Date()
    };

    this.rules[ruleIndex] = updatedRule;

    logger.info('Moderation rule updated', { ruleId, updates });
    return true;
  }

  /**
   * Delete moderation rule
   */
  deleteRule(ruleId: string): boolean {
    const ruleIndex = this.rules.findIndex(r => r.id === ruleId);
    
    if (ruleIndex === -1) {
      return false;
    }

    this.rules.splice(ruleIndex, 1);
    logger.info('Moderation rule deleted', { ruleId });
    return true;
  }

  /**
   * Get all moderation rules
   */
  getRules(): ModerationRule[] {
    return [...this.rules];
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ModerationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Moderation config updated', { config: this.config });
  }

  /**
   * Get current configuration
   */
  getConfig(): ModerationConfig {
    return { ...this.config };
  }

  // Utility methods
  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);

    // Simple keyword extraction - get most frequent words
    const wordCount: Record<string, number> = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}