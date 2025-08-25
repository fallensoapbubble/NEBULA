/**
 * Creative Template Layout
 * A vibrant, creative portfolio template with bold design elements
 */

import React from 'react';
import { usePortfolioData } from '../PortfolioDataProvider.js';
import { useTemplateStyle } from '../TemplateStyleProvider.js';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '../../ui/Card.js';

/**
 * CreativeTemplate - Bold, creative portfolio layout
 */
export const CreativeTemplate = ({ template, portfolioData, repositoryInfo, isPreview }) => {
  const { portfolio, getSection, hasSection } = usePortfolioData();
  const { getThemeClass } = useTemplateStyle();

  return (
    <div className={getThemeClass('creative-template min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900')}>
      {/* Hero Section */}
      <header className="relative py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-violet-500/20"></div>
        <div className="relative max-w-4xl mx-auto text-center">
          <ProfileSection />
        </div>
        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-pink-500/30 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-violet-500/30 rounded-full blur-xl"></div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 pb-20">
        <div className="space-y-20">
          {hasSection('about') && <AboutSection />}
          {hasSection('projects') && <ProjectsSection />}
          {hasSection('experience') && <ExperienceSection />}
          {hasSection('skills') && <SkillsSection />}
          {hasSection('contact') && <ContactSection />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center space-x-8 mb-6">
            {portfolio.metadata?.social && Object.entries(portfolio.metadata.social).map(([platform, url]) => (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
              >
                <span className="text-white text-sm font-bold">
                  {platform.charAt(0).toUpperCase()}
                </span>
              </a>
            ))}
          </div>
          <p className="text-white/60 text-sm">
            © {new Date().getFullYear()} {portfolio.metadata?.name || 'Portfolio'}. Crafted with creativity.
          </p>
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
    <div className="space-y-8">
      {/* Avatar with Creative Border */}
      {profile.avatar && (
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-violet-500 rounded-full blur-lg opacity-75"></div>
            <img
              src={getAssetUrl(profile.avatar)}
              alt={profile.name || 'Profile'}
              className="relative w-40 h-40 rounded-full border-4 border-white/20 shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Name with Gradient Text */}
      <div>
        <h1 className="text-5xl md:text-7xl font-black mb-6">
          <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
            {profile.name || 'Your Name'}
          </span>
        </h1>
        {profile.title && (
          <p className="text-2xl text-white/80 mb-8 font-light">
            {profile.title}
          </p>
        )}
        {profile.bio && (
          <p className="text-lg text-white/70 max-w-3xl mx-auto leading-relaxed">
            {profile.bio}
          </p>
        )}
      </div>

      {/* CTA Buttons */}
      <div className="flex justify-center space-x-4">
        <button className="px-8 py-3 bg-gradient-to-r from-pink-500 to-violet-500 text-white font-semibold rounded-full hover:shadow-lg hover:scale-105 transition-all duration-300">
          View My Work
        </button>
        <button className="px-8 py-3 border-2 border-white/30 text-white font-semibold rounded-full hover:bg-white/10 transition-all duration-300">
          Get In Touch
        </button>
      </div>
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
      <h2 className="text-4xl font-bold text-white mb-12 text-center">
        <span className="bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">
          About Me
        </span>
      </h2>
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-violet-500/10 rounded-3xl blur-xl"></div>
        <GlassCard className="relative bg-white/5 border-white/10">
          <GlassCardContent className="p-8">
            <div className="prose prose-invert prose-lg max-w-none">
              {aboutSection.type === 'markdown' ? (
                <div dangerouslySetInnerHTML={{ __html: aboutSection.data }} />
              ) : (
                <p className="text-white/80 leading-relaxed text-lg">{aboutSection.data}</p>
              )}
            </div>
          </GlassCardContent>
        </GlassCard>
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
      <h2 className="text-4xl font-bold text-white mb-12 text-center">
        <span className="bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">
          Featured Projects
        </span>
      </h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {projects.map((project, index) => (
          <div key={index} className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-violet-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <GlassCard className="relative bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300 group-hover:scale-105">
              {project.image && (
                <div className="aspect-video overflow-hidden rounded-t-2xl">
                  <img
                    src={getAssetUrl(project.image)}
                    alt={project.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
              )}
              <GlassCardHeader>
                <GlassCardTitle className="text-white">{project.name}</GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                <p className="text-white/70 mb-4">{project.description}</p>
                {project.technologies && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {project.technologies.map((tech, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-gradient-to-r from-pink-500/20 to-violet-500/20 text-white/80 text-xs rounded-full border border-white/10"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex space-x-3">
                  {project.demo && (
                    <a
                      href={project.demo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-gradient-to-r from-pink-500 to-violet-500 text-white text-sm font-semibold rounded-full hover:shadow-lg transition-all duration-300"
                    >
                      Live Demo
                    </a>
                  )}
                  {project.source && (
                    <a
                      href={project.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 border border-white/30 text-white text-sm font-semibold rounded-full hover:bg-white/10 transition-all duration-300"
                    >
                      Source
                    </a>
                  )}
                </div>
              </GlassCardContent>
            </GlassCard>
          </div>
        ))}
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
      <h2 className="text-4xl font-bold text-white mb-12 text-center">
        <span className="bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">
          Experience
        </span>
      </h2>
      <div className="space-y-8">
        {experiences.map((exp, index) => (
          <div key={index} className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-violet-500/10 rounded-2xl blur-xl"></div>
            <GlassCard className="relative bg-white/5 border-white/10">
              <GlassCardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <GlassCardTitle className="text-white text-xl">{exp.position}</GlassCardTitle>
                    <p className="text-pink-400 font-semibold text-lg">{exp.company}</p>
                  </div>
                  <span className="text-white/60 text-sm bg-white/10 px-3 py-1 rounded-full">
                    {exp.duration}
                  </span>
                </div>
              </GlassCardHeader>
              <GlassCardContent>
                <p className="text-white/80 leading-relaxed mb-4">{exp.description}</p>
                {exp.achievements && (
                  <ul className="space-y-2">
                    {exp.achievements.map((achievement, i) => (
                      <li key={i} className="text-white/70 flex items-start">
                        <span className="text-pink-400 mr-3 mt-1">★</span>
                        {achievement}
                      </li>
                    ))}
                  </ul>
                )}
              </GlassCardContent>
            </GlassCard>
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
      <h2 className="text-4xl font-bold text-white mb-12 text-center">
        <span className="bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">
          Skills & Expertise
        </span>
      </h2>
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-violet-500/10 rounded-3xl blur-xl"></div>
        <GlassCard className="relative bg-white/5 border-white/10">
          <GlassCardContent className="p-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {skills.map((skillGroup, index) => (
                <div key={index}>
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <span className="w-2 h-2 bg-gradient-to-r from-pink-400 to-violet-400 rounded-full mr-3"></span>
                    {skillGroup.category}
                  </h3>
                  <div className="space-y-3">
                    {skillGroup.items.map((skill, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-white/80">{skill.name}</span>
                        {skill.level && (
                          <div className="flex space-x-1">
                            {[...Array(5)].map((_, dot) => (
                              <div
                                key={dot}
                                className={`w-2 h-2 rounded-full ${
                                  dot < skill.level
                                    ? 'bg-gradient-to-r from-pink-400 to-violet-400'
                                    : 'bg-white/20'
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
      <h2 className="text-4xl font-bold text-white mb-12 text-center">
        <span className="bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">
          Let&apos;s Create Together
        </span>
      </h2>
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-violet-500/20 rounded-3xl blur-xl"></div>
        <GlassCard className="relative bg-white/5 border-white/10">
          <GlassCardContent className="p-12 text-center">
            <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
              {contact.message || "Ready to bring your ideas to life? Let's collaborate and create something amazing together."}
            </p>
            <div className="flex justify-center space-x-6">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="px-8 py-3 bg-gradient-to-r from-pink-500 to-violet-500 text-white font-semibold rounded-full hover:shadow-lg hover:scale-105 transition-all duration-300"
                >
                  Send Email
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="px-8 py-3 border-2 border-white/30 text-white font-semibold rounded-full hover:bg-white/10 transition-all duration-300"
                >
                  Call Me
                </a>
              )}
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>
    </section>
  );
};

export default CreativeTemplate;