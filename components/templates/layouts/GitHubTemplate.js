/**
 * GitHub Template Layout
 * A template specifically designed for showcasing GitHub repositories and developer portfolios
 */

import React from 'react';
import { usePortfolioData } from '../PortfolioDataProvider.js';
import { useTemplateStyle } from '../TemplateStyleProvider.js';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '../../ui/Card.js';
import { 
  PortfolioSection, 
  PortfolioImage, 
  ProjectCard, 
  SkillBadge, 
  GitHubReadme,
  RepositoryStats,
  SocialLinks,
  ExperienceItem,
  ContactInfo
} from '../TemplateComponents.js';

/**
 * GitHubTemplate - Developer-focused template with GitHub integration
 */
export const GitHubTemplate = ({ template, portfolioData, repositoryInfo, isPreview }) => {
  const { 
    portfolio, 
    getSection, 
    hasSection, 
    getAssetUrl, 
    getRepositoryStats,
    getRepositoryUrl,
    getReadmeContent 
  } = usePortfolioData();
  const { getThemeClass } = useTemplateStyle();

  return (
    <div className={getThemeClass('github-template min-h-screen bg-gradient-to-br from-background-1 to-background-2')}>
      {/* Header Section with Repository Info */}
      <header className="relative py-16 px-6 border-b border-border-1">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2">
              <ProfileSection />
            </div>
            <div className="lg:col-span-1">
              <RepositoryInfoCard />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-12">
            {hasSection('readme') && <ReadmeSection />}
            {hasSection('about') && !hasSection('readme') && <AboutSection />}
            {hasSection('projects') && <ProjectsSection />}
            {hasSection('experience') && <ExperienceSection />}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-8">
            {hasSection('skills') && <SkillsSidebar />}
            {hasSection('education') && <EducationSidebar />}
            <ContributionActivity />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-1 py-8 px-6 mt-16">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-text-2 text-sm">
              <p>© {new Date().getFullYear()} {portfolio.metadata?.name || 'Developer Portfolio'}</p>
              <p className="mt-1">Built with Nebula • Powered by GitHub</p>
            </div>
            {repositoryInfo && (
              <div className="flex items-center space-x-4">
                <RepositoryStats repository={repositoryInfo} variant="compact" />
                <a 
                  href={repositoryInfo.html_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="glass-button glass-button-secondary text-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                  </svg>
                  View on GitHub
                </a>
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

/**
 * Profile Section Component
 */
const ProfileSection = () => {
  const { portfolio, getAssetUrl } = usePortfolioData();
  const profile = portfolio.metadata || {};

  return (
    <div className="space-y-6">
      <div className="flex items-start space-x-6">
        {/* Avatar */}
        {profile.avatar && (
          <div className="flex-shrink-0">
            <PortfolioImage
              src={profile.avatar}
              alt={profile.name || 'Profile'}
              className="w-24 h-24 rounded-full border-4 border-border-accent shadow-glass-lg"
            />
          </div>
        )}

        {/* Name and Bio */}
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl md:text-4xl font-bold text-text-1 mb-2">
            {profile.name || 'Developer'}
          </h1>
          {profile.title && (
            <p className="text-lg text-accent font-medium mb-3">{profile.title}</p>
          )}
          {profile.bio && (
            <p className="text-text-2 leading-relaxed mb-4">
              {profile.bio}
            </p>
          )}
          
          {/* Location and Company */}
          <div className="flex flex-wrap items-center gap-4 text-text-2 text-sm mb-4">
            {profile.location && (
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {profile.location}
              </div>
            )}
            {profile.company && (
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {profile.company}
              </div>
            )}
          </div>

          {/* Social Links */}
          {profile.social && (
            <SocialLinks social={profile.social} variant="default" className="flex-wrap" />
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Repository Info Card Component
 */
const RepositoryInfoCard = () => {
  const { repository, getRepositoryStats } = usePortfolioData();
  
  if (!repository) return null;

  const stats = getRepositoryStats();

  return (
    <GlassCard className="h-fit">
      <GlassCardHeader>
        <GlassCardTitle className="flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8z" clipRule="evenodd" />
          </svg>
          Repository
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-text-1">{repository.name}</h3>
          {repository.description && (
            <p className="text-text-2 text-sm mt-1">{repository.description}</p>
          )}
        </div>
        
        <RepositoryStats repository={repository} variant="vertical" />
        
        {repository.language && (
          <div className="flex items-center">
            <span className="w-3 h-3 bg-accent rounded-full mr-2"></span>
            <span className="text-text-2 text-sm">{repository.language}</span>
          </div>
        )}
        
        {repository.updated_at && (
          <div className="text-text-3 text-xs">
            Updated {new Date(repository.updated_at).toLocaleDateString()}
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  );
};

/**
 * README Section Component
 */
const ReadmeSection = () => {
  const { getReadmeContent, repository } = usePortfolioData();
  const readmeContent = getReadmeContent();

  if (!readmeContent) return null;

  return (
    <PortfolioSection sectionName="readme" title="README">
      <GlassCard>
        <GlassCardContent>
          <GitHubReadme 
            readmeContent={readmeContent}
            repository={repository}
            maxLength={2000}
            showReadMore={true}
          />
        </GlassCardContent>
      </GlassCard>
    </PortfolioSection>
  );
};

/**
 * About Section Component
 */
const AboutSection = () => {
  const { getSection } = usePortfolioData();
  const aboutSection = getSection('about');

  if (!aboutSection) return null;

  return (
    <PortfolioSection sectionName="about" title="About">
      <GlassCard>
        <GlassCardContent>
          {aboutSection.type === 'markdown' ? (
            <div 
              dangerouslySetInnerHTML={{ __html: aboutSection.data }}
              className="prose prose-invert max-w-none"
            />
          ) : (
            <p className="text-text-2 leading-relaxed">{aboutSection.data}</p>
          )}
        </GlassCardContent>
      </GlassCard>
    </PortfolioSection>
  );
};

/**
 * Projects Section Component
 */
const ProjectsSection = () => {
  const { getSectionData } = usePortfolioData();
  const projects = getSectionData('projects', []);

  if (!projects.length) return null;

  return (
    <PortfolioSection sectionName="projects" title="Projects">
      <div className="grid gap-6">
        {projects.map((project, index) => (
          <ProjectCard 
            key={index} 
            project={project} 
            variant="default"
            showGitHubStats={true}
            className="hover:shadow-glass-lg transition-all duration-300"
          />
        ))}
      </div>
    </PortfolioSection>
  );
};

/**
 * Experience Section Component
 */
const ExperienceSection = () => {
  const { getSectionData } = usePortfolioData();
  const experiences = getSectionData('experience', []);

  if (!experiences.length) return null;

  return (
    <PortfolioSection sectionName="experience" title="Experience">
      <div className="space-y-6">
        {experiences.map((exp, index) => (
          <GlassCard key={index}>
            <GlassCardContent>
              <ExperienceItem experience={exp} />
            </GlassCardContent>
          </GlassCard>
        ))}
      </div>
    </PortfolioSection>
  );
};

/**
 * Skills Sidebar Component
 */
const SkillsSidebar = () => {
  const { getSectionData } = usePortfolioData();
  const skills = getSectionData('skills', []);

  if (!skills.length) return null;

  return (
    <GlassCard>
      <GlassCardHeader>
        <GlassCardTitle>Skills</GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="space-y-4">
          {skills.map((skillGroup, index) => (
            <div key={index}>
              <h4 className="font-medium text-text-1 mb-2">
                {skillGroup.category}
              </h4>
              <div className="flex flex-wrap gap-2">
                {skillGroup.items.map((skill, i) => (
                  <SkillBadge
                    key={i}
                    skill={skill}
                    showLevel={true}
                    className="px-2 py-1 bg-glass-2 text-text-2 text-xs rounded-full border border-border-1"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </GlassCardContent>
    </GlassCard>
  );
};

/**
 * Education Sidebar Component
 */
const EducationSidebar = () => {
  const { getSectionData } = usePortfolioData();
  const education = getSectionData('education', []);

  if (!education.length) return null;

  return (
    <GlassCard>
      <GlassCardHeader>
        <GlassCardTitle>Education</GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="space-y-4">
          {education.map((edu, index) => (
            <div key={index} className="border-b border-border-1 pb-4 last:border-b-0 last:pb-0">
              <h4 className="font-medium text-text-1">{edu.degree}</h4>
              <p className="text-accent text-sm">{edu.institution}</p>
              <p className="text-text-3 text-xs">{edu.year}</p>
              {edu.description && (
                <p className="text-text-2 text-sm mt-2">{edu.description}</p>
              )}
            </div>
          ))}
        </div>
      </GlassCardContent>
    </GlassCard>
  );
};

/**
 * Contribution Activity Component
 */
const ContributionActivity = () => {
  const { repository } = usePortfolioData();
  
  if (!repository) return null;

  return (
    <GlassCard>
      <GlassCardHeader>
        <GlassCardTitle>Activity</GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-text-2">Repository</span>
            <span className="text-text-1 font-medium">{repository.name}</span>
          </div>
          
          {repository.created_at && (
            <div className="flex justify-between items-center">
              <span className="text-text-2">Created</span>
              <span className="text-text-1">
                {new Date(repository.created_at).toLocaleDateString()}
              </span>
            </div>
          )}
          
          {repository.pushed_at && (
            <div className="flex justify-between items-center">
              <span className="text-text-2">Last Push</span>
              <span className="text-text-1">
                {new Date(repository.pushed_at).toLocaleDateString()}
              </span>
            </div>
          )}
          
          {repository.size && (
            <div className="flex justify-between items-center">
              <span className="text-text-2">Size</span>
              <span className="text-text-1">{(repository.size / 1024).toFixed(1)} MB</span>
            </div>
          )}
        </div>
      </GlassCardContent>
    </GlassCard>
  );
};

export default GitHubTemplate;