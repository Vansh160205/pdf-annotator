import React from 'react';
import { Link } from 'react-router-dom';
import { useSearch } from '../contexts/SearchContext';

const SearchResults = ({ onResultClick }) => {
  const { searchState } = useSearch();
  
  if (!searchState.showResults) return null;
  
  if (searchState.loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Searching...</span>
        </div>
      </div>
    );
  }
  
  if (searchState.error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center text-red-600">
          <svg className="h-12 w-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {searchState.error}
        </div>
      </div>
    );
  }
  
  if (searchState.results.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center text-gray-500">
          <svg className="h-12 w-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p>No results found for "{searchState.query}"</p>
          <p className="text-sm mt-1">Try adjusting your search terms or filters</p>
        </div>
      </div>
    );
  }

  const formatContentType = (type) => {
    return type === 'pdf_text' ? 'PDF Text' : 'Annotation';
  };

  const handleResultClick = (result) => {
    if (onResultClick) {
      onResultClick(result);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Results Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Search Results
          </h3>
          <span className="text-sm text-gray-500">
            {searchState.pagination?.total || 0} results for "{searchState.query}"
          </span>
        </div>
      </div>

      {/* Results List */}
      <div className="divide-y divide-gray-200">
        {searchState.results.map((result, index) => (
          <div
            key={`${result.id}-${index}`}
            className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => handleResultClick(result)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {/* PDF Name and Page */}
                <div className="flex items-center space-x-2 mb-2">
                  <Link
                    to={`/pdf/${result.pdfUuid}`}
                    className="text-blue-600 hover:text-blue-800 font-medium truncate"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {result.pdfName}
                  </Link>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm text-gray-500">
                    Page {result.pageNumber}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    result.contentType === 'pdf_text' 
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {formatContentType(result.contentType)}
                  </span>
                </div>

                {/* Content Preview */}
                <div 
                  className="text-gray-700 mb-2 line-clamp-3"
                  dangerouslySetInnerHTML={{ __html: result.highlightedContent }}
                />

                {/* Metadata */}
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>Score: {(result.score * 100).toFixed(0)}%</span>
                  <span>
                    {new Date(result.createdAt).toLocaleDateString()}
                  </span>
                  {result.highlightId && (
                    <span className="text-yellow-600">• Highlighted Text</span>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="ml-4 flex-shrink-0">
                <Link
                  to={`/pdf/${result.pdfUuid}?page=${result.pageNumber}`}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {searchState.pagination && searchState.pagination.pages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Previous
              </button>
              <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing page <span className="font-medium">{searchState.pagination.current}</span> of{' '}
                  <span className="font-medium">{searchState.pagination.pages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  {/* Pagination buttons would go here */}
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchResults;