/**
 * Portfolio Navigation Component
 * Provides navigation menu for multi-page portfolios
 * Supports automatic menu generation from repository structure
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Portfolio Navigation Component
 * @param {object} props - Component props
 * @param {object} props.navigation - Navigation structure
 * @param {object} props.repository - Repository information
 * @param {string} props.currentPage - Current page path
 * @param {boolean} props.mobile - Mobile navigation mode
 */
export function PortfolioNavigation({ 
  navigation, 
  repository, 
  currentPage, 
  mobile = false 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  if (!navigation || !navigation.menu || navigation.menu.length === 0) {
    return null;
  }

  const baseUrl = `/${repository.owner}/${repository.name}`;

  const NavigationItems = () => (
    <>
      {/* Home/Main Portfolio Link */}
      <Link
        href={baseUrl}
        className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          pathname === baseUrl
            ? 'bg-blue-100 text-blue-700'
            : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
        }`}
        onClick={() => mobile && setIsOpen(false)}
      >
        Home
      </Link>

      {/* Navigation Menu Items */}
      {navigation.menu.map((item, index) => {
        const itemUrl = item.external ? item.path : `${baseUrl}/${item.path}`;
        const isActive = currentPage === item.path || pathname === itemUrl;

        return (
          <Link
            key={index}
            href={itemUrl}
            className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
            }`}
            onClick={() => mobile && setIsOpen(false)}
            {...(item.external && { target: '_blank', rel: 'noopener noreferrer' })}
          >
            {item.title}
            {item.external && (
              <svg className="inline-block w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
              </svg>
            )}
          </Link>
        );
      })}
    </>
  );

  if (mobile) {
    return (
      <div className="md:hidden">
        {/* Mobile menu button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          aria-expanded="false"
        >
          <span className="sr-only">Open main menu</span>
          {!isOpen ? (
            <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          ) : (
            <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </button>

        {/* Mobile menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 bg-white shadow-lg border-t z-50">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <NavigationItems />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <nav className="hidden md:flex space-x-1">
      <NavigationItems />
    </nav>
  );
}

/**
 * Portfolio Breadcrumb Navigation
 * Shows current page location within portfolio structure
 */
export function PortfolioBreadcrumb({ navigation, repository, currentPage }) {
  const baseUrl = `/${repository.owner}/${repository.name}`;
  const pageInfo = navigation?.pages?.find(page => page.path === currentPage);

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
      <Link 
        href={baseUrl}
        className="hover:text-blue-600 transition-colors"
      >
        {repository.owner}/{repository.name}
      </Link>
      
      {pageInfo && (
        <>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          <span className="text-gray-900 font-medium">{pageInfo.title}</span>
        </>
      )}
    </nav>
  );
}

/**
 * Portfolio Section Navigation
 * Shows navigation within sections for large portfolios
 */
export function PortfolioSectionNavigation({ navigation, repository, currentSection }) {
  if (!navigation?.sections || navigation.sections.length <= 1) {
    return null;
  }

  const baseUrl = `/${repository.owner}/${repository.name}`;

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex space-x-8">
        {navigation.sections.map((section, index) => {
          const isActive = currentSection === section.name;
          const firstPageUrl = section.pages.length > 0 
            ? `${baseUrl}/${section.pages[0].path}`
            : baseUrl;

          return (
            <Link
              key={index}
              href={firstPageUrl}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                isActive
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {section.title}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default PortfolioNavigation;