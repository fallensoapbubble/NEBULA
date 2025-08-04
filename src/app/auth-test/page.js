'use client';

import { LoginButton, UserMenu, AuthGuard, AuthStatus } from '../../../components/auth/index.js';

/**
 * Authentication Test Page
 * Demonstrates authentication components and functionality
 */
export default function AuthTestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Authentication Test Page</h1>
        
        {/* Authentication Status */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Authentication Status</h2>
          <AuthStatus showDetails={true} />
        </div>
        
        {/* Login Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Login Options</h2>
          <div className="flex flex-wrap gap-4">
            <LoginButton variant="primary">
              Login with GitHub
            </LoginButton>
            <LoginButton variant="secondary" size="sm">
              Small Login
            </LoginButton>
            <LoginButton variant="accent" size="lg">
              Large Login
            </LoginButton>
          </div>
        </div>
        
        {/* User Menu Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">User Menu</h2>
          <div className="flex justify-end">
            <UserMenu />
          </div>
        </div>
        
        {/* Protected Content */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Protected Content</h2>
          <AuthGuard requiredScopes={['public_repo']}>
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-6">
              <h3 className="text-lg font-medium text-green-300 mb-2">
                🎉 You have access to public repositories!
              </h3>
              <p className="text-green-200">
                This content is only visible to authenticated users with public_repo permissions.
              </p>
            </div>
          </AuthGuard>
        </div>
        
        {/* Private Repo Protected Content */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Private Repository Access</h2>
          <AuthGuard requiredScopes={['repo']}>
            <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-6">
              <h3 className="text-lg font-medium text-purple-300 mb-2">
                🔒 You have access to private repositories!
              </h3>
              <p className="text-purple-200">
                This content requires full repository access permissions.
              </p>
            </div>
          </AuthGuard>
        </div>
        
        {/* API Test Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">API Test</h2>
          <AuthGuard>
            <APITestComponent />
          </AuthGuard>
        </div>
      </div>
    </div>
  );
}

/**
 * Component to test GitHub API integration
 */
function APITestComponent() {
  const { useState } = require('react');
  const { useGitHubAPI } = require('../../../components/auth/index.js');
  
  const [repos, setRepos] = useState([]);
  const { apiRequest, isLoading, error } = useGitHubAPI();
  
  const fetchRepos = async () => {
    try {
      // This would be replaced with actual GitHub API endpoint
      const data = await apiRequest('/api/test/repos');
      setRepos(data.repositories || []);
    } catch (err) {
      console.error('Failed to fetch repos:', err);
    }
  };
  
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">GitHub API Test</h3>
        <button
          onClick={fetchRepos}
          disabled={isLoading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {isLoading ? 'Loading...' : 'Test API Call'}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
          <div className="text-red-300 font-medium">API Error:</div>
          <div className="text-red-200 text-sm">{error}</div>
        </div>
      )}
      
      {repos.length > 0 && (
        <div className="bg-white/5 rounded-lg p-4">
          <div className="text-white font-medium mb-2">Repositories:</div>
          <ul className="text-gray-300 text-sm space-y-1">
            {repos.map((repo, index) => (
              <li key={index}>• {repo}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}