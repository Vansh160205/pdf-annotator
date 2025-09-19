import { useState, useEffect } from 'react';
import { cloudStorageAPI } from '../services/cloudStorageAPI';
import toast from 'react-hot-toast';

export const useGoogleAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const authenticate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await cloudStorageAPI.getAuthUrl();
      const url = res.data.url;
      window.open(url, '_blank');
      setIsAuthenticated(true); // For demo purposes
      setAccessToken('demo-access-token'); // Replace with real token
      toast.success('Connected to Google Drive');
    } catch (err) {
      console.error(err);
      setError('Failed to authenticate');
      toast.error('Failed to authenticate');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setAccessToken(null);
    toast.success('Disconnected from Google Drive');
  };

  return { isAuthenticated, accessToken, isLoading, error, authenticate, logout };
};
