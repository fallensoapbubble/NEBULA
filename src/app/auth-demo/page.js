'use client';

import React, { useState } from 'react';
import { 
  AuthGuard, 
  AuthStatus, 
  LoginButton, 
  UserMenu, 
  AuthErrorBoundary,
  useAuth,
  usePermissions,
  useGitHubAPI
} from '../../../components/auth/index.js';
import AuthTest from '../../../components/auth/AuthTest.js';

/**
 * Authentication Demo Page
 * Showcases all authentication components and functionality
 */
export default function AuthDemoPage() {
  return (
    <AuthErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Header */}
        <header className="border-b border-white/10 bg-white/5 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-white">
                  Authentication Demo
                </h1>
              </div>
              <div className="flex items-center gap-4">
                <LoginButton />
                <UserMenu />
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Public Section */}
          <div className="mb-8">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">
                Public Section
              </h2>
              <p className="text-gray-300 mb-4">
                This section is visible to everyone, regardless of authentication status.
              </p>
              
              {/* Authentication Status */}
              <AuthStatus showDetails={true} className="mb-4" />
              
              {/* Login Button for unauthenticated users */}
              <div className="flex gap-4">
                <LoginButton variant="accent" size="lg">
                  Get Started with GitHub
                </LoginButton>
                <LoginButton variant="secondary" size="md" showIcon={false}>
                  Sign In
                </LoginButton>
              </div>
            </div>
          </div>

          {/* Protected Section */}
          <AuthGuard requiredScopes={['public_repo']}>
            <div className="mb-8">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Protected Section
                </h2>
                <p className="text-gray-300 mb-4">
                  This section is only visible to authenticated users with &apos;public_repo&apos; permissions.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* User Profile Card */}
                  <div className="bg-white/5 rounded-xl p-4">
                    <h3 className="text-lg font-semibold text-white mb-3">
                      User Profile
                    </h3>
                    <UserProfileCard />
                  </div>
                  
                  {/* Permissions Card */}
                  <div className="bg-white/5 rounded-xl p-4">
                    <h3 className="text-lg font-semibold text-white mb-3">
                      Permissions
                    </h3>
                    <PermissionsCard />
                  </div>
                </div>
              </div>
            </div>
          </AuthGuard>

          {/* Advanced Protected Section */}
          <AuthGuard requiredScopes={['repo']}>
            <div className="mb-8">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Advanced Protected Section
                </h2>
                <p className="text-gray-300 mb-4">
                  This section requires &apos;repo&apos; permissions (access to private repositories).
                </p>
                
                <div className="bg-indigo-500/20 border border-indigo-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <div>
                      <div className="text-indigo-300 font-medium">
                        Full Repository Access
                      </div>
                      <div className="text-indigo-200 text-sm">
                        You have access to both public and private repositories
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AuthGuard>

          {/* API Testing Section */}
          <AuthGuard>
            <div className="mb-8">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">
                  API Testing
                </h2>
                <APITestCard />
              </div>
            </div>
          </AuthGuard>
        </div>

        {/* Development Test Panel */}
        <AuthTest />
      </div>
    </AuthErrorBoundary>
  );
}

/**
 * User Profile Display Component
 */
function UserProfileCard() {
  const { user } = useAuth();
  
  if (!user) {
    return <div className="text-gray-400">No user data available</div>;
  }
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <img
          src={user.avatarUrl || user.avatar_url}
          alt={user.name || user.login}
          className="w-12 h-12 rounded-full border border-white/20"
        />
        <div>
          <div className="text-white font-medium">
            {user.name || user.login}
          </div>
          <div className="text-gray-400 text-sm">
            @{user.login}
          </div>
        </div>
      </div>
      
      {user.bio && (
        <p className="text-gray-300 text-sm">
          {user.bio}
        </p>
      )}
      
      <div className="flex gap-4 text-sm">
        {user.public_repos !== undefined && (
          <div className="text-gray-400">
            <span className="text-white font-medium">{user.public_repos}</span> repos
          </div>
        )}
        {user.followers !== undefined && (
          <div className="text-gray-400">
            <span className="text-white font-medium">{user.followers}</span> followers
          </div>
        )}
        {user.following !== undefined && (
          <div className="text-gray-400">
            <span className="text-white font-medium">{user.following}</span> following
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Permissions Display Component
 */
function PermissionsCard() {
  const permissions = usePermissions();
  
  const permissionInfo = [
    { scope: 'public_repo', label: 'Public Repositories', description: 'Access to public repositories' },
    { scope: 'repo', label: 'All Repositories', description: 'Access to public and private repositories' },
    { scope: 'user', label: 'User Profile', description: 'Access to user profile information' },
    { scope: 'user:email', label: 'Email Address', description: 'Access to user email addresses' }
  ];
  
  return (
    <div className="space-y-3">
      {permissionInfo.map(({ scope, label, description }) => {
        const hasPermission = permissions.hasPermission(scope);
        return (
          <div key={scope} className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${hasPermission ? 'bg-green-400' : 'bg-gray-600'}`} />
            <div className="flex-1">
              <div className={`text-sm font-medium ${hasPermission ? 'text-white' : 'text-gray-400'}`}>
                {label}
              </div>
              <div className="text-xs text-gray-500">
                {description}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * API Testing Component
 */
function APITestCard() {
  const { apiRequest, isLoading, error } = useGitHubAPI();
  const [testResult, setTestResult] = useState(null);
  
  const testAPI = async () => {
    try {
      const result = await apiRequest('/api/auth/validate');
      setTestResult(result);
    } catch (err) {
      setTestResult({ error: err.message });
    }
  };
  
  return (
    <div className="space-y-4">
      <p className="text-gray-300">
        Test the GitHub API integration by validating your current session.
      </p>
      
      <button
        onClick={testAPI}
        disabled={isLoading}
        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Testing...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Test API
          </>
        )}
      </button>
      
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
          <div className="text-red-300 text-sm">
            API Error: {error}
          </div>
        </div>
      )}
      
      {testResult && (
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-sm font-medium text-white mb-2">
            API Response:
          </div>
          <pre className="text-xs text-gray-300 overflow-auto">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}