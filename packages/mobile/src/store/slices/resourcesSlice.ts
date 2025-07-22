import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';

export interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'image' | 'document' | 'text';
  format: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  subjects: string[];
  gradeLevels: string[];
  author: {
    id: string;
    name: string;
    verified: boolean;
  };
  isGovernmentContent: boolean;
  downloadCount: number;
  rating: number;
  tags: string[];
  createdAt: string;
  isDownloaded?: boolean;
  localPath?: string;
}

export interface ResourcesState {
  resources: Resource[];
  downloadedResources: Resource[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  filters: {
    subjects: string[];
    gradeLevels: string[];
    type: string[];
  };
}

const initialState: ResourcesState = {
  resources: [],
  downloadedResources: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  filters: {
    subjects: [],
    gradeLevels: [],
    type: [],
  },
};

export const fetchResources = createAsyncThunk(
  'resources/fetchResources',
  async (params: {page?: number; limit?: number; search?: string}) => {
    // This would call the actual API
    // For now, return mock data
    return [];
  }
);

export const downloadResource = createAsyncThunk(
  'resources/downloadResource',
  async (resourceId: string) => {
    // This would download the resource and store it locally
    return {resourceId, localPath: `/local/path/${resourceId}`};
  }
);

const resourcesSlice = createSlice({
  name: 'resources',
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<ResourcesState['filters']>>) => {
      state.filters = {...state.filters, ...action.payload};
    },
    clearFilters: (state) => {
      state.filters = {
        subjects: [],
        gradeLevels: [],
        type: [],
      };
      state.searchQuery = '';
    },
    markResourceAsDownloaded: (state, action: PayloadAction<{id: string; localPath: string}>) => {
      const resource = state.resources.find(r => r.id === action.payload.id);
      if (resource) {
        resource.isDownloaded = true;
        resource.localPath = action.payload.localPath;
        state.downloadedResources.push(resource);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchResources.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchResources.fulfilled, (state, action) => {
        state.isLoading = false;
        state.resources = action.payload;
      })
      .addCase(fetchResources.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch resources';
      })
      .addCase(downloadResource.fulfilled, (state, action) => {
        const {resourceId, localPath} = action.payload;
        const resource = state.resources.find(r => r.id === resourceId);
        if (resource) {
          resource.isDownloaded = true;
          resource.localPath = localPath;
          state.downloadedResources.push(resource);
        }
      });
  },
});

export const {setSearchQuery, setFilters, clearFilters, markResourceAsDownloaded} = resourcesSlice.actions;
export default resourcesSlice.reducer;