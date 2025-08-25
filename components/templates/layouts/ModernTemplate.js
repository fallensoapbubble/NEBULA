/**
 * Modern Template Layout
 * A contemporary template with enhanced GitHub integration and custom styling support
 */

import React from 'react';
import { usePortfolioData } from '../PortfolioDataProvider.js';
import { useTemplateStyle } from '../TemplateStyleProvider.js';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '../../ui/Card.js';
import { 
  EnhancedPortfolioSection,
  EnhancedProjectCard,
  EnhancedExperienceItem,
  EnhancedSkillGroup,
  EnhancedEducationItem,
  EnhancedPortfolioImage,
  MarkdownRenderer,
  GitHubStats
} from '../EnhancedPortfolioRenderer.js';

/**
 * ModernTemplate - Contemporary portfolio layout with enhanced features
 */
export const ModernTemplate = ({ template, portfolioData, repositoryInfo, isPreview }) => {
  const { 
    portfolio, 
    getSection, 
    hasSection, 
    getAssetUrl, 
    getRepositoryStats,
    repository 
  } = usePortfolioData();
  const { getThemeClass, getVariable } = useTemplateStyle();

  const templateClass = getThemeClass('modern-template min-h-screen');
  const accentColor = getVariable('accent-color', '#3b82f6');

  return (
    <div className={templateClass} style={{ '--template-accent': accentColor }}>
      {/* Hero Section */}
      <header className="hero-section relative py-20 px-6 bg-gradient-to-br from-background-1 via-background-2 to-background-1">
        <div className="max-w-6xl mx-auto">
          <HeroContent />
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content max-w-6xl mx-auto px-6 py-16">
        <div className="space-y-20">
          {hasSection('about') && <AboutSection />}
          {hasSection('projects') && <ProjectsSection />}
          {hasSection('experience') && <ExperienceSection />}
          
          {/* Two-column layout for skills and education */}
          {(hasSection('skills') || hasSection('education')) && (
            <div className="grid lg:grid-cols-2 gap-12">
              {hasSection('skills') && (
                <div>
                  <SkillsSection />
                </div>
              )}
              {hasSection('education') && (
                <div>
                  <EducationSection />
                </div>
              )}
            </div>
          )}
          
          {hasSection('contact') && <ContactSection />}
        </div>
      </main>

      {/* Footer */}
      <footer className="footer-section border-t border-border-1 py-12 px-6 mt-20">
        <div className="max-w-6xl mx-auto">
          <FooterContent />
        </div>
      </footer>
    </div>
  );
};

/**
 * Hero Content Component
 */
const HeroContent = () => {
  const { portfolio, getAssetUrl, repository, getRepositoryStats } = usePortfolioData();
  const { getThemeClass } = useTemplateStyle();
  const profile = portfolio.metadata || {};
  const stats = getRepositoryStats();

  return (
    <div className="hero-content grid lg:grid-cols-2 gap-12 items-center">
      {/* Profile Information */}
      <div className="profile-info space-y-6">
        <div className="profile-text">
          <h1 className="profile-name text-4xl md:text-6xl font-bold text-text-1 mb-4 leading-tight">
            {profile.name || 'Your Name'}
          </h1>
          
          {profile.title && (
            <p className="profile-title text-xl md:text-2xl text-accent font-medium mb-6">
              {profile.title}
            </p>
          )}
          
          {profile.bio && (
            <div className="profile-bio text-lg text-text-2 leading-relaxed mb-8 max-w-lg">
              <MarkdownRenderer 
                content={profile.bio} 
                repository={repository}
                className="prose-lg"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="profile-actions flex flex-wrap gap-4">
          {profile.social?.github && (
            <a
              href={profile.social.github}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-button glass-button-primary text-lg px-8 py-3"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
              </svg>
              View GitHub
            </a>
          )}
          
          {profile.social?.linkedin && (
            <a
              href={profile.social.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-button glass-button-secondary text-lg px-8 py-3"
            >
              Connect
            </a>
          )}
          
          {hasSection('contact') && (
            <a
              href="#contact"
              className="glass-button glass-button-outline text-lg px-8 py-3"
            >
              Get in Touch
            </a>
          )}
        </div>

        {/* Repository Stats */}
        {repository && (stats.stars > 0 || stats.forks > 0) && (
          <div className="repository-stats">
            <GitHubStats 
              stars={stats.stars} 
              forks={stats.forks} 
              watchers={stats.watchers}
              className="text-base"
            />
          </div>
        )}
      </div>

      {/* Profile Image */}
      <div className="profile-image-container flex justify-center lg:justify-end">
        {profile.avatar ? (
          <div className="relative">
            <EnhancedPortfolioImage
              src={profile.avatar}
              alt={profile.name || 'Profile'}
              className="w-64 h-64 md:w-80 md:h-80 rounded-2xl shadow-glass-xl border-4 border-border-accent"
            />
            
            {/* Decorative ring */}
            <div className="absolute -inset-4 rounded-2xl border-2 border-accent/20 animate-pulse"></div>
          </div>
        ) : (
          <div className="w-64 h-64 md:w-80 md:h-80 rounded-2xl bg-glass-2 border-4 border-border-1 flex items-center justify-center">
            <div className="text-center text-text-2">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p className="text-lg">Profile Image</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * About Section Component
 */
const AboutSection = () => {
  return (
    <EnhancedPortfolioSection 
      sectionName="about" 
      title="About Me"
      className="about-section"
    />
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
    <EnhancedPortfolioSection 
      sectionName="projects" 
      title="Featured Projects"
      className="projects-section"
    >
      <div className="projects-grid grid md:grid-cols-2 xl:grid-cols-3 gap-8">
        {projects.map((project, index) => (
          <EnhancedProjectCard 
            key={index} 
            project={project} 
            variant="modern"
            showGitHubStats={true}
            showTechnologies={true}
            className="hover:scale-105 hover:shadow-glass-xl transition-all duration-300"
          />
        ))}
      </div>
    </EnhancedPortfolioSection>
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
    <EnhancedPortfolioSection 
      sectionName="experience" 
      title="Professional Experience"
      className="experience-section"
    >
      <div className="experience-timeline space-y-8">
        {experiences.map((exp, index) => (
          <div key={index} className="timeline-item relative">
            {/* Timeline connector */}
            {index < experiences.length - 1 && (
              <div className="absolute left-6 top-20 w-0.5 h-16 bg-gradient-to-b from-accent to-transparent"></div>
            )}
            
            {/* Timeline dot */}
            <div className="absolute left-4 top-8 w-4 h-4 bg-accent rounded-full border-4 border-background-1 shadow-glass-md"></div>
            
            {/* Content */}
            <div className="ml-12">
              <EnhancedExperienceItem 
                experience={exp} 
                showAchievements={true}
                className="hover:shadow-glass-lg transition-all duration-300"
              />
            </div>
          </div>
        ))}
      </div>
    </EnhancedPortfolioSection>
  );
};

/**
 * Skills Section Component
 */
const SkillsSection = () => {
  const { getSectionData } = usePortfolioData();
  const skills = getSectionData('skills', []);

  if (!skills.length) return null;

  return (
    <EnhancedPortfolioSection 
      sectionName="skills" 
      title="Skills & Technologies"
      className="skills-section"
    >
      <div className="skills-grid space-y-8">
        {skills.map((skillGroup, index) => (
          <EnhancedSkillGroup 
            key={index} 
            skillGroup={skillGroup} 
            showLevels={true}
            variant="modern"
            className="hover:shadow-glass-md transition-all duration-300"
          />
        ))}
      </div>
    </EnhancedPortfolioSection>
  );
};

/**
 * Education Section Component
 */
const EducationSection = () => {
  const { getSectionData } = usePortfolioData();
  const education = getSectionData('education', []);

  if (!education.length) return null;

  return (
    <EnhancedPortfolioSection 
      sectionName="education" 
      title="Education"
      className="education-section"
    >
      <div className="education-list space-y-6">
        {education.map((edu, index) => (
          <EnhancedEducationItem 
            key={index} 
            education={edu} 
            showDetails={true}
            className="hover:shadow-glass-md transition-all duration-300"
          />
        ))}
      </div>
    </EnhancedPortfolioSection>
  );
};

/**
 * Contact Section Component
 */
const ContactSection = () => {
  const { getSectionData, portfolio } = usePortfolioData();
  const contact = getSectionData('contact', {});
  const social = portfolio.metadata?.social || {};

  if (!Object.keys(contact).length && !Object.keys(social).length) return null;

  return (
    <EnhancedPortfolioSection 
      sectionName="contact" 
      title="Get In Touch"
      className="contact-section"
    >
      <GlassCard className="max-w-2xl mx-auto">
        <GlassCardContent className="text-center p-8">
          <p className="text-text-2 text-lg mb-8 leading-relaxed">
            {contact.message || "I'm always interested in new opportunities and collaborations. Let's connect!"}
          </p>
          
          <div className="contact-methods flex flex-wrap justify-center gap-4 mb-8">
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="glass-button glass-button-primary text-lg px-8 py-3"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Me
              </a>
            )}
            
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="glass-button glass-button-secondary text-lg px-8 py-3"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call Me
              </a>
            )}
          </div>
          
          {/* Social Links */}
          {Object.keys(social).length > 0 && (
            <div className="social-links">
              <p className="text-text-3 text-sm mb-4">Or find me on:</p>
              <div className="flex justify-center space-x-4">
                {Object.entries(social).map(([platform, url]) => (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass-button glass-button-outline px-4 py-2 hover:scale-110 transition-transform"
                    title={`${platform.charAt(0).toUpperCase() + platform.slice(1)} Profile`}
                  >
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </a>
                ))}
              </div>
            </div>
          )}
        </GlassCardContent>
      </GlassCard>
    </EnhancedPortfolioSection>
  );
};

/**
 * Footer Content Component
 */
const FooterContent = () => {
  const { portfolio, repository } = usePortfolioData();
  const profile = portfolio.metadata || {};

  return (
    <div className="footer-content text-center">
      <div className="footer-info mb-6">
        <p className="text-text-2 mb-2">
          © {new Date().getFullYear()} {profile.name || 'Portfolio'}. Built with Nebula.
        </p>
        <p className="text-text-3 text-sm">
          Powered by GitHub • Deployed on Vercel
        </p>
      </div>
      
      {repository && (
        <div className="repository-info">
          <a 
            href={repository.html_url || repository.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center text-accent hover:text-accent-hover transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
            </svg>
            View Source Code
          </a>
        </div>
      )}
    </div>
  );
};

export default ModernTemplate;