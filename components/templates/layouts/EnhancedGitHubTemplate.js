/**
 * Enhanced GitHub Template Layout
 * A template that showcases advanced GitHub integration and custom CSS support
 */

import React from 'react';
import { usePortfolioData } from '../PortfolioDataProvider.js';
import { useTemplateStyle } from '../TemplateStyleProvider.js';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '../../ui/Card.js';
import { 
  GitHubFileRenderer, 
  TemplateSpecificRenderer, 
  CustomCSSRenderer, 
  RepositoryAssetRenderer,
  AdvancedProjectCard 
} from '../EnhancedTemplateComponents.js';
import { RepositoryStats, SocialLinks } from '../TemplateComponents.js';

/**
 * EnhancedGitHubTemplate - Advanced GitHub-integrated portfolio template
 */
export const EnhancedGitHubTemplate = ({ template, portfolioData, repositoryInfo, isPreview }) => {
  const { portfolio, getSection, hasSection, repository, getAssetUrl } = usePortfolioData();
  const { getThemeClass } = useTemplateStyle();

  // Extract custom CSS from repository files
  const customCSS = React.useMemo(() => {
    if (!portfolioData) return null;
    
    // Look for custom CSS files in the portfolio data
    const cssFiles = Object.keys(portfolioData).filter(path => 
      path.endsWith('.css') || path.endsWith('style.css') || path.endsWith('custom.css')
    );
    
    if (cssFiles.length > 0) {
      return portfolioData[cssFiles[0]]; // Use the first CSS file found
    }
    
    return null;
  }, [portfolioData]);

  return (
    <CustomCSSRenderer 
      cssContent={customCSS}
      repository={repository}
      scope="template"
    >
      <div className={getThemeClass('enhanced-github-template min-h-screen')}>
        {/* Enhanced Header with Repository Integration */}
        <header className="relative py-16 px-6 bg-gradient-to-br from-glass-1 to-glass-2">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <ProfileSection />
                {repository && (
                  <div className="repository-info bg-glass-1/50 p-4 rounded-lg border border-border-1">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-text-1">Repository</h3>
                      <a
                        href={repository.html_url || repository.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:text-accent-hover text-sm underline"
                      >
                        View on GitHub
                      </a>
                    </div>
                    <p className="text-text-2 text-sm mb-3">{repository.description}</p>
                    <RepositoryStats repository={repository} variant="compact" />
                  </div>
                )}
              </div>
              
              {/* Repository Asset Showcase */}
              <div className="space-y-4">
                {portfolio.metadata?.avatar && (
                  <RepositoryAssetRenderer
                    assetPath={portfolio.metadata.avatar}
                    repository={repository}
                    className="w-48 h-48 mx-auto rounded-full border-4 border-border-accent shadow-glass-lg"
                    fallback={
                      <div className="w-48 h-48 mx-auto rounded-full bg-glass-2 border-4 border-border-accent flex items-center justify-center">
                        <span className="text-4xl">👤</span>
                      </div>
                    }
                  />
                )}
                
                {/* Featured project or repository showcase */}
                {repository && (
                  <div className="text-center">
                    <div className="inline-flex items-center space-x-2 px-4 py-2 bg-accent/20 text-accent rounded-full text-sm">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                      </svg>
                      <span>Hosted on GitHub</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content with Template-Specific Rendering */}
        <main className="max-w-6xl mx-auto px-6 py-12">
          <div className="space-y-16">
            {/* About Section with GitHub File Rendering */}
            {hasSection('about') && (
              <section>
                <h2 className="text-3xl font-bold text-text-1 mb-8 text-center">About</h2>
                <GlassCard>
                  <GlassCardContent>
                    <GitHubFileRenderer
                      filePath="about.md"
                      fileContent={getSection('about')?.data}
                      repository={repository}
                      className="prose prose-invert max-w-none"
                    />
                  </GlassCardContent>
                </GlassCard>
              </section>
            )}

            {/* README Section */}
            {hasSection('readme') && (
              <section>
                <h2 className="text-3xl font-bold text-text-1 mb-8 text-center">README</h2>
                <GlassCard>
                  <GlassCardContent>
                    <GitHubFileRenderer
                      filePath="README.md"
                      fileContent={getSection('readme')?.data}
                      repository={repository}
                      className="prose prose-invert max-w-none"
                    />
                  </GlassCardContent>
                </GlassCard>
              </section>
            )}

            {/* Projects Section with Advanced Cards */}
            {hasSection('projects') && (
              <section>
                <h2 className="text-3xl font-bold text-text-1 mb-8 text-center">Projects</h2>
                <TemplateSpecificRenderer
                  template={template}
                  sectionName="projects"
                  sectionData={getSection('projects')?.data}
                  variant="grid"
                  className="projects-grid"
                />
              </section>
            )}

            {/* Skills Section with Template-Specific Layout */}
            {hasSection('skills') && (
              <section>
                <h2 className="text-3xl font-bold text-text-1 mb-8 text-center">Skills</h2>
                <TemplateSpecificRenderer
                  template={template}
                  sectionName="skills"
                  sectionData={getSection('skills')?.data}
                  variant="default"
                />
              </section>
            )}

            {/* Experience Section */}
            {hasSection('experience') && (
              <section>
                <h2 className="text-3xl font-bold text-text-1 mb-8 text-center">Experience</h2>
                <TemplateSpecificRenderer
                  template={template}
                  sectionName="experience"
                  sectionData={getSection('experience')?.data}
                  variant="list"
                />
              </section>
            )}

            {/* Custom Sections from Repository Files */}
            <CustomSectionsRenderer 
              portfolioData={portfolioData}
              repository={repository}
              template={template}
            />
          </div>
        </main>

        {/* Enhanced Footer */}
        <footer className="border-t border-border-1 py-12 px-6 bg-glass-1/30">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-text-1 mb-4">Get in Touch</h3>
                {portfolio.metadata?.social && (
                  <SocialLinks 
                    social={portfolio.metadata.social}
                    variant="vertical"
                    className="space-y-2"
                  />
                )}
              </div>

              {/* Repository Information */}
              {repository && (
                <div>
                  <h3 className="text-lg font-semibold text-text-1 mb-4">Repository</h3>
                  <div className="space-y-2 text-sm text-text-2">
                    <p>
                      <span className="font-medium">Owner:</span> {repository.owner?.login || repository.owner}
                    </p>
                    <p>
                      <span className="font-medium">Name:</span> {repository.name}
                    </p>
                    {repository.language && (
                      <p>
                        <span className="font-medium">Language:</span> {repository.language}
                      </p>
                    )}
                    {repository.updated_at && (
                      <p>
                        <span className="font-medium">Updated:</span>{' '}
                        {new Date(repository.updated_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Template Information */}
              <div>
                <h3 className="text-lg font-semibold text-text-1 mb-4">Template</h3>
                <div className="space-y-2 text-sm text-text-2">
                  <p>
                    <span className="font-medium">Type:</span> Enhanced GitHub Template
                  </p>
                  <p>
                    <span className="font-medium">Features:</span> Custom CSS, GitHub Integration
                  </p>
                  <p className="text-xs text-text-3 mt-4">
                    © {new Date().getFullYear()} {portfolio.metadata?.name || 'Portfolio'}. 
                    Built with Nebula.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </CustomCSSRenderer>
  );
};

/**
 * Profile Section Component
 */
const ProfileSection = () => {
  const { portfolio } = usePortfolioData();
  const profile = portfolio.metadata || {};

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-4xl md:text-5xl font-bold text-text-1 mb-2">
          {profile.name || 'Your Name'}
        </h1>
        {profile.title && (
          <p className="text-xl text-accent font-medium mb-4">{profile.title}</p>
        )}
        {profile.bio && (
          <p className="text-lg text-text-2 leading-relaxed">
            {profile.bio}
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Custom Sections Renderer - Renders additional sections found in repository files
 */
const CustomSectionsRenderer = ({ portfolioData, repository, template }) => {
  const customSections = React.useMemo(() => {
    if (!portfolioData) return [];

    const sections = [];
    const knownSections = ['about', 'readme', 'projects', 'skills', 'experience', 'contact'];
    
    // Look for additional markdown files that could be sections
    Object.entries(portfolioData).forEach(([filePath, content]) => {
      const fileName = filePath.split('/').pop()?.toLowerCase();
      
      if (fileName?.endsWith('.md') && !knownSections.some(section => fileName.includes(section))) {
        const sectionName = fileName.replace('.md', '').replace(/[-_]/g, ' ');
        sections.push({
          name: sectionName,
          title: sectionName.charAt(0).toUpperCase() + sectionName.slice(1),
          filePath,
          content
        });
      }
    });

    return sections;
  }, [portfolioData]);

  if (customSections.length === 0) {
    return null;
  }

  return (
    <>
      {customSections.map((section, index) => (
        <section key={index}>
          <h2 className="text-3xl font-bold text-text-1 mb-8 text-center">
            {section.title}
          </h2>
          <GlassCard>
            <GlassCardContent>
              <GitHubFileRenderer
                filePath={section.filePath}
                fileContent={section.content}
                repository={repository}
                className="prose prose-invert max-w-none"
              />
            </GlassCardContent>
          </GlassCard>
        </section>
      ))}
    </>
  );
};

export default EnhancedGitHubTemplate;