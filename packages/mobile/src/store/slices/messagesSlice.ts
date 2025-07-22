import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';

export interface Message {
  id: string;
  senderId: string;
  recipientId?: string;
  groupId?: string;
  content: string;
  type: 'text' | 'file' | 'image';
  timestamp: string;
  readBy: string[];
  syncStatus: 'synced' | 'pending' | 'failed';
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  title: string;
  avatar?: string;
}

export interface MessagesState {
  conversations: Conversation[];
  messages: {[conversationId: string]: Message[]};
  isLoading: boolean;
  error: string | null;
  activeConversation: string | null;
}

const initialState: MessagesState = {
  conversations: [],
  messages: {},
  isLoading: false,
  error: null,
  activeConversation: null,
};

export const fetchConversations = createAsyncThunk(
  'messages/fetchConversations',
  async () => {
    // This would call the actual API
    return [];
  }
);

export const fetchMessages = createAsyncThunk(
  'messages/fetchMessages',
  async (conversationId: string) => {
    // This would call the actual API
    return {conversationId, messages: []};
  }
);

export const sendMessage = createAsyncThunk(
  'messages/sendMessage',
  async (messageData: {
    conversationId: string;
    content: string;
    type: 'text' | 'file' | 'image';
  }) => {
    // This would send the message via API
    const message: Message = {
      id: Date.now().toString(),
      senderId: 'current-user-id',
      content: messageData.content,
      type: messageData.type,
      timestamp: new Date().toISOString(),
      readBy: [],
      syncStatus: 'pending',
    };
    return {conversationId: messageData.conversationId, message};
  }
);

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    setActiveConversation: (state, action: PayloadAction<string | null>) => {
      state.activeConversation = action.payload;
    },
    addMessage: (state, action: PayloadAction<{conversationId: string; message: Message}>) => {
      const {conversationId, message} = action.payload;
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      state.messages[conversationId].push(message);
    },
    markMessageAsRead: (state, action: PayloadAction<{conversationId: string; messageId: string}>) => {
      const {conversationId, messageId} = action.payload;
      const messages = state.messages[conversationId];
      if (messages) {
        const message = messages.find(m => m.id === messageId);
        if (message && !message.readBy.includes('current-user-id')) {
          message.readBy.push('current-user-id');
        }
      }
    },
    updateMessageSyncStatus: (state, action: PayloadAction<{
      conversationId: string;
      messageId: string;
      status: 'synced' | 'pending' | 'failed';
    }>) => {
      const {conversationId, messageId, status} = action.payload;
      const messages = state.messages[conversationId];
      if (messages) {
        const message = messages.find(m => m.id === messageId);
        if (message) {
          message.syncStatus = status;
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.conversations = action.payload;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const {conversationId, messages} = action.payload;
        state.messages[conversationId] = messages;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        const {conversationId, message} = action.payload;
        if (!state.messages[conversationId]) {
          state.messages[conversationId] = [];
        }
        state.messages[conversationId].push(message);
      });
  },
});

export const {
  setActiveConversation,
  addMessage,
  markMessageAsRead,
  updateMessageSyncStatus,
} = messagesSlice.actions;
export default messagesSlice.reducer;