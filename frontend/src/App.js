// App.js
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';

// Import your contexts
import { AuthProvider } from './contexts/AuthContext';
import { SearchProvider } from './contexts/SearchContext';

// Import routes
import AppRoutes from './routes/AppRoutes';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SearchProvider>
          <Router>
            <div className="App">
              <AppRoutes />
              
              <Toaster 
                position="top-right"
                toastOptions={{
                  duration: 3000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                }}
              />
            </div>
          </Router>
        </SearchProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;