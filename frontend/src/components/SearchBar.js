import React, { useState, useRef, useEffect } from 'react';
import { useSearch } from '../contexts/SearchContext';

const SearchBar = ({ onResultClick, showFilters = true, placeholder = "Search PDFs and annotations..." }) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  
  const { 
    searchState, 
    searchHistory, 
    search, 
    getSuggestions, 
    clearSearch, 
    setFilters 
  } = useSearch();

  useEffect(() => {
    setInputValue(searchState.query);
  }, [searchState.query]);

  useEffect(() => {
    const delayedSuggestions = setTimeout(() => {
      if (inputValue.length >= 2) {
        getSuggestions(inputValue);
      }
    }, 300);

    return () => clearTimeout(delayedSuggestions);
  }, [inputValue, getSuggestions]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      search(inputValue.trim());
      setShowSuggestions(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (value.length >= 2) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion) => {
    setInputValue(suggestion);
    search(suggestion);
    setShowSuggestions(false);
    inputRef.current.focus();
  };

  const handleClear = () => {
    setInputValue('');
    clearSearch();
    setShowSuggestions(false);
    inputRef.current.focus();
  };

  const allSuggestions = [
    ...searchState.suggestions.map(s => ({ text: s.text, type: 'suggestion', count: s.count })),
    ...searchHistory.map(h => ({ text: h, type: 'history' }))
  ].slice(0, 8);

  return (
    <div className="relative">
      {/* Search Form */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => inputValue.length >= 2 && setShowSuggestions(true)}
            placeholder={placeholder}
            className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {searchState.loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && allSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          {allSuggestions.map((item, index) => (
            <div
              key={`${item.type}-${item.text}-${index}`}
              onClick={() => selectSuggestion(item.text)}
              className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center">
                {item.type === 'history' ? (
                  <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
                <span className="text-sm">{item.text}</span>
              </div>
              
              {item.type === 'suggestion' && item.count && (
                <span className="text-xs text-gray-500">{item.count} results</span>
              )}
              
              {item.type === 'history' && (
                <span className="text-xs text-gray-400">Recent</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="mt-2 flex flex-wrap gap-2">
          <select
            value={searchState.filters.contentType}
            onChange={(e) => setFilters({ contentType: e.target.value })}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="all">All Content</option>
            <option value="pdf_text">PDF Text</option>
            <option value="annotation">Annotations</option>
          </select>
        </div>
      )}

      {/* Error Display */}
      {searchState.error && (
        <div className="mt-2 text-sm text-red-600">
          {searchState.error}
        </div>
      )}
    </div>
  );
};

export default SearchBar;