'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PortfolioTemplate } from './templates/PortfolioTemplate.js';
import { BlogTemplate } from './templates/BlogTemplate.js';
import { MinimalTemplate } from './templates/MinimalTemplate.js';

/**
 * Portfolio Renderer Component
 * Dynamically renders portfolios based on template type and content
 */
export function PortfolioRenderer({ portfolioData, username, repo }) {
  const [theme, setTheme] = useState('dark');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulate loading time for smooth transition
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <PortfolioLoadingState />;
  }

  if (error) {
    return <PortfolioErrorState error={error} username={username} repo={repo} />;
  }

  try {
    // Determine which template to use
    const TemplateComponent = getTemplateComponent(portfolioData.template);
    
    return (
      <div className={`portfolio-container ${theme}`}>
        {/* Theme Toggle */}
        <ThemeToggle theme={theme} onThemeChange={setTheme} />
        
        {/* Portfolio Content */}
        <TemplateComponent
          content={portfolioData.content}
          template={portfolioData.template}
          metadata={portfolioData.metadata}
          repository={portfolioData.repository}
          theme={theme}
        />
        
        {/* Portfolio Footer */}
        <PortfolioFooter 
          username={username} 
          repo={repo} 
          generatedAt={portfolioData.metadata.generatedAt}
        />
      </div>
    );
  } catch (renderError) {
    console.error('Portfolio render error:', renderError);
    return <PortfolioErrorState error={renderError} username={username} repo={repo} />;
  }
}

/**
 * Get the appropriate template component based on template analysis
 */
function getTemplateComponent(templateAnalysis) {
  // Check if template specifies a custom component
  if (templateAnalysis.previewComponent) {
    switch (templateAnalysis.previewComponent.toLowerCase()) {
      case 'blogtemplate':
        return BlogTemplate;
      case 'minimaltemplate':
        return MinimalTemplate;
      case 'portfoliotemplate':
      default:
        return PortfolioTemplate;
    }
  }
  
  // Fallback based on template type
  switch (templateAnalysis.templateType) {
    case 'markdown':
      return BlogTemplate;
    case 'json':
      return PortfolioTemplate;
    case 'hybrid':
      return PortfolioTemplate;
    default:
      return PortfolioTemplate;
  }
}

/**
 * Theme Toggle Component
 */
function ThemeToggle({ theme, onThemeChange }) {
  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
        className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-full p-3 text-white hover:bg-white/20 transition-all duration-300"
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      >
        {theme === 'dark' ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        )}
      </button>
    </div>
  );
}

/**
 * Portfolio Loading State
 */
function PortfolioLoadingState() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white/80">Loading portfolio...</p>
      </div>
    </div>
  );
}

/**
 * Portfolio Error State
 */
function PortfolioErrorState({ error, username, repo }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 text-center">
        <div className="text-6xl mb-6">⚠️</div>
        
        <h1 className="text-2xl font-bold text-white mb-4">
          Rendering Error
        </h1>
        
        <p className="text-white/80 mb-6">
          An error occurred while rendering this portfolio.
        </p>
        
        <div className="text-sm text-white/60 mb-6">
          <p><strong>Repository:</strong> {username}/{repo}</p>
          <p><strong>Error:</strong> {error.message}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <a 
            href={`https://github.com/${username}/${repo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg px-4 py-2 text-white text-sm transition-colors"
          >
            View on GitHub
          </a>
          <button 
            onClick={() => window.location.reload()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 text-white text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Portfolio Footer Component
 */
function PortfolioFooter({ username, repo, generatedAt }) {
  return (
    <footer className="border-t border-white/10 bg-black/20 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between text-sm text-white/60">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <span>Powered by</span>
            <Link 
              href="/"
              className="text-white/80 hover:text-white transition-colors font-medium"
            >
              Nebula
            </Link>
          </div>
          
          <div className="flex items-center space-x-6">
            <a 
              href={`https://github.com/${username}/${repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
              </svg>
              <span>View Source</span>
            </a>
            
            <span className="text-white/40">
              Generated {new Date(generatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default PortfolioRenderer;