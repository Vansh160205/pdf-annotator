// Search.js
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchResults from '../components/SearchResults';
import { useSearch } from '../contexts/SearchContext';

const Search = () => {
  const navigate = useNavigate();
  const { clearSearch } = useSearch();

  const handleResultClick = (result) => {
    const url = `/pdf/${result.pdfUuid}?page=${result.pageNumber}`;
    if (result.highlightId) {
      navigate(`${url}&highlight=${result.highlightId}`);
    } else {
      navigate(url);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Search Results
        </h1>
        <p className="text-gray-600">
          Find content across all your PDFs and highlights
        </p>
      </div>

      <div className="space-y-6">
        <SearchResults onResultClick={handleResultClick} />
      </div>
    </div>
  );
};

export default Search;