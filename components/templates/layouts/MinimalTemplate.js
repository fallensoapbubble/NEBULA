/**
 * Minimal Template Layout
 * A clean, minimalist portfolio template with focus on content
 */

import React from 'react';
import { usePortfolioData } from '../PortfolioDataProvider.js';
import { useTemplateStyle } from '../TemplateStyleProvider.js';

/**
 * MinimalTemplate - Clean, minimalist portfolio layout
 */
export const MinimalTemplate = ({ template, portfolioData, repositoryInfo, isPreview }) => {
  const { portfolio, getSection, hasSection } = usePortfolioData();
  const { getThemeClass } = useTemplateStyle();

  return (
    <div className={getThemeClass('minimal-template min-h-screen bg-white text-gray-900')}>
      {/* Header */}
      <header className="py-16 px-6 border-b border-gray-200">
        <div className="max-w-3xl mx-auto">
          <ProfileSection />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="space-y-16">
          {hasSection('about') && <AboutSection />}
          {hasSection('experience') && <ExperienceSection />}
          {hasSection('projects') && <ProjectsSection />}
          {hasSection('skills') && <SkillsSection />}
          {hasSection('contact') && <ContactSection />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 px-6">
        <div className="max-w-3xl mx-auto text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} {portfolio.metadata?.name || 'Portfolio'}</p>
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
    <div className="text-center space-y-6">
      {/* Avatar */}
      {profile.avatar && (
        <div className="flex justify-center">
          <img
            src={getAssetUrl(profile.avatar)}
            alt={profile.name || 'Profile'}
            className="w-24 h-24 rounded-full grayscale"
          />
        </div>
      )}

      {/* Name and Title */}
      <div>
        <h1 className="text-3xl font-light text-gray-900 mb-2">
          {profile.name || 'Your Name'}
        </h1>
        {profile.title && (
          <p className="text-gray-600 text-lg font-light">{profile.title}</p>
        )}
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="text-gray-700 max-w-2xl mx-auto leading-relaxed">
          {profile.bio}
        </p>
      )}

      {/* Social Links */}
      {profile.social && (
        <div className="flex justify-center space-x-6">
          {Object.entries(profile.social).map(([platform, url]) => (
            <a
              key={platform}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-900 transition-colors text-sm uppercase tracking-wide"
            >
              {platform}
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
      <h2 className="text-2xl font-light text-gray-900 mb-8 pb-2 border-b border-gray-200">
        About
      </h2>
      <div className="prose prose-gray max-w-none">
        {aboutSection.type === 'markdown' ? (
          <div dangerouslySetInnerHTML={{ __html: aboutSection.data }} />
        ) : (
          <p className="text-gray-700 leading-relaxed">{aboutSection.data}</p>
        )}
      </div>
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
      <h2 className="text-2xl font-light text-gray-900 mb-8 pb-2 border-b border-gray-200">
        Experience
      </h2>
      <div className="space-y-8">
        {experiences.map((exp, index) => (
          <div key={index} className="border-l-2 border-gray-200 pl-6 relative">
            <div className="absolute w-3 h-3 bg-gray-400 rounded-full -left-2 top-1"></div>
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{exp.position}</h3>
                <p className="text-gray-600">{exp.company}</p>
              </div>
              <span className="text-gray-500 text-sm">{exp.duration}</span>
            </div>
            <p className="text-gray-700 leading-relaxed mb-3">{exp.description}</p>
            {exp.achievements && (
              <ul className="space-y-1">
                {exp.achievements.map((achievement, i) => (
                  <li key={i} className="text-gray-600 text-sm flex items-start">
                    <span className="text-gray-400 mr-2">—</span>
                    {achievement}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

/**
 * Projects Section Component
 */
const ProjectsSection = () => {
  const { getSectionData, getAssetUrl } = usePortfolioData();
  const projects = getSectionData('projects', []);

  if (!projects.length) return null;

  return (
    <section>
      <h2 className="text-2xl font-light text-gray-900 mb-8 pb-2 border-b border-gray-200">
        Projects
      </h2>
      <div className="space-y-8">
        {projects.map((project, index) => (
          <div key={index} className="border-b border-gray-100 pb-8 last:border-b-0">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-medium text-gray-900">{project.name}</h3>
              <div className="flex space-x-3">
                {project.demo && (
                  <a
                    href={project.demo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-gray-900 text-sm uppercase tracking-wide"
                  >
                    Demo
                  </a>
                )}
                {project.source && (
                  <a
                    href={project.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-gray-900 text-sm uppercase tracking-wide"
                  >
                    Source
                  </a>
                )}
              </div>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">{project.description}</p>
            {project.technologies && (
              <div className="flex flex-wrap gap-2">
                {project.technologies.map((tech, i) => (
                  <span
                    key={i}
                    className="text-gray-500 text-xs uppercase tracking-wide"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            )}
          </div>
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
      <h2 className="text-2xl font-light text-gray-900 mb-8 pb-2 border-b border-gray-200">
        Skills
      </h2>
      <div className="grid md:grid-cols-2 gap-8">
        {skills.map((skillGroup, index) => (
          <div key={index}>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {skillGroup.category}
            </h3>
            <div className="space-y-2">
              {skillGroup.items.map((skill, i) => (
                <div key={i} className="text-gray-700">
                  {skill.name}
                </div>
              ))}
            </div>
          </div>
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
      <h2 className="text-2xl font-light text-gray-900 mb-8 pb-2 border-b border-gray-200">
        Contact
      </h2>
      <div className="text-center">
        <p className="text-gray-700 mb-6">
          {contact.message || "Let's get in touch."}
        </p>
        <div className="flex justify-center space-x-6">
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="text-gray-600 hover:text-gray-900 transition-colors uppercase tracking-wide text-sm"
            >
              Email
            </a>
          )}
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="text-gray-600 hover:text-gray-900 transition-colors uppercase tracking-wide text-sm"
            >
              Phone
            </a>
          )}
        </div>
      </div>
    </section>
  );
};

export default MinimalTemplate;