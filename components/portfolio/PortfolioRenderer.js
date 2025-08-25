'use client';

/**
 * Portfolio Renderer Component
 * Renders portfolio data from GitHub repositories with dynamic template support
 */

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PortfolioHeader } from './PortfolioHeader';
import { AboutSection } from './AboutSection';
import { ProjectsSection } from './ProjectsSection';
import { SkillsSection } from './SkillsSection';
import { ContactSection } from './ContactSection';

/**
 * Main Portfolio Renderer Component
 * @param {object} props - Component props
 * @param {object} props.portfolioData - Portfolio data from GitHub repository
 * @param {object} props.repository - Repository metadata
 * @param {object} [props.navigation] - Navigation structure for multi-page portfolios
 * @param {string} [props.template] - Template name to use for rendering
 */
export function PortfolioRenderer({ portfolioData, repository, navigation, template = 'default' }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle client-side rendering state
  useEffect(() => {
    if (!portfolioData) {
      setError('No portfolio data available');
    }
  }, [portfolioData]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Portfolio Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  // Render based on template
  switch (template) {
    case 'minimal':
      return <MinimalTemplate portfolioData={portfolioData} repository={repository} navigation={navigation} />;
    case 'modern':
      return <ModernTemplate portfolioData={portfolioData} repository={repository} navigation={navigation} />;
    case 'classic':
      return <ClassicTemplate portfolioData={portfolioData} repository={repository} navigation={navigation} />;
    default:
      return <DefaultTemplate portfolioData={portfolioData} repository={repository} navigation={navigation} />;
  }
}

/**
 * Default Portfolio Template
 */
function DefaultTemplate({ portfolioData, repository, navigation }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header with Navigation */}
      <PortfolioHeader 
        portfolioData={portfolioData} 
        repository={repository}
        navigation={navigation}
      />
      
      {/* Navigation Menu */}
      {navigation && navigation.menu && navigation.menu.length > 0 && (
        <nav className="bg-white shadow-sm border-b sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center py-4">
              <div className="flex space-x-8">
                {navigation.menu.map((item, index) => {
                  const itemUrl = item.external ? item.path : `/${repository.owner}/${repository.name}/${item.path}`;
                  
                  return (
                    <Link
                      key={index}
                      href={itemUrl}
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
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
            </div>
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* About Section */}
        {portfolioData.about && (
          <AboutSection 
            about={portfolioData.about}
            className="mb-12"
          />
        )}

        {/* Projects Section */}
        {portfolioData.projects && portfolioData.projects.length > 0 && (
          <ProjectsSection 
            projects={portfolioData.projects}
            className="mb-12"
          />
        )}

        {/* Skills Section */}
        {portfolioData.skills && portfolioData.skills.length > 0 && (
          <SkillsSection 
            skills={portfolioData.skills}
            className="mb-12"
          />
        )}

        {/* Contact Section */}
        {portfolioData.contact && Object.keys(portfolioData.contact).length > 0 && (
          <ContactSection 
            contact={portfolioData.contact}
            social={portfolioData.social}
            className="mb-12"
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="text-sm text-gray-600 mb-4 sm:mb-0">
              <p>
                Portfolio hosted from{' '}
                <Link 
                  href={repository.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  {repository.owner}/{repository.name}
                </Link>
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {new Date(portfolioData.repository.updatedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * Minimal Portfolio Template
 */
function MinimalTemplate({ portfolioData, repository }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <header className="text-center mb-16">
          {portfolioData.avatar && (
            <div className="mb-6">
              <Image
                src={portfolioData.avatar}
                alt={portfolioData.name}
                width={120}
                height={120}
                className="rounded-full mx-auto"
              />
            </div>
          )}
          <h1 className="text-4xl font-light text-gray-900 mb-2">
            {portfolioData.name}
          </h1>
          {portfolioData.title && (
            <p className="text-xl text-gray-600 mb-4">{portfolioData.title}</p>
          )}
          {portfolioData.description && (
            <p className="text-gray-700 max-w-2xl mx-auto">{portfolioData.description}</p>
          )}
        </header>

        {/* Content Sections */}
        <div className="space-y-16">
          {portfolioData.about && (
            <section>
              <h2 className="text-2xl font-light text-gray-900 mb-6">About</h2>
              <div className="prose prose-gray max-w-none">
                <p>{portfolioData.about.content}</p>
              </div>
            </section>
          )}

          {portfolioData.projects && portfolioData.projects.length > 0 && (
            <section>
              <h2 className="text-2xl font-light text-gray-900 mb-6">Projects</h2>
              <div className="grid gap-6 md:grid-cols-2">
                {portfolioData.projects.map((project, index) => (
                  <div key={index} className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {project.name || project.title}
                    </h3>
                    <p className="text-gray-600 mb-4">{project.description}</p>
                    {project.url && (
                      <Link 
                        href={project.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View Project →
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">
            Hosted from{' '}
            <Link 
              href={repository.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-700 hover:text-gray-900"
            >
              GitHub
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}

/**
 * Modern Portfolio Template
 */
function ModernTemplate({ portfolioData, repository }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            {portfolioData.avatar && (
              <div className="mb-8">
                <Image
                  src={portfolioData.avatar}
                  alt={portfolioData.name}
                  width={150}
                  height={150}
                  className="rounded-full mx-auto shadow-lg"
                />
              </div>
            )}
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              {portfolioData.name}
            </h1>
            {portfolioData.title && (
              <p className="text-2xl text-blue-600 mb-6">{portfolioData.title}</p>
            )}
            {portfolioData.description && (
              <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                {portfolioData.description}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid gap-16">
            {/* About */}
            {portfolioData.about && (
              <section>
                <h2 className="text-3xl font-bold text-gray-900 mb-8">About Me</h2>
                <div className="prose prose-lg prose-blue max-w-none">
                  <p>{portfolioData.about.content}</p>
                </div>
              </section>
            )}

            {/* Projects */}
            {portfolioData.projects && portfolioData.projects.length > 0 && (
              <section>
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Featured Projects</h2>
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {portfolioData.projects.map((project, index) => (
                    <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                      <div className="p-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">
                          {project.name || project.title}
                        </h3>
                        <p className="text-gray-600 mb-4">{project.description}</p>
                        {project.technologies && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {project.technologies.map((tech, techIndex) => (
                              <span 
                                key={techIndex}
                                className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        )}
                        {project.url && (
                          <Link 
                            href={project.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View Project
                            <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-400">
              Portfolio powered by{' '}
              <Link 
                href={repository.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white hover:text-blue-400"
              >
                GitHub
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * Classic Portfolio Template
 */
function ClassicTemplate({ portfolioData, repository }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              {portfolioData.avatar && (
                <Image
                  src={portfolioData.avatar}
                  alt={portfolioData.name}
                  width={40}
                  height={40}
                  className="rounded-full mr-3"
                />
              )}
              <h1 className="text-xl font-semibold text-gray-900">
                {portfolioData.name}
              </h1>
            </div>
            <div className="flex space-x-6">
              <a href="#about" className="text-gray-600 hover:text-gray-900">About</a>
              <a href="#projects" className="text-gray-600 hover:text-gray-900">Projects</a>
              <a href="#contact" className="text-gray-600 hover:text-gray-900">Contact</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {portfolioData.title || `Welcome to ${portfolioData.name}'s Portfolio`}
          </h2>
          {portfolioData.description && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {portfolioData.description}
            </p>
          )}
        </div>
      </section>

      {/* Content Sections */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {portfolioData.about && (
          <section id="about" className="py-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">About</h2>
            <div className="prose prose-lg max-w-none">
              <p>{portfolioData.about.content}</p>
            </div>
          </section>
        )}

        {portfolioData.projects && portfolioData.projects.length > 0 && (
          <section id="projects" className="py-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Projects</h2>
            <div className="grid gap-8 md:grid-cols-2">
              {portfolioData.projects.map((project, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {project.name || project.title}
                  </h3>
                  <p className="text-gray-600 mb-4">{project.description}</p>
                  {project.url && (
                    <Link 
                      href={project.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View Project →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>
              © {new Date().getFullYear()} {portfolioData.name}. 
              Hosted from{' '}
              <Link 
                href={repository.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                GitHub
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default PortfolioRenderer;