/**
 * Portfolio Header Component
 * Displays the main header section of a portfolio
 */

import Image from 'next/image';
import Link from 'next/link';
import { PortfolioNavigation } from './PortfolioNavigation';

export function PortfolioHeader({ portfolioData, repository, navigation, className = '' }) {
  return (
    <header className={`bg-gradient-to-r from-blue-600 to-purple-600 text-white ${className}`}>
      {/* Navigation Bar */}
      {navigation && navigation.menu && navigation.menu.length > 0 && (
        <nav className="border-b border-blue-500 border-opacity-30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Link 
                  href={`/${repository.owner}/${repository.name}`}
                  className="text-white font-semibold hover:text-blue-100 transition-colors"
                >
                  {portfolioData.name}
                </Link>
              </div>
              
              <div className="hidden md:flex space-x-1">
                {navigation.menu.map((item, index) => {
                  const itemUrl = item.external ? item.path : `/${repository.owner}/${repository.name}/${item.path}`;
                  
                  return (
                    <Link
                      key={index}
                      href={itemUrl}
                      className="px-3 py-2 rounded-md text-sm font-medium text-white hover:text-blue-100 hover:bg-white hover:bg-opacity-10 transition-colors"
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
              </div>

              {/* Mobile Navigation */}
              <div className="md:hidden">
                <PortfolioNavigation
                  navigation={navigation}
                  repository={repository}
                  mobile
                />
              </div>
            </div>
          </div>
        </nav>
      )}
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          {/* Avatar */}
          {portfolioData.avatar && (
            <div className="mb-6">
              <Image
                src={portfolioData.avatar}
                alt={portfolioData.name}
                width={120}
                height={120}
                className="rounded-full mx-auto border-4 border-white shadow-lg"
              />
            </div>
          )}

          {/* Name */}
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {portfolioData.name}
          </h1>

          {/* Title */}
          {portfolioData.title && (
            <p className="text-xl md:text-2xl text-blue-100 mb-6">
              {portfolioData.title}
            </p>
          )}

          {/* Description */}
          {portfolioData.description && (
            <p className="text-lg text-blue-50 max-w-3xl mx-auto mb-8">
              {portfolioData.description}
            </p>
          )}

          {/* Repository Link */}
          <div className="flex justify-center items-center space-x-4">
            <Link
              href={repository.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
              </svg>
              View on GitHub
            </Link>

            {/* Contact Links */}
            {portfolioData.contact && (
              <div className="flex space-x-3">
                {portfolioData.contact.email && (
                  <Link
                    href={`mailto:${portfolioData.contact.email}`}
                    className="p-3 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
                    title="Email"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </Link>
                )}

                {portfolioData.contact.linkedin && (
                  <Link
                    href={portfolioData.contact.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
                    title="LinkedIn"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" />
                    </svg>
                  </Link>
                )}

                {portfolioData.contact.twitter && (
                  <Link
                    href={portfolioData.contact.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
                    title="Twitter"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
                    </svg>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default PortfolioHeader;