// hooks/useSearch.js
import { useCallback } from 'react';
import { useSearch as useSearchContext } from '../contexts/SearchContext';
import { searchAPI } from '../services/api';

/**
 * Custom hook for search functionality
 * Provides a simplified interface to the search context
 */
const useSearch = () => {
  const {
    searchState,
    searchHistory,
    search,
    advancedSearch,
    getSuggestions,
    clearSearch,
    setFilters,
    indexPdf,
    updateSearchState
  } = useSearchContext();

  /**
   * Perform a basic search with the given query
   * @param {string} query - The search query
   * @param {Object} filters - Optional filters to apply
   * @returns {Promise} - Result of the search operation
   */
  const performSearch = useCallback(async (query, filters = {}) => {
    return search(query, filters);
  }, [search]);

  /**
   * Perform an advanced search with complex parameters
   * @param {Object} params - Advanced search parameters
   * @returns {Promise} - Result of the search operation
   */
  const performAdvancedSearch = useCallback(async (params) => {
    return advancedSearch(params);
  }, [advancedSearch]);

  /**
   * Get search suggestions for the given query
   * @param {string} query - The partial search query
   * @returns {Promise} - Suggestions for the query
   */
  const getQuerySuggestions = useCallback(async (query) => {
    return getSuggestions(query);
  }, [getSuggestions]);

  /**
   * Index a PDF document for search
   * @param {string} pdfUuid - The UUID of the PDF to index
   * @returns {Promise} - Result of the indexing operation
   */
  const indexDocument = useCallback(async (pdfUuid) => {
    try {
      return await indexPdf(pdfUuid);
    } catch (error) {
      console.error('Failed to index document:', error);
      throw error;
    }
  }, [indexPdf]);

  /**
   * Update the search filters
   * @param {Object} newFilters - The filters to apply
   */
  const updateFilters = useCallback((newFilters) => {
    setFilters(newFilters);
  }, [setFilters]);

  /**
   * Reset the search state
   */
  const reset = useCallback(() => {
    clearSearch();
  }, [clearSearch]);

  /**
   * Check if there are any active filters
   * @returns {boolean} - True if there are active filters
   */
  const hasActiveFilters = useCallback(() => {
    const { filters } = searchState;
    return (
      !!filters.pdfUuid || 
      (filters.contentType && filters.contentType !== 'all')
    );
  }, [searchState]);

  /**
   * Get the current search results
   * @returns {Array} - The current search results
   */
  const getResults = useCallback(() => {
    return searchState.results;
  }, [searchState.results]);

  return {
    // State
    query: searchState.query,
    results: searchState.results,
    loading: searchState.loading,
    error: searchState.error,
    pagination: searchState.pagination,
    filters: searchState.filters,
    suggestions: searchState.suggestions,
    showResults: searchState.showResults,
    history: searchHistory,
    
    // Methods
    performSearch,
    performAdvancedSearch,
    getQuerySuggestions,
    indexDocument,
    updateFilters,
    reset,
    hasActiveFilters,
    getResults,
    
    // Original context methods for advanced usage
    search,
    advancedSearch,
    getSuggestions,
    clearSearch,
    setFilters,
    indexPdf,
    updateSearchState
  };
};

export default useSearch;