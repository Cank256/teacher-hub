// Elasticsearch index mappings for Teacher Hub platform

export const resourceMapping = {
  properties: {
    id: {
      type: 'keyword'
    },
    title: {
      type: 'text',
      analyzer: 'custom_text_analyzer',
      fields: {
        keyword: {
          type: 'keyword'
        }
      }
    },
    description: {
      type: 'text',
      analyzer: 'custom_text_analyzer'
    },
    type: {
      type: 'keyword'
    },
    format: {
      type: 'keyword'
    },
    size: {
      type: 'long'
    },
    subjects: {
      type: 'keyword'
    },
    gradeLevels: {
      type: 'keyword'
    },
    curriculumAlignment: {
      type: 'keyword'
    },
    author: {
      properties: {
        id: {
          type: 'keyword'
        },
        fullName: {
          type: 'text',
          analyzer: 'custom_text_analyzer',
          fields: {
            keyword: {
              type: 'keyword'
            }
          }
        },
        verificationStatus: {
          type: 'keyword'
        }
      }
    },
    isGovernmentContent: {
      type: 'boolean'
    },
    verificationStatus: {
      type: 'keyword'
    },
    downloadCount: {
      type: 'integer'
    },
    rating: {
      type: 'float'
    },
    tags: {
      type: 'keyword'
    },
    createdAt: {
      type: 'date'
    },
    updatedAt: {
      type: 'date'
    },
    // Additional fields for search optimization
    searchText: {
      type: 'text',
      analyzer: 'custom_text_analyzer'
    },
    popularity: {
      type: 'float'
    }
  }
};

export const userMapping = {
  properties: {
    id: {
      type: 'keyword'
    },
    email: {
      type: 'keyword'
    },
    fullName: {
      type: 'text',
      analyzer: 'custom_text_analyzer',
      fields: {
        keyword: {
          type: 'keyword'
        }
      }
    },
    subjects: {
      type: 'keyword'
    },
    gradeLevels: {
      type: 'keyword'
    },
    schoolLocation: {
      properties: {
        district: {
          type: 'keyword'
        },
        region: {
          type: 'keyword'
        },
        coordinates: {
          type: 'geo_point'
        }
      }
    },
    yearsExperience: {
      type: 'integer'
    },
    verificationStatus: {
      type: 'keyword'
    },
    bio: {
      type: 'text',
      analyzer: 'custom_text_analyzer'
    },
    specializations: {
      type: 'keyword'
    },
    // Additional fields for search and recommendations
    activityScore: {
      type: 'float'
    },
    connectionCount: {
      type: 'integer'
    },
    resourceCount: {
      type: 'integer'
    },
    lastActive: {
      type: 'date'
    },
    createdAt: {
      type: 'date'
    }
  }
};

export const communityMapping = {
  properties: {
    id: {
      type: 'keyword'
    },
    name: {
      type: 'text',
      analyzer: 'custom_text_analyzer',
      fields: {
        keyword: {
          type: 'keyword'
        }
      }
    },
    description: {
      type: 'text',
      analyzer: 'custom_text_analyzer'
    },
    type: {
      type: 'keyword'
    },
    memberCount: {
      type: 'integer'
    },
    isPrivate: {
      type: 'boolean'
    },
    tags: {
      type: 'keyword'
    },
    activityLevel: {
      type: 'float'
    },
    createdAt: {
      type: 'date'
    }
  }
};

// Index names
export const INDICES = {
  RESOURCES: 'teacher_hub_resources',
  USERS: 'teacher_hub_users',
  COMMUNITIES: 'teacher_hub_communities'
} as const;