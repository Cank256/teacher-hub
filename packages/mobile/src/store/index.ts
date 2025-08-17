import {configureStore} from '@reduxjs/toolkit';
import {persistStore, persistReducer} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import resourcesReducer from './slices/resourcesSlice';
import messagesReducer from './slices/messagesSlice';
import offlineReducer from './slices/offlineSlice';
import postsReducer from './slices/postsSlice';
import communitiesReducer from './slices/communitiesSlice';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'user', 'offline'], // Only persist these reducers
};

const rootReducer = {
  auth: persistReducer(persistConfig, authReducer),
  user: userReducer,
  resources: resourcesReducer,
  messages: messagesReducer,
  offline: offlineReducer,
  posts: postsReducer,
  communities: communitiesReducer,
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;