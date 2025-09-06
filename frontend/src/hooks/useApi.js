import { useState, useCallback } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (method, url, data = null, config = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios({
        method,
        url: url.startsWith('http') ? url : `${API}${url}`,
        data,
        ...config
      });
      return { success: true, data: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'An error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const get = useCallback((url, config) => request('GET', url, null, config), [request]);
  const post = useCallback((url, data, config) => request('POST', url, data, config), [request]);
  const put = useCallback((url, data, config) => request('PUT', url, data, config), [request]);
  const del = useCallback((url, config) => request('DELETE', url, null, config), [request]);

  return {
    loading,
    error,
    clearError: () => setError(null),
    get,
    post,
    put,
    delete: del
  };
};