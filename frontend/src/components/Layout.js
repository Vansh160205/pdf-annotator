import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSearch } from '../contexts/SearchContext';
import SearchBar from './SearchBar';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { clearSearch } = useSearch();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleLogout = () => {
    logout();
    clearSearch();
    navigate('/login');
  };

  const handleSearchResultClick = (result) => {
    const url = `/pdf/${result.pdfUuid}?page=${result.pageNumber}`;
    if (result.highlightId) {
      navigate(`${url}&highlight=${result.highlightId}`);
    } else {
      navigate(url);
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
        </svg>
      )
    },
    {
      name: 'Search',
      href: '/search',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left side - Logo */}
            <div className="flex items-center">
              <Link
                to="/dashboard"
                className="flex items-center space-x-2 text-xl font-bold text-gray-900"
              >
                <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>PDF Annotator</span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:ml-10 md:flex md:space-x-8">
                {navigationItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isActive(item.href)
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Center - Search Bar (on search page) */}
            {location.pathname === '/search' && (
              <div className="hidden md:flex md:flex-1 md:max-w-lg md:mx-8">
                <div className="w-full">
                  <SearchBar 
                    onResultClick={handleSearchResultClick}
                    showFilters={false}
                    placeholder="Search PDFs and annotations..."
                  />
                </div>
              </div>
            )}

            {/* Right side - User Menu */}
            <div className="flex items-center">
              {/* Quick Search Button (when not on search page) */}
              {location.pathname !== '/search' && (
                <Link
                  to="/search"
                  className="hidden md:flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors mr-4"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Search</span>
                </Link>
              )}

              {/* User Info */}
              <div className="flex items-center space-x-2 text-gray-700 mr-4">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm font-medium hidden sm:block">{user?.name}</span>
              </div>
              
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:block">Logout</span>
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden ml-2 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {showMobileMenu ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {showMobileMenu && (
            <div className="md:hidden">
              <div className="pt-2 pb-3 space-y-1">
                {navigationItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isActive(item.href)
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                    } block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors duration-200`}
                    onClick={() => setShowMobileMenu(false)}
                  >
                    <div className="flex items-center">
                      <span className="mr-3">{item.icon}</span>
                      {item.name}
                    </div>
                  </Link>
                ))}
              </div>

              {/* Mobile Search Bar */}
              <div className="pt-4 pb-3 border-t border-gray-200">
                <div className="px-4">
                  <SearchBar 
                    onResultClick={(result) => {
                      handleSearchResultClick(result);
                      setShowMobileMenu(false);
                    }}
                    showFilters={false}
                    placeholder="Search..."
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Search Results Header (only on search page) */}
      {location.pathname === '/search' && (
        <div className="bg-white border-b border-gray-200 md:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <SearchBar 
              onResultClick={handleSearchResultClick}
              showFilters={true}
              placeholder="Search PDFs and annotations..."
            />
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;