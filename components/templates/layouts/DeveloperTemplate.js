/**
 * Developer Template Layout
 * A technical portfolio template designed for developers and engineers
 */

import React from 'react';
import { usePortfolioData } from '../PortfolioDataProvider.js';
import { useTemplateStyle } from '../TemplateStyleProvider.js';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '../../ui/Card.js';

/**
 * DeveloperTemplate - Technical portfolio layout for developers
 */
export const DeveloperTemplate = ({ template, portfolioData, repositoryInfo, isPreview }) => {
  const { portfolio, getSection, hasSection } = usePortfolioData();
  const { getThemeClass } = useTemplateStyle();

  return (
    <div className={getThemeClass('developer-template min-h-screen bg-gray-900 text-green-400 font-mono')}>
      {/* Terminal Header */}
      <header className="bg-gray-800 border-b border-green-500/30">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <span className="text-green-400 text-sm">
              {portfolio.metadata?.name?.toLowerCase().replace(/\s+/g, '-') || 'portfolio'}.dev
            </span>
          </div>
        </div>
      </header>

      {/* Terminal Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="space-y-8">
          <TerminalPrompt />
          {hasSection('about') && <AboutSection />}
          {hasSection('skills') && <SkillsSection />}
          {hasSection('projects') && <ProjectsSection />}
          {hasSection('experience') && <ExperienceSection />}
          {hasSection('contact') && <ContactSection />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-green-500/30 py-6 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center text-green-400/60 text-sm">
            <span>$ exit</span>
            <span>© {new Date().getFullYear()} {portfolio.metadata?.name || 'Developer'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

/**
 * Terminal Prompt Component
 */
const TerminalPrompt = () => {
  const { portfolio } = usePortfolioData();
  const profile = portfolio.metadata || {};

  return (
    <div className="space-y-4">
      <div className="text-green-400">
        <span className="text-green-500">$</span> whoami
      </div>
      <div className="pl-4 space-y-2">
        <div className="text-white text-2xl font-bold">
          {profile.name || 'Developer'}
        </div>
        {profile.title && (
          <div className="text-green-300">
            Role: {profile.title}
          </div>
        )}
        {profile.bio && (
          <div className="text-gray-300 max-w-3xl">
            Bio: {profile.bio}
          </div>
        )}
        {profile.location && (
          <div className="text-green-300">
            Location: {profile.location}
          </div>
        )}
      </div>
      
      {profile.social && (
        <div className="mt-6">
          <div className="text-green-400">
            <span className="text-green-500">$</span> cat social_links.txt
          </div>
          <div className="pl-4 space-y-1 mt-2">
            {Object.entries(profile.social).map(([platform, url]) => (
              <div key={platform} className="flex items-center space-x-2">
                <span className="text-green-300">{platform}:</span>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  {url}
                </a>
              </div>
            ))}
          </div>
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
    <div className="space-y-4">
      <div className="text-green-400">
        <span className="text-green-500">$</span> cat about.md
      </div>
      <div className="pl-4 bg-gray-800/50 p-4 rounded border border-green-500/30">
        <div className="prose prose-invert prose-green max-w-none">
          {aboutSection.type === 'markdown' ? (
            <div dangerouslySetInnerHTML={{ __html: aboutSection.data }} />
          ) : (
            <p className="text-gray-300 leading-relaxed">{aboutSection.data}</p>
          )}
        </div>
      </div>
    </div>
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
    <div className="space-y-4">
      <div className="text-green-400">
        <span className="text-green-500">$</span> ls -la skills/
      </div>
      <div className="pl-4 space-y-4">
        {skills.map((skillGroup, index) => (
          <div key={index} className="bg-gray-800/50 p-4 rounded border border-green-500/30">
            <div className="text-green-300 font-bold mb-3 flex items-center">
              <span className="text-green-500 mr-2">📁</span>
              {skillGroup.category}/
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {skillGroup.items.map((skill, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <span className="text-green-500">•</span>
                  <span className="text-gray-300 text-sm">{skill.name}</span>
                  {skill.level && (
                    <div className="flex space-x-1">
                      {[...Array(5)].map((_, dot) => (
                        <div
                          key={dot}
                          className={`w-1 h-1 ${
                            dot < skill.level ? 'bg-green-400' : 'bg-gray-600'
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
    </div>
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
    <div className="space-y-4">
      <div className="text-green-400">
        <span className="text-green-500">$</span> find ./projects -name &quot;*.md&quot; -exec cat {} \;
      </div>
      <div className="pl-4 space-y-6">
        {projects.map((project, index) => (
          <div key={index} className="bg-gray-800/50 p-6 rounded border border-green-500/30">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-white text-lg font-bold flex items-center">
                  <span className="text-green-500 mr-2">📦</span>
                  {project.name}
                </h3>
                <p className="text-gray-300 mt-2">{project.description}</p>
              </div>
              <div className="flex space-x-2">
                {project.demo && (
                  <a
                    href={project.demo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-green-600 text-black text-xs font-bold rounded hover:bg-green-500 transition-colors"
                  >
                    DEMO
                  </a>
                )}
                {project.source && (
                  <a
                    href={project.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 border border-green-500 text-green-400 text-xs font-bold rounded hover:bg-green-500/20 transition-colors"
                  >
                    SOURCE
                  </a>
                )}
              </div>
            </div>
            
            {project.technologies && (
              <div className="mb-4">
                <div className="text-green-300 text-sm mb-2">Technologies:</div>
                <div className="flex flex-wrap gap-2">
                  {project.technologies.map((tech, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-gray-700 text-green-400 text-xs rounded border border-green-500/30"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {project.features && (
              <div>
                <div className="text-green-300 text-sm mb-2">Features:</div>
                <ul className="space-y-1">
                  {project.features.map((feature, i) => (
                    <li key={i} className="text-gray-300 text-sm flex items-start">
                      <span className="text-green-500 mr-2">→</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
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
    <div className="space-y-4">
      <div className="text-green-400">
        <span className="text-green-500">$</span> git log --oneline --graph experience
      </div>
      <div className="pl-4 space-y-4">
        {experiences.map((exp, index) => (
          <div key={index} className="flex items-start space-x-4">
            <div className="text-green-500 mt-1">*</div>
            <div className="bg-gray-800/50 p-4 rounded border border-green-500/30 flex-1">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-white font-bold">{exp.position}</h3>
                  <p className="text-green-300">{exp.company}</p>
                </div>
                <span className="text-gray-400 text-sm font-mono">{exp.duration}</span>
              </div>
              <p className="text-gray-300 text-sm mb-3">{exp.description}</p>
              {exp.achievements && (
                <div>
                  <div className="text-green-300 text-xs mb-2">Key Achievements:</div>
                  <ul className="space-y-1">
                    {exp.achievements.map((achievement, i) => (
                      <li key={i} className="text-gray-300 text-xs flex items-start">
                        <span className="text-green-500 mr-2">+</span>
                        {achievement}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
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
    <div className="space-y-4">
      <div className="text-green-400">
        <span className="text-green-500">$</span> curl -X GET /contact
      </div>
      <div className="pl-4 bg-gray-800/50 p-6 rounded border border-green-500/30">
        <div className="text-center space-y-4">
          <p className="text-gray-300">
            {contact.message || "// Ready to collaborate? Let's connect!"}
          </p>
          <div className="flex justify-center space-x-6">
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center space-x-2 text-green-400 hover:text-green-300 transition-colors"
              >
                <span>📧</span>
                <span className="underline">{contact.email}</span>
              </a>
            )}
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center space-x-2 text-green-400 hover:text-green-300 transition-colors"
              >
                <span>📞</span>
                <span className="underline">{contact.phone}</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperTemplate;