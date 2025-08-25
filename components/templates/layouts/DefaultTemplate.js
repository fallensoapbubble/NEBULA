/**
 * Default Template Layout
 * A clean, professional portfolio template suitable for most use cases
 */

import React from 'react';
import { usePortfolioData } from '../PortfolioDataProvider.js';
import { useTemplateStyle } from '../TemplateStyleProvider.js';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '../../ui/Card.js';
import { ProjectCard } from '../TemplateComponents.js';

/**
 * DefaultTemplate - Clean, professional portfolio layout
 */
export const DefaultTemplate = ({ template, portfolioData, repositoryInfo, isPreview }) => {
  const { portfolio, getSection, hasSection, getAssetUrl } = usePortfolioData();
  const { getThemeClass } = useTemplateStyle();

  return (
    <div className={getThemeClass('default-template min-h-screen')}>
      {/* Header Section */}
      <header className="relative py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <ProfileSection />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid gap-12">
          {hasSection('about') && <AboutSection />}
          {hasSection('experience') && <ExperienceSection />}
          {hasSection('projects') && <ProjectsSection />}
          {hasSection('skills') && <SkillsSection />}
          {hasSection('education') && <EducationSection />}
          {hasSection('contact') && <ContactSection />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-1 py-8 px-6">
        <div className="max-w-4xl mx-auto text-center text-text-2 text-sm">
          <p>© {new Date().getFullYear()} {portfolio.metadata?.name || 'Portfolio'}. Built with Nebula.</p>
          {repositoryInfo && (
            <p className="mt-2">
              <a 
                href={repositoryInfo.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-accent hover:text-accent-hover transition-colors"
              >
                View Source on GitHub
              </a>
            </p>
          )}
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
      {/* Avatar */}
      {profile.avatar && (
        <div className="flex justify-center">
          <img
            src={getAssetUrl(profile.avatar)}
            alt={profile.name || 'Profile'}
            className="w-32 h-32 rounded-full border-4 border-border-accent shadow-glass-lg"
          />
        </div>
      )}

      {/* Name and Title */}
      <div>
        <h1 className="text-4xl md:text-5xl font-bold text-text-1 mb-4">
          {profile.name || 'Your Name'}
        </h1>
        {profile.title && (
          <p className="text-xl text-text-2 mb-6">{profile.title}</p>
        )}
        {profile.bio && (
          <p className="text-lg text-text-2 max-w-2xl mx-auto leading-relaxed">
            {profile.bio}
          </p>
        )}
      </div>

      {/* Social Links */}
      {profile.social && (
        <div className="flex justify-center space-x-4">
          {Object.entries(profile.social).map(([platform, url]) => (
            <a
              key={platform}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-button glass-button-secondary"
            >
              {platform.charAt(0).toUpperCase() + platform.slice(1)}
            </a>
          ))}
        </div>
      )}
    </div>
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
    <section>
      <h2 className="text-3xl font-bold text-text-1 mb-8 text-center">About</h2>
      <GlassCard>
        <GlassCardContent className="prose prose-invert max-w-none">
          {aboutSection.type === 'markdown' ? (
            <div dangerouslySetInnerHTML={{ __html: aboutSection.data }} />
          ) : (
            <p className="text-text-2 leading-relaxed">{aboutSection.data}</p>
          )}
        </GlassCardContent>
      </GlassCard>
    </section>
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
    <section>
      <h2 className="text-3xl font-bold text-text-1 mb-8 text-center">Experience</h2>
      <div className="space-y-6">
        {experiences.map((exp, index) => (
          <GlassCard key={index}>
            <GlassCardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <GlassCardTitle>{exp.position}</GlassCardTitle>
                  <p className="text-accent font-medium">{exp.company}</p>
                </div>
                <span className="text-text-2 text-sm">{exp.duration}</span>
              </div>
            </GlassCardHeader>
            <GlassCardContent>
              <p className="text-text-2 leading-relaxed">{exp.description}</p>
              {exp.achievements && (
                <ul className="mt-4 space-y-2">
                  {exp.achievements.map((achievement, i) => (
                    <li key={i} className="text-text-2 flex items-start">
                      <span className="text-accent mr-2">•</span>
                      {achievement}
                    </li>
                  ))}
                </ul>
              )}
            </GlassCardContent>
          </GlassCard>
        ))}
      </div>
    </section>
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
    <section>
      <h2 className="text-3xl font-bold text-text-1 mb-8 text-center">Projects</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project, index) => (
          <ProjectCard 
            key={index} 
            project={project} 
            variant="default"
            className="hover:shadow-glass-lg transition-all duration-300"
          />
        ))}
      </div>
    </section>
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
    <section>
      <h2 className="text-3xl font-bold text-text-1 mb-8 text-center">Skills</h2>
      <GlassCard>
        <GlassCardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {skills.map((skillGroup, index) => (
              <div key={index}>
                <h3 className="text-lg font-semibold text-text-1 mb-3">
                  {skillGroup.category}
                </h3>
                <div className="space-y-2">
                  {skillGroup.items.map((skill, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-text-2">{skill.name}</span>
                      {skill.level && (
                        <div className="flex space-x-1">
                          {[...Array(5)].map((_, dot) => (
                            <div
                              key={dot}
                              className={`w-2 h-2 rounded-full ${
                                dot < skill.level
                                  ? 'bg-accent'
                                  : 'bg-glass-2'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </GlassCardContent>
      </GlassCard>
    </section>
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
    <section>
      <h2 className="text-3xl font-bold text-text-1 mb-8 text-center">Education</h2>
      <div className="space-y-6">
        {education.map((edu, index) => (
          <GlassCard key={index}>
            <GlassCardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <GlassCardTitle>{edu.degree}</GlassCardTitle>
                  <p className="text-accent font-medium">{edu.institution}</p>
                </div>
                <span className="text-text-2 text-sm">{edu.year}</span>
              </div>
            </GlassCardHeader>
            {edu.description && (
              <GlassCardContent>
                <p className="text-text-2">{edu.description}</p>
              </GlassCardContent>
            )}
          </GlassCard>
        ))}
      </div>
    </section>
  );
};

/**
 * Contact Section Component
 */
const ContactSection = () => {
  const { getSectionData } = usePortfolioData();
  const contact = getSectionData('contact', {});

  if (!Object.keys(contact).length) return null;

  return (
    <section>
      <h2 className="text-3xl font-bold text-text-1 mb-8 text-center">Contact</h2>
      <GlassCard>
        <GlassCardContent className="text-center">
          <p className="text-text-2 mb-6">
            {contact.message || "Let's get in touch!"}
          </p>
          <div className="flex justify-center space-x-4">
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="glass-button glass-button-primary"
              >
                Email Me
              </a>
            )}
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="glass-button glass-button-secondary"
              >
                Call Me
              </a>
            )}
          </div>
        </GlassCardContent>
      </GlassCard>
    </section>
  );
};

export default DefaultTemplate;