import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { ApiClient } from '../apiClient';
import { createMockError, createMockApiResponse } from '../../../test/testUtils';

// Mock axios
const mockAxios = new MockAdapter(axios);

describe('ApiClient', () => {
  let apiClient: ApiClient;

  beforeEach(() => {
    apiClient = new ApiClient({
      baseURL: 'https://api.test.com',
      timeout: 5000,
    });
    mockAxios.reset();
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('GET requests', () => {
    it('should make successful GET request', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockAxios.onGet('/test').reply(200, mockData);

      const response = await apiClient.get('/test');

      expect(response.data).toEqual(mockData);
      expect(response.status).toBe(200);
    });

    it('should handle GET request with query parameters', async () => {
      const mockData = { results: [] };
      mockAxios.onGet('/test').reply(200, mockData);

      await apiClient.get('/test', { params: { page: 1, limit: 10 } });

      expect(mockAxios.history.get[0].params).toEqual({ page: 1, limit: 10 });
    });

    it('should handle GET request errors', async () => {
      mockAxios.onGet('/test').reply(404, { error: 'Not found' });

      await expect(apiClient.get('/test')).rejects.toThrow();
    });
  });

  describe('POST requests', () => {
    it('should make successful POST request', async () => {
      const postData = { name: 'New Item' };
      const mockResponse = { id: 1, ...postData };
      mockAxios.onPost('/test').reply(201, mockResponse);

      const response = await apiClient.post('/test', postData);

      expect(response.data).toEqual(mockResponse);
      expect(response.status).toBe(201);
    });

    it('should handle POST request with form data', async () => {
      const formData = new FormData();
      formData.append('file', 'test-file');
      mockAxios.onPost('/upload').reply(200, { success: true });

      await apiClient.post('/upload', formData);

      expect(mockAxios.history.post[0].data).toBeInstanceOf(FormData);
    });

    it('should handle POST request validation errors', async () => {
      const errorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid data',
          details: { field: 'name is required' },
        },
      };
      mockAxios.onPost('/test').reply(400, errorResponse);

      await expect(apiClient.post('/test', {})).rejects.toThrow();
    });
  });

  describe('PUT requests', () => {
    it('should make successful PUT request', async () => {
      const updateData = { name: 'Updated Item' };
      const mockResponse = { id: 1, ...updateData };
      mockAxios.onPut('/test/1').reply(200, mockResponse);

      const response = await apiClient.put('/test/1', updateData);

      expect(response.data).toEqual(mockResponse);
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE requests', () => {
    it('should make successful DELETE request', async () => {
      mockAxios.onDelete('/test/1').reply(204);

      const response = await apiClient.delete('/test/1');

      expect(response.status).toBe(204);
    });
  });

  describe('Request interceptors', () => {
    it('should add authorization header when token is available', async () => {
      const token = 'test-token';
      apiClient.setAuthToken(token);
      mockAxios.onGet('/test').reply(200, {});

      await apiClient.get('/test');

      expect(mockAxios.history.get[0].headers?.Authorization).toBe(`Bearer ${token}`);
    });

    it('should add default headers', async () => {
      mockAxios.onGet('/test').reply(200, {});

      await apiClient.get('/test');

      const headers = mockAxios.history.get[0].headers;
      expect(headers?.['Content-Type']).toBe('application/json');
      expect(headers?.['X-Client-Type']).toBe('mobile');
    });
  });

  describe('Response interceptors', () => {
    it('should handle successful responses', async () => {
      const mockData = { success: true };
      mockAxios.onGet('/test').reply(200, mockData);

      const response = await apiClient.get('/test');

      expect(response.data).toEqual(mockData);
    });

    it('should handle 401 unauthorized responses', async () => {
      mockAxios.onGet('/test').reply(401, { error: 'Unauthorized' });

      await expect(apiClient.get('/test')).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      mockAxios.onGet('/test').networkError();

      await expect(apiClient.get('/test')).rejects.toThrow();
    });
  });

  describe('Retry logic', () => {
    it('should retry failed requests', async () => {
      mockAxios
        .onGet('/test')
        .replyOnce(500, { error: 'Server error' })
        .onGet('/test')
        .reply(200, { success: true });

      const response = await apiClient.get('/test');

      expect(response.data).toEqual({ success: true });
      expect(mockAxios.history.get).toHaveLength(2);
    });

    it('should not retry non-retryable errors', async () => {
      mockAxios.onGet('/test').reply(400, { error: 'Bad request' });

      await expect(apiClient.get('/test')).rejects.toThrow();
      expect(mockAxios.history.get).toHaveLength(1);
    });

    it('should respect maximum retry attempts', async () => {
      mockAxios.onGet('/test').reply(500, { error: 'Server error' });

      await expect(apiClient.get('/test')).rejects.toThrow();
      expect(mockAxios.history.get).toHaveLength(4); // 1 initial + 3 retries
    });
  });

  describe('Request timeout', () => {
    it('should timeout long requests', async () => {
      mockAxios.onGet('/test').timeout();

      await expect(apiClient.get('/test')).rejects.toThrow();
    });
  });

  describe('Request cancellation', () => {
    it('should cancel requests when abort signal is provided', async () => {
      const controller = new AbortController();
      mockAxios.onGet('/test').reply(200, { success: true });

      const requestPromise = apiClient.get('/test', {
        signal: controller.signal,
      });

      controller.abort();

      await expect(requestPromise).rejects.toThrow();
    });
  });

  describe('Base URL configuration', () => {
    it('should use configured base URL', async () => {
      mockAxios.onGet('https://api.test.com/test').reply(200, {});

      await apiClient.get('/test');

      expect(mockAxios.history.get[0].url).toBe('https://api.test.com/test');
    });
  });

  describe('Error handling', () => {
    it('should transform API errors to application errors', async () => {
      const apiError = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: { field: 'email is invalid' },
        },
      };
      mockAxios.onPost('/test').reply(400, apiError);

      try {
        await apiClient.post('/test', {});
      } catch (error: any) {
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.message).toBe('Validation failed');
        expect(error.details).toEqual({ field: 'email is invalid' });
      }
    });

    it('should handle network connectivity errors', async () => {
      mockAxios.onGet('/test').networkError();

      try {
        await apiClient.get('/test');
      } catch (error: any) {
        expect(error.code).toBe('NETWORK_ERROR');
      }
    });
  });
});