# API Usage Examples

This document provides comprehensive examples of how to use the Teacher Hub Platform API for common scenarios.

## Authentication Examples

### User Registration and Login

```javascript
// Register a new user
const registerUser = async (userData) => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fullName: userData.fullName,
      email: userData.email,
      password: userData.password,
      subjects: userData.subjects,
      gradeLevels: userData.gradeLevels,
      region: userData.region
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
};

// Login user
const loginUser = async (email, password) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  const data = await response.json();
  
  // Store token for future requests
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  
  return data;
};

// Usage
try {
  const user = await registerUser({
    fullName: 'Jane Smith',
    email: 'jane.smith@school.edu',
    password: 'SecurePassword123!',
    subjects: ['mathematics', 'science'],
    gradeLevels: ['elementary'],
    region: 'ontario'
  });
  console.log('User registered:', user);
  
  const loginData = await loginUser('jane.smith@school.edu', 'SecurePassword123!');
  console.log('User logged in:', loginData);
} catch (error) {
  console.error('Authentication error:', error.message);
}
```

### Token Management

```javascript
// Get stored token
const getAuthToken = () => {
  return localStorage.getItem('accessToken');
};

// Create authenticated request headers
const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// Refresh token when expired
const refreshAuthToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ refreshToken })
  });
  
  if (!response.ok) {
    // Redirect to login if refresh fails
    window.location.href = '/login';
    return null;
  }
  
  const data = await response.json();
  localStorage.setItem('accessToken', data.accessToken);
  return data.accessToken;
};

// Authenticated request wrapper
const authenticatedFetch = async (url, options = {}) => {
  let token = getAuthToken();
  
  const makeRequest = async (authToken) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${authToken}`
      }
    });
  };
  
  let response = await makeRequest(token);
  
  // If token expired, try to refresh
  if (response.status === 401) {
    token = await refreshAuthToken();
    if (token) {
      response = await makeRequest(token);
    }
  }
  
  return response;
};
```

## Post Management Examples

### Creating Posts

```javascript
// Create a text post
const createTextPost = async (postData) => {
  const response = await authenticatedFetch('/api/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: postData.title,
      content: postData.content,
      tags: postData.tags,
      visibility: postData.visibility || 'public',
      communityId: postData.communityId // Optional
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
};

// Create a post with media attachments
const createPostWithMedia = async (postData, mediaFiles) => {
  const formData = new FormData();
  
  // Add text data
  formData.append('title', postData.title);
  formData.append('content', postData.content);
  formData.append('tags', JSON.stringify(postData.tags));
  formData.append('visibility', postData.visibility || 'public');
  
  if (postData.communityId) {
    formData.append('communityId', postData.communityId);
  }
  
  // Add media files
  mediaFiles.forEach((file, index) => {
    formData.append(`mediaFile${index}`, file);
  });
  
  const response = await authenticatedFetch('/api/posts', {
    method: 'POST',
    body: formData // Don't set Content-Type header for FormData
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
};

// Usage examples
try {
  // Simple text post
  const textPost = await createTextPost({
    title: 'New Teaching Strategy for Fractions',
    content: 'I discovered an amazing way to teach fractions using pizza slices...',
    tags: ['mathematics', 'fractions', 'elementary'],
    visibility: 'public'
  });
  console.log('Text post created:', textPost);
  
  // Post with image attachment
  const fileInput = document.getElementById('imageInput');
  const mediaPost = await createPostWithMedia({
    title: 'Visual Learning Materials',
    content: 'Here are some visual aids I created for my students.',
    tags: ['visual-learning', 'materials'],
    visibility: 'community',
    communityId: 'community-uuid-here'
  }, [fileInput.files[0]]);
  console.log('Media post created:', mediaPost);
} catch (error) {
  console.error('Post creation error:', error.message);
}
```

### Managing Posts

```javascript
// Get user's personalized feed
const getUserFeed = async (options = {}) => {
  const params = new URLSearchParams({
    page: options.page || 1,
    limit: options.limit || 20,
    sortBy: options.sortBy || 'created_at',
    sortOrder: options.sortOrder || 'desc',
    includeFollowing: options.includeFollowing !== false,
    includeCommunities: options.includeCommunities !== false
  });
  
  if (options.visibility) {
    options.visibility.forEach(v => params.append('visibility', v));
  }
  
  const response = await authenticatedFetch(`/api/posts/feed/user?${params}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
};

// Search posts
const searchPosts = async (query, filters = {}) => {
  const params = new URLSearchParams({
    q: query,
    page: filters.page || 1,
    limit: filters.limit || 20,
    sortBy: filters.sortBy || 'created_at',
    sortOrder: filters.sortOrder || 'desc'
  });
  
  // Add optional filters
  if (filters.authorId) params.append('authorId', filters.authorId);
  if (filters.communityId) params.append('communityId', filters.communityId);
  if (filters.visibility) params.append('visibility', filters.visibility);
  if (filters.hasMedia !== undefined) params.append('hasMedia', filters.hasMedia);
  if (filters.isPinned !== undefined) params.append('isPinned', filters.isPinned);
  
  if (filters.tags) {
    filters.tags.forEach(tag => params.append('tags', tag));
  }
  
  const response = await authenticatedFetch(`/api/posts/search/posts?${params}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
};

// Like/unlike a post
const togglePostLike = async (postId, isLiked) => {
  const method = isLiked ? 'DELETE' : 'POST';
  const response = await authenticatedFetch(`/api/posts/${postId}/like`, {
    method
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
};

// Add comment to post
const addComment = async (postId, content, parentCommentId = null) => {
  const response = await authenticatedFetch(`/api/posts/${postId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content,
      parentCommentId
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
};

// Usage examples
try {
  // Get user feed
  const feed = await getUserFeed({
    page: 1,
    limit: 10,
    visibility: ['public', 'community']
  });
  console.log('User feed:', feed);
  
  // Search for math-related posts
  const searchResults = await searchPosts('mathematics', {
    tags: ['elementary', 'fractions'],
    hasMedia: true
  });
  console.log('Search results:', searchResults);
  
  // Like a post
  await togglePostLike('post-uuid-here', false);
  console.log('Post liked');
  
  // Add a comment
  const comment = await addComment('post-uuid-here', 'Great post! Thanks for sharing.');
  console.log('Comment added:', comment);
} catch (error) {
  console.error('Post management error:', error.message);
}
```

## Community Management Examples

### Creating and Managing Communities

```javascript
// Create a new community
const createCommunity = async (communityData) => {
  const response = await authenticatedFetch('/api/communities', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: communityData.name,
      description: communityData.description,
      type: communityData.type,
      isPrivate: communityData.isPrivate || false,
      requiresApproval: communityData.requiresApproval || false,
      rules: communityData.rules || [],
      imageUrl: communityData.imageUrl
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
};

// Search communities
const searchCommunities = async (query, filters = {}) => {
  const params = new URLSearchParams({
    q: query,
    page: filters.page || 1,
    limit: filters.limit || 20,
    sortBy: filters.sortBy || 'member_count',
    sortOrder: filters.sortOrder || 'desc'
  });
  
  if (filters.type) params.append('type', filters.type);
  if (filters.isPrivate !== undefined) params.append('isPrivate', filters.isPrivate);
  if (filters.subjects) params.append('subjects', filters.subjects);
  if (filters.regions) params.append('regions', filters.regions);
  
  const response = await authenticatedFetch(`/api/communities?${params}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
};

// Join a community
const joinCommunity = async (communityId) => {
  const response = await authenticatedFetch(`/api/communities/${communityId}/join`, {
    method: 'POST'
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
};

// Get community members
const getCommunityMembers = async (communityId, options = {}) => {
  const params = new URLSearchParams({
    page: options.page || 1,
    limit: options.limit || 20
  });
  
  const response = await authenticatedFetch(`/api/communities/${communityId}/members?${params}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
};

// Manage community members (for owners/moderators)
const promoteMember = async (communityId, memberId) => {
  const response = await authenticatedFetch(`/api/communities/${communityId}/members/${memberId}/promote`, {
    method: 'POST'
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
};

// Usage examples
try {
  // Create a subject-based community
  const community = await createCommunity({
    name: 'Elementary Mathematics Teachers',
    description: 'A community for elementary school math teachers to share resources and strategies.',
    type: 'subject',
    isPrivate: false,
    requiresApproval: true,
    rules: [
      {
        title: 'Be Respectful',
        description: 'Treat all members with respect and professionalism.',
        order: 1
      },
      {
        title: 'Stay On Topic',
        description: 'Keep discussions focused on elementary mathematics education.',
        order: 2
      }
    ]
  });
  console.log('Community created:', community);
  
  // Search for math communities
  const communities = await searchCommunities('mathematics', {
    type: 'subject',
    isPrivate: false
  });
  console.log('Found communities:', communities);
  
  // Join a community
  const joinResult = await joinCommunity('community-uuid-here');
  console.log('Join result:', joinResult);
  
  // Get community members
  const members = await getCommunityMembers('community-uuid-here');
  console.log('Community members:', members);
} catch (error) {
  console.error('Community management error:', error.message);
}
```

## Messaging Examples

### Real-time Messaging

```javascript
// Initialize WebSocket connection
const initializeMessaging = () => {
  const socket = io('ws://localhost:3001', {
    auth: {
      token: getAuthToken()
    }
  });
  
  // Connection events
  socket.on('connect', () => {
    console.log('Connected to messaging server');
  });
  
  socket.on('disconnect', () => {
    console.log('Disconnected from messaging server');
  });
  
  // Message events
  socket.on('new_message', (message) => {
    console.log('New message received:', message);
    displayMessage(message);
  });
  
  socket.on('message_read', (data) => {
    console.log('Message read:', data);
    updateMessageStatus(data.messageId, 'read');
  });
  
  socket.on('user_typing', (data) => {
    console.log('User typing:', data);
    showTypingIndicator(data.userId);
  });
  
  return socket;
};

// Send message via WebSocket
const sendMessage = (socket, messageData) => {
  socket.emit('send_message', {
    recipientId: messageData.recipientId,
    content: messageData.content,
    type: messageData.type || 'text',
    attachments: messageData.attachments || []
  });
};

// Send typing indicator
const sendTypingIndicator = (socket, recipientId) => {
  socket.emit('typing', { recipientId });
};

// REST API messaging (fallback)
const sendMessageREST = async (messageData) => {
  const response = await authenticatedFetch('/api/messages/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      recipientId: messageData.recipientId,
      content: messageData.content,
      type: messageData.type || 'text',
      attachments: messageData.attachments || []
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
};

// Get conversations
const getConversations = async (options = {}) => {
  const params = new URLSearchParams({
    page: options.page || 1,
    limit: options.limit || 20
  });
  
  const response = await authenticatedFetch(`/api/messages/conversations?${params}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
};

// Get messages in a conversation
const getConversationMessages = async (conversationId, options = {}) => {
  const params = new URLSearchParams({
    page: options.page || 1,
    limit: options.limit || 50
  });
  
  const response = await authenticatedFetch(`/api/messages/conversations/${conversationId}/messages?${params}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
};

// Search users for messaging
const searchUsers = async (query, filters = {}) => {
  const params = new URLSearchParams({
    q: query,
    page: filters.page || 1,
    limit: filters.limit || 20
  });
  
  if (filters.subjects) params.append('subjects', filters.subjects);
  if (filters.gradeLevels) params.append('gradeLevels', filters.gradeLevels);
  if (filters.regions) params.append('regions', filters.regions);
  if (filters.verificationStatus) params.append('verificationStatus', filters.verificationStatus);
  
  const response = await authenticatedFetch(`/api/messages/users/search?${params}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
};

// Mark messages as read
const markMessagesAsRead = async (conversationId, messageIds) => {
  const response = await authenticatedFetch(`/api/messages/conversations/${conversationId}/read`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messageIds
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
};

// Usage examples
try {
  // Initialize WebSocket messaging
  const socket = initializeMessaging();
  
  // Send a message via WebSocket
  sendMessage(socket, {
    recipientId: 'user-uuid-here',
    content: 'Hello! How are your students responding to the new curriculum?',
    type: 'text'
  });
  
  // Get user conversations
  const conversations = await getConversations({ limit: 10 });
  console.log('Conversations:', conversations);
  
  // Get messages from a conversation
  const messages = await getConversationMessages('conversation-uuid-here');
  console.log('Messages:', messages);
  
  // Search for users to message
  const users = await searchUsers('john', {
    subjects: 'mathematics',
    verificationStatus: 'verified'
  });
  console.log('Found users:', users);
  
  // Mark messages as read
  await markMessagesAsRead('conversation-uuid-here', ['message-1', 'message-2']);
  console.log('Messages marked as read');
} catch (error) {
  console.error('Messaging error:', error.message);
}
```

## Resource Management Examples

### Uploading Resources

```javascript
// Upload a document resource
const uploadDocument = async (file, metadata) => {
  const formData = new FormData();
  
  // Add file
  formData.append('file', file);
  
  // Add metadata
  formData.append('title', metadata.title);
  formData.append('description', metadata.description);
  formData.append('subjects', JSON.stringify(metadata.subjects));
  formData.append('gradeLevels', JSON.stringify(metadata.gradeLevels));
  
  if (metadata.curriculumAlignment) {
    formData.append('curriculumAlignment', JSON.stringify(metadata.curriculumAlignment));
  }
  
  if (metadata.tags) {
    formData.append('tags', JSON.stringify(metadata.tags));
  }
  
  const response = await authenticatedFetch('/api/resources/upload', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
};

// Upload a video resource (automatically uploaded to YouTube)
const uploadVideo = async (videoFile, metadata) => {
  // Validate file size (100MB limit)
  if (videoFile.size > 100 * 1024 * 1024) {
    throw new Error('Video file must be under 100MB');
  }
  
  // Validate file type
  const supportedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm'];
  if (!supportedTypes.includes(videoFile.type)) {
    throw new Error('Unsupported video format');
  }
  
  const formData = new FormData();
  formData.append('file', videoFile);
  formData.append('title', metadata.title);
  formData.append('description', metadata.description);
  formData.append('subjects', JSON.stringify(metadata.subjects));
  formData.append('gradeLevels', JSON.stringify(metadata.gradeLevels));
  
  if (metadata.tags) {
    formData.append('tags', JSON.stringify(metadata.tags));
  }
  
  const response = await authenticatedFetch('/api/resources/upload', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
};

// Monitor video upload status
const monitorVideoUpload = async (resourceId) => {
  const checkStatus = async () => {
    const response = await authenticatedFetch(`/api/resources/${resourceId}/youtube-status`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }
    
    return await response.json();
  };
  
  // Poll status every 5 seconds until completed
  return new Promise((resolve, reject) => {
    const pollInterval = setInterval(async () => {
      try {
        const status = await checkStatus();
        console.log('Upload status:', status.video.uploadStatus);
        
        if (status.video.uploadStatus === 'completed') {
          clearInterval(pollInterval);
          resolve(status);
        } else if (status.video.uploadStatus === 'failed') {
          clearInterval(pollInterval);
          reject(new Error('Video upload failed'));
        }
      } catch (error) {
        clearInterval(pollInterval);
        reject(error);
      }
    }, 5000);
  });
};

// Usage examples
try {
  // Upload a PDF document
  const fileInput = document.getElementById('documentInput');
  const documentResource = await uploadDocument(fileInput.files[0], {
    title: 'Grade 5 Math Worksheets',
    description: 'Comprehensive worksheets covering fractions, decimals, and percentages.',
    subjects: ['mathematics'],
    gradeLevels: ['grade-5'],
    curriculumAlignment: ['ontario-math-curriculum'],
    tags: ['worksheets', 'fractions', 'decimals', 'percentages']
  });
  console.log('Document uploaded:', documentResource);
  
  // Upload a video
  const videoInput = document.getElementById('videoInput');
  const videoResource = await uploadVideo(videoInput.files[0], {
    title: 'Teaching Fractions with Visual Models',
    description: 'A 15-minute instructional video showing how to use visual models to teach fractions.',
    subjects: ['mathematics', 'pedagogy'],
    gradeLevels: ['elementary'],
    tags: ['fractions', 'visual-models', 'instruction']
  });
  console.log('Video uploaded:', videoResource);
  
  // Monitor video processing
  const finalStatus = await monitorVideoUpload(videoResource.resource.id);
  console.log('Video processing completed:', finalStatus);
} catch (error) {
  console.error('Resource upload error:', error.message);
}
```

### Searching and Managing Resources

```javascript
// Search resources
const searchResources = async (query, filters = {}) => {
  const params = new URLSearchParams({
    q: query,
    page: filters.page || 1,
    limit: filters.limit || 20,
    sortBy: filters.sortBy || 'created_at',
    sortOrder: filters.sortOrder || 'desc'
  });
  
  if (filters.type) params.append('type', filters.type);
  if (filters.verificationStatus) params.append('verificationStatus', filters.verificationStatus);
  if (filters.hasVideo !== undefined) params.append('hasVideo', filters.hasVideo);
  
  if (filters.subjects) {
    if (Array.isArray(filters.subjects)) {
      params.append('subjects', filters.subjects.join(','));
    } else {
      params.append('subjects', filters.subjects);
    }
  }
  
  if (filters.gradeLevels) {
    if (Array.isArray(filters.gradeLevels)) {
      params.append('gradeLevels', filters.gradeLevels.join(','));
    } else {
      params.append('gradeLevels', filters.gradeLevels);
    }
  }
  
  const response = await authenticatedFetch(`/api/resources/search?${params}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
};

// Get resource details
const getResource = async (resourceId) => {
  const response = await authenticatedFetch(`/api/resources/${resourceId}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
};

// Download resource
const downloadResource = async (resourceId) => {
  const response = await authenticatedFetch(`/api/resources/${resourceId}/download`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  const data = await response.json();
  
  // Open download URL in new tab
  window.open(data.downloadUrl, '_blank');
  
  return data;
};

// Rate a resource
const rateResource = async (resourceId, rating, review = null) => {
  const response = await authenticatedFetch(`/api/resources/${resourceId}/rate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      rating,
      review
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
};

// Get user's own resources
const getMyResources = async (options = {}) => {
  const params = new URLSearchParams({
    page: options.page || 1,
    limit: options.limit || 20
  });
  
  const response = await authenticatedFetch(`/api/resources/my-resources?${params}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
};

// Usage examples
try {
  // Search for math resources
  const mathResources = await searchResources('fractions', {
    subjects: ['mathematics'],
    gradeLevels: ['elementary', 'middle'],
    type: 'video',
    verificationStatus: 'verified'
  });
  console.log('Math resources:', mathResources);
  
  // Get detailed resource information
  const resource = await getResource('resource-uuid-here');
  console.log('Resource details:', resource);
  
  // Download a resource
  await downloadResource('resource-uuid-here');
  console.log('Download initiated');
  
  // Rate a resource
  await rateResource('resource-uuid-here', 5, 'Excellent resource! Very helpful for my students.');
  console.log('Resource rated');
  
  // Get my uploaded resources
  const myResources = await getMyResources({ page: 1, limit: 10 });
  console.log('My resources:', myResources);
} catch (error) {
  console.error('Resource management error:', error.message);
}
```

## Error Handling Best Practices

### Comprehensive Error Handling

```javascript
// Custom error class for API errors
class APIError extends Error {
  constructor(response, data) {
    super(data.error.message);
    this.name = 'APIError';
    this.code = data.error.code;
    this.status = response.status;
    this.timestamp = data.error.timestamp;
    this.details = data.error.details;
  }
}

// Enhanced fetch wrapper with error handling
const apiRequest = async (url, options = {}) => {
  try {
    const response = await authenticatedFetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new APIError(response, errorData);
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    
    // Network or other errors
    throw new Error(`Network error: ${error.message}`);
  }
};

// Error handling utility
const handleAPIError = (error) => {
  if (error instanceof APIError) {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        console.error('Validation failed:', error.details);
        showValidationErrors(error.details);
        break;
      
      case 'AUTHENTICATION_REQUIRED':
        console.error('Authentication required');
        redirectToLogin();
        break;
      
      case 'AUTHORIZATION_FAILED':
        console.error('Insufficient permissions');
        showErrorMessage('You do not have permission to perform this action.');
        break;
      
      case 'RESOURCE_NOT_FOUND':
        console.error('Resource not found');
        showErrorMessage('The requested resource was not found.');
        break;
      
      case 'FILE_TOO_LARGE':
        console.error('File too large');
        showErrorMessage('The uploaded file is too large. Please choose a smaller file.');
        break;
      
      case 'YOUTUBE_QUOTA_EXCEEDED':
        console.error('YouTube quota exceeded');
        showErrorMessage('Video upload temporarily unavailable. Please try again later.');
        break;
      
      default:
        console.error('API error:', error.message);
        showErrorMessage('An unexpected error occurred. Please try again.');
    }
  } else {
    console.error('Network error:', error.message);
    showErrorMessage('Network error. Please check your connection and try again.');
  }
};

// Usage with error handling
const safeAPICall = async (apiFunction, ...args) => {
  try {
    return await apiFunction(...args);
  } catch (error) {
    handleAPIError(error);
    throw error; // Re-throw if needed for component handling
  }
};

// Example usage
try {
  const posts = await safeAPICall(getUserFeed, { page: 1, limit: 10 });
  console.log('Posts loaded successfully:', posts);
} catch (error) {
  // Error already handled by handleAPIError
  console.log('Failed to load posts');
}
```

This comprehensive set of examples covers all major API functionality with proper error handling, authentication, and best practices for integration with the Teacher Hub Platform API.