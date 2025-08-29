/**
 * Enhanced Portfolio Renderer Component
 * Uses the Template Rendering Engine for dynamic template rendering
 * Supports multiple data formats and dynamic component rendering
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { TemplateRenderingEngine } from '../../lib/template-rendering-engine';
import { PortfolioHeader } from './PortfolioHeader';
import { AboutSection } from './AboutSection';
import { ProjectsSection } from './ProjectsSection';
import { SkillsSection } from './SkillsSection';
import { ContactSection } from './ContactSection';
import { MinimalTemplate } from './templates/MinimalTemplate';
import { ModernTemplate } from './templates/ModernTemplate';
import { ClassicTemplate } from './templates/ClassicTemplate';

/**
 * Enhanced Portfolio Renderer Component
 * @param {object} props - Component props
 * @param {object} props.portfolioData - Portfolio data from GitHub repository
 * @param {object} props.repository - Repository metadata
 * @param {string} [props.template] - Template name to use for rendering
 * @param {object} [props.templateOptions] - Additional template options
 */
export function EnhancedPortfolioRenderer({ 
  portfolioData, 
  repository, 
  template = 'default',
  templateOptions = {}
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processedData, setProcessedData] = useState(null);

  // Initialize template rendering engine
  const renderingEngine = useMemo(() => {
    return new TemplateRenderingEngine(templateOptions);
  }, [templateOptions]);

  // Process portfolio data when it changes
  useEffect(() => {
    if (!portfolioData) {
      setError('No portfolio data available');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const processed = renderingEngine.processPortfolioData(portfolioData, template);
      setProcessedData(processed);
      setError(null);
    } catch (err) {
      console.error('Error processing portfolio data:', err);
      setError(`Failed to process portfolio data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [portfolioData, template, renderingEngine]);

  if (error) {
    return <ErrorDisplay error={error} repository={repository} />;
  }

  if (isLoading || !processedData) {
    return <LoadingDisplay />;
  }

  // Render based on template
  return (
    <TemplateRenderer 
      processedData={processedData}
      repository={repository}
      originalData={portfolioData}
    />
  );
}

/**
 * Template Renderer Component
 * Renders the appropriate template based on processed data
 */
function TemplateRenderer({ processedData, repository, originalData }) {
  const { template, data, componentProps } = processedData;

  // Component mapping for dynamic rendering
  const componentMap = {
    PortfolioHeader,
    AboutSection,
    ProjectsSection,
    SkillsSection,
    ContactSection,
    MinimalHeader: PortfolioHeader,
    MinimalAbout: AboutSection,
    MinimalProjects: ProjectsSection,
    ModernHero: PortfolioHeader,
    ModernAbout: AboutSection,
    ModernProjects: ProjectsSection,
    ModernSkills: SkillsSection,
    ModernContact: ContactSection,
    ClassicNavigation: Navigation,
    ClassicHero: PortfolioHeader,
    ClassicAbout: AboutSection,
    ClassicProjects: ProjectsSection,
    ClassicContact: ContactSection
  };

  // Use specialized template components for complex layouts
  switch (template.id) {
    case 'minimal':
      return (
        <MinimalTemplate 
          data={data}
          componentProps={componentProps}
          repository={repository}
          componentMap={componentMap}
        />
      );
    
    case 'modern':
      return (
        <ModernTemplate 
          data={data}
          componentProps={componentProps}
          repository={repository}
          componentMap={componentMap}
        />
      );
    
    case 'classic':
      return (
        <ClassicTemplate 
          data={data}
          componentProps={componentProps}
          repository={repository}
          componentMap={componentMap}
        />
      );
    
    default:
      return (
        <DefaultTemplate 
          data={data}
          componentProps={componentProps}
          repository={repository}
          componentMap={componentMap}
        />
      );
  }
}

/**
 * Default Template Component
 */
function DefaultTemplate({ data, componentProps, repository, componentMap }) {
  const { styling } = data;

  return (
    <div 
      className="min-h-screen bg-white"
      style={{
        '--primary-color': styling?.colors?.primary || '#3B82F6',
        '--secondary-color': styling?.colors?.secondary || '#1E40AF',
        '--accent-color': styling?.colors?.accent || '#60A5FA',
        '--background-color': styling?.colors?.background || '#F8FAFC',
        '--text-color': styling?.colors?.text || '#1F2937'
      }}
    >
      {/* Header */}
      <DynamicSection
        section="header"
        componentProps={componentProps}
        componentMap={componentMap}
        repository={repository}
      />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* About Section */}
        <DynamicSection
          section="about"
          componentProps={componentProps}
          componentMap={componentMap}
          className="mb-12"
        />

        {/* Projects Section */}
        <DynamicSection
          section="projects"
          componentProps={componentProps}
          componentMap={componentMap}
          className="mb-12"
        />

        {/* Skills Section */}
        <DynamicSection
          section="skills"
          componentProps={componentProps}
          componentMap={componentMap}
          className="mb-12"
        />

        {/* Contact Section */}
        <DynamicSection
          section="contact"
          componentProps={componentProps}
          componentMap={componentMap}
          className="mb-12"
        />
      </main>

      {/* Footer */}
      <PortfolioFooter repository={repository} data={data} />
    </div>
  );
}

/**
 * Dynamic Section Component
 * Renders sections dynamically based on component mapping
 */
function DynamicSection({ 
  section, 
  componentProps, 
  componentMap, 
  repository, 
  className = '' 
}) {
  const props = componentProps[section];
  
  if (!props || !props.data) {
    return null;
  }

  // Get component name from template configuration
  const componentName = `${section.charAt(0).toUpperCase()}${section.slice(1)}Section`;
  const Component = componentMap[componentName] || componentMap[section];

  if (!Component) {
    console.warn(`Component not found for section: ${section}`);
    return null;
  }

  return (
    <div className={className}>
      <Component 
        {...props}
        repository={repository}
      />
    </div>
  );
}

/**
 * Navigation Component for Classic Template
 */
function Navigation({ data, repository }) {
  if (!data || !data.links) {
    return null;
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            {data.brand?.avatar && (
              <img
                src={data.brand.avatar}
                alt={data.brand.name}
                className="w-10 h-10 rounded-full mr-3"
              />
            )}
            <h1 className="text-xl font-semibold text-gray-900">
              {data.brand?.name}
            </h1>
          </div>
          <div className="flex space-x-6">
            {data.links.map((link, index) => (
              <a
                key={index}
                href={link.href}
                className={`text-gray-600 hover:text-gray-900 ${
                  link.active ? 'font-semibold text-gray-900' : ''
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

/**
 * Portfolio Footer Component
 */
function PortfolioFooter({ repository, data }) {
  return (
    <footer className="bg-gray-50 border-t">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center">
          <div className="text-sm text-gray-600 mb-4 sm:mb-0">
            <p>
              Portfolio hosted from{' '}
              <a 
                href={repository?.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                {repository?.owner}/{repository?.name}
              </a>
            </p>
          </div>
          <div className="text-sm text-gray-500">
            Last updated: {new Date(data?.repository?.updatedAt || Date.now()).toLocaleDateString()}
          </div>
        </div>
      </div>
    </footer>
  );
}

/**
 * Loading Display Component
 */
function LoadingDisplay() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Processing portfolio data...</p>
      </div>
    </div>
  );
}

/**
 * Error Display Component
 */
function ErrorDisplay({ error, repository }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-4">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Portfolio Rendering Error</h1>
        <p className="text-gray-600 mb-4">{error}</p>
        {repository && (
          <p className="text-sm text-gray-500">
            Repository: {repository.owner}/{repository.name}
          </p>
        )}
      </div>
    </div>
  );
}

export default EnhancedPortfolioRenderer;