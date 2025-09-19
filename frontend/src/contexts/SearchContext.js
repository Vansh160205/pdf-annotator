// SearchContext.js
import React, { createContext, useContext, useState, useCallback } from 'react';
import { searchAPI } from '../services/api';

const SearchContext = createContext();

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

export const SearchProvider = ({ children }) => {
  const [searchState, setSearchState] = useState({
    query: '',
    results: [],
    loading: false,
    error: null,
    pagination: null,
    filters: {
      pdfUuid: null,
      contentType: 'all'
    },
    suggestions: [],
    showResults: false
  });

  const [searchHistory, setSearchHistory] = useState([]);

  const updateSearchState = useCallback((updates) => {
    setSearchState(prev => ({ ...prev, ...updates }));
  }, []);

  const search = useCallback(async (query, filters = {}) => {
    if (!query || query.trim().length < 2) {
      updateSearchState({
        results: [],
        error: 'Search query must be at least 2 characters',
        showResults: false
      });
      return;
    }

    updateSearchState({ loading: true, error: null });

    try {
      const response = await searchAPI.search({
        query: query.trim(),
        ...searchState.filters,
        ...filters
      });

      updateSearchState({
        results: response.data.results,
        pagination: response.data.pagination,
        loading: false,
        showResults: true,
        query: query.trim()
      });

      // Add to search history
      setSearchHistory(prev => {
        const newHistory = [query.trim(), ...prev.filter(h => h !== query.trim())];
        return newHistory.slice(0, 10); // Keep only last 10 searches
      });

    } catch (error) {
      updateSearchState({
        loading: false,
        error: error.response?.data?.error || 'Search failed',
        results: [],
        showResults: false
      });
    }
  }, [searchState.filters, updateSearchState]);

  const advancedSearch = useCallback(async (searchParams) => {
    updateSearchState({ loading: true, error: null });

    try {
      const response = await searchAPI.advancedSearch(searchParams);
      
      updateSearchState({
        results: response.data.results,
        pagination: response.data.pagination,
        loading: false,
        showResults: true,
        query: searchParams.query
      });

    } catch (error) {
      updateSearchState({
        loading: false,
        error: error.response?.data?.error || 'Advanced search failed',
        results: [],
        showResults: false
      });
    }
  }, [updateSearchState]);

  const getSuggestions = useCallback(async (query) => {
    if (!query || query.length < 2) {
      updateSearchState({ suggestions: [] });
      return;
    }

    try {
      const response = await searchAPI.getSuggestions(query);
      updateSearchState({ suggestions: response.data.suggestions });
    } catch (error) {
      console.error('Failed to get suggestions:', error);
    }
  }, [updateSearchState]);

  const clearSearch = useCallback(() => {
    updateSearchState({
      query: '',
      results: [],
      error: null,
      pagination: null,
      suggestions: [],
      showResults: false
    });
  }, [updateSearchState]);

  const setFilters = useCallback((filters) => {
    updateSearchState({
      filters: { ...searchState.filters, ...filters }
    });
  }, [searchState.filters, updateSearchState]);

  const indexPdf = useCallback(async (pdfUuid) => {
    try {
      const response = await searchAPI.indexPdf(pdfUuid);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to index PDF');
    }
  }, []);

  const value = {
    searchState,
    searchHistory,
    search,
    advancedSearch,
    getSuggestions,
    clearSearch,
    setFilters,
    indexPdf,
    updateSearchState
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};