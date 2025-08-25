/**
 * Portfolio Page Renderer Component
 * Renders individual portfolio pages with navigation and content
 * Supports multi-page portfolios with dynamic navigation
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PortfolioHeader } from './PortfolioHeader';
import { PortfolioNavigation, PortfolioBreadcrumb, PortfolioSectionNavigation } from './PortfolioNavigation';
import { PageContent } from './PageContent';
import { PortfolioNavigationService } from '../../lib/portfolio-navigation-service';

/**
 * Portfolio Page Renderer Component
 * @param {object} props - Component props
 * @param {object} props.portfolioData - Portfolio data
 * @param {object} props.repository - Repository information
 * @param {object} props.navigation - Navigation structure
 * @param {string} props.currentPage - Current page path
 * @param {object} props.pageContent - Page content data
 * @param {Array} props.suggestions - Improvement suggestions
 */
export function PortfolioPageRenderer({
  portfolioData,
  repository,
  navigation,
  currentPage,
  pageContent,
  suggestions = []
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);

  // Get current page info
  const pageInfo = navigation?.pages?.find(page => page.path === currentPage);
  const currentSection = pageInfo?.section;
  
  // Get navigation links (previous/next)
  const navigationService = new PortfolioNavigationService();
  const pageNavigation = navigation ? navigationService.getPageNavigation(currentPage, navigation) : { previous: null, next: null };
  const relatedPages = navigation ? navigationService.getRelatedPages(currentPage, navigation) : [];

  // Close mobile navigation on page change
  useEffect(() => {
    setIsNavigationOpen(false);
  }, [currentPage]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Navigation */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Portfolio Title/Logo */}
            <div className="flex items-center">
              <Link 
                href={`/${repository.owner}/${repository.name}`}
                className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
              >
                {portfolioData.avatar && (
                  <img
                    src={portfolioData.avatar}
                    alt={`${portfolioData.name || repository.owner}'s avatar`}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    {portfolioData.name || repository.owner}
                  </h1>
                  {pageInfo && (
                    <p className="text-sm text-gray-500">
                      {pageInfo.title}
                    </p>
                  )}
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <PortfolioNavigation
              navigation={navigation}
              repository={repository}
              currentPage={currentPage}
            />

            {/* Mobile Navigation Button */}
            <PortfolioNavigation
              navigation={navigation}
              repository={repository}
              currentPage={currentPage}
              mobile
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Navigation */}
        <PortfolioBreadcrumb
          navigation={navigation}
          repository={repository}
          currentPage={currentPage}
        />

        {/* Section Navigation */}
        <PortfolioSectionNavigation
          navigation={navigation}
          repository={repository}
          currentSection={currentSection}
        />

        {/* Page Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <PageContent
              pageContent={pageContent}
              pageInfo={pageInfo}
              portfolioData={portfolioData}
            />
            
            {/* Page Navigation */}
            {(pageNavigation.previous || pageNavigation.next) && (
              <div className="mt-12 pt-8 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    {pageNavigation.previous && (
                      <Link
                        href={`/${repository.owner}/${repository.name}/${pageNavigation.previous.path}`}
                        className="group flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <div>
                          <div className="text-sm text-gray-500">Previous</div>
                          <div className="font-medium">{pageNavigation.previous.title}</div>
                        </div>
                      </Link>
                    )}
                  </div>
                  
                  <div className="flex-1 text-right">
                    {pageNavigation.next && (
                      <Link
                        href={`/${repository.owner}/${repository.name}/${pageNavigation.next.path}`}
                        className="group flex items-center justify-end text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Next</div>
                          <div className="font-medium">{pageNavigation.next.title}</div>
                        </div>
                        <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Page Navigation Sidebar */}
              {navigation && navigation.pages && navigation.pages.length > 1 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Pages
                  </h3>
                  <nav className="space-y-1">
                    {navigation.pages.map((page, index) => {
                      const pageUrl = `/${repository.owner}/${repository.name}/${page.path}`;
                      const isActive = currentPage === page.path;

                      return (
                        <Link
                          key={index}
                          href={pageUrl}
                          className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                            isActive
                              ? 'bg-blue-100 text-blue-700 font-medium'
                              : 'text-gray-700 hover:text-blue-600 hover:bg-white'
                          }`}
                        >
                          {page.title}
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              )}

              {/* Repository Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Repository
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Owner:</span>{' '}
                    <span className="font-medium">{repository.owner}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Name:</span>{' '}
                    <span className="font-medium">{repository.name}</span>
                  </div>
                  <a
                    href={`https://github.com/${repository.owner}/${repository.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800"
                  >
                    View on GitHub
                    <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                      <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* Related Pages */}
              {relatedPages && relatedPages.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Related Pages
                  </h3>
                  <nav className="space-y-1">
                    {relatedPages.map((page, index) => {
                      const pageUrl = `/${repository.owner}/${repository.name}/${page.path}`;

                      return (
                        <Link
                          key={index}
                          href={pageUrl}
                          className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:text-blue-600 hover:bg-white transition-colors"
                        >
                          {page.title}
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              )}

              {/* Suggestions */}
              {suggestions && suggestions.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <button
                    onClick={() => setShowSuggestions(!showSuggestions)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <h3 className="text-sm font-semibold text-blue-900">
                      Improvement Suggestions
                    </h3>
                    <svg
                      className={`w-4 h-4 text-blue-600 transform transition-transform ${
                        showSuggestions ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showSuggestions && (
                    <div className="mt-3 space-y-2">
                      {suggestions.map((suggestion, index) => (
                        <div key={index} className="text-sm text-blue-800">
                          <div className="font-medium">{suggestion.type}</div>
                          <div className="text-blue-700">{suggestion.message}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-500">
              Powered by{' '}
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                GitHub
              </a>
              {' '}and hosted on{' '}
              <a
                href="https://vercel.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                Vercel
              </a>
            </div>
            
            <div className="mt-4 md:mt-0">
              <Link
                href={`/${repository.owner}/${repository.name}`}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                ← Back to Portfolio
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default PortfolioPageRenderer;