// AppRoutes.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import Layout from '../components/Layout'
// Import your pages
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import PDFViewer from '../pages/PDFViewer';
import Search from '../pages/Search';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes - no layout */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Protected routes with layout */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/search" 
        element={
          <ProtectedRoute>
            <Layout>
              <Search />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      {/* PDF Viewer - no layout for full screen */}
      <Route 
        path="/pdf/:uuid" 
        element={
          <ProtectedRoute>
            <PDFViewer />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
};

export default AppRoutes;