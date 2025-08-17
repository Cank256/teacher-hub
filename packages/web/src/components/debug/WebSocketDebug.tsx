import React, { useState, useEffect } from 'react';
import { websocketService } from '../../services/websocketService';
import { tokenStorage } from '../../utils/tokenStorage';
import { useAppSelector } from '../../store/hooks';

export const WebSocketDebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const { user, isAuthenticated, token } = useAppSelector((state) => state.auth);

  const updateDebugInfo = () => {
    const storedToken = tokenStorage.getToken();
    const connectionState = websocketService.getConnectionState();
    const isConnected = websocketService.isConnected();

    setDebugInfo({
      // Auth state
      isAuthenticated,
      userId: user?.id,
      userEmail: user?.email,
      reduxToken: token ? `${token.substring(0, 20)}...` : null,
      storedToken: storedToken ? `${storedToken.substring(0, 20)}...` : null,
      tokensMatch: token === storedToken,
      
      // WebSocket state
      connectionState,
      isConnected,
      connectionAttempts,
      
      // Environment
      backendUrl: import.meta.env.VITE_BACKEND_URL,
      
      // Storage check
      localStorage: {
        authToken: localStorage.getItem('auth_token') ? 'present' : 'missing',
        refreshToken: localStorage.getItem('refresh_token') ? 'present' : 'missing'
      },
      sessionStorage: {
        authToken: sessionStorage.getItem('auth_token') ? 'present' : 'missing',
        refreshToken: sessionStorage.getItem('refresh_token') ? 'present' : 'missing'
      }
    });
  };

  const testConnection = async () => {
    const token = tokenStorage.getToken();
    const userId = user?.id;
    
    if (!token || !userId) {
      console.error('Missing token or user ID for connection test');
      return;
    }

    try {
      setConnectionAttempts(prev => prev + 1);
      console.log('Testing WebSocket connection...');
      await websocketService.connect(userId, token);
      console.log('Connection test successful');
    } catch (error) {
      console.error('Connection test failed:', error);
    }
    
    updateDebugInfo();
  };

  const testTokenValidity = async () => {
    const token = tokenStorage.getToken();
    if (!token) {
      console.log('No token to test');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const profile = await response.json();
        console.log('✅ Token is valid:', profile);
      } else {
        const error = await response.json();
        console.log('❌ Token is invalid:', error);
      }
    } catch (error) {
      console.error('Token validation error:', error);
    }
  };

  useEffect(() => {
    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, [user, isAuthenticated, token]);

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md text-xs font-mono z-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-sm">WebSocket Debug</h3>
        <button
          onClick={() => setDebugInfo({})}
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-2">
        <div>
          <strong>Auth Status:</strong>
          <div className={`ml-2 ${debugInfo.isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
            {debugInfo.isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
          </div>
        </div>

        <div>
          <strong>User:</strong>
          <div className="ml-2">
            ID: {debugInfo.userId || 'null'}<br/>
            Email: {debugInfo.userEmail || 'null'}
          </div>
        </div>

        <div>
          <strong>Tokens:</strong>
          <div className="ml-2">
            Redux: {debugInfo.reduxToken || 'null'}<br/>
            Stored: {debugInfo.storedToken || 'null'}<br/>
            Match: {debugInfo.tokensMatch ? '✅' : '❌'}
          </div>
        </div>

        <div>
          <strong>WebSocket:</strong>
          <div className={`ml-2 ${debugInfo.isConnected ? 'text-green-600' : 'text-red-600'}`}>
            State: {debugInfo.connectionState}<br/>
            Connected: {debugInfo.isConnected ? '✅' : '❌'}<br/>
            Attempts: {debugInfo.connectionAttempts}
          </div>
        </div>

        <div>
          <strong>Storage:</strong>
          <div className="ml-2">
            Local: {debugInfo.localStorage?.authToken}<br/>
            Session: {debugInfo.sessionStorage?.authToken}
          </div>
        </div>

        <div>
          <strong>Backend URL:</strong>
          <div className="ml-2">{debugInfo.backendUrl}</div>
        </div>

        <div className="flex space-x-2 mt-3">
          <button
            onClick={testConnection}
            className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
          >
            Test Connection
          </button>
          <button
            onClick={testTokenValidity}
            className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
          >
            Test Token
          </button>
        </div>
      </div>
    </div>
  );
};