'use client';

import React from 'react';

/**
 * Default Portfolio Template
 * Renders JSON-based portfolio content with a modern, responsive design
 */
export function PortfolioTemplate({ content, template, metadata, repository, theme }) {
  // Extract content from the main data file (usually data.json)
  const mainContentFile = Object.keys(content).find(key => 
    key.includes('data.json') || key.includes('content.json')
  );
  
  const portfolioData = mainContentFile ? content[mainContentFile]?.content : {};
  
  // Fallback data structure
  const data = {
    personalInfo: portfolioData.personalInfo || {},
    about: portfolioData.about || '',
    projects: portfolioData.projects || [],
    skills: portfolioData.skills || [],
    experience: portfolioData.experience || [],
    contact: portfolioData.contact || {},
    ...portfolioData
  };

  return (
    <div className={`portfolio-template ${theme}`}>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        
        {/* Hero Section */}
        <HeroSection data={data} theme={theme} />
        
        {/* About Section */}
        {data.about && <AboutSection data={data} theme={theme} />}
        
        {/* Projects Section */}
        {data.projects && data.projects.length > 0 && (
          <ProjectsSection projects={data.projects} theme={theme} />
        )}
        
        {/* Skills Section */}
        {data.skills && data.skills.length > 0 && (
          <SkillsSection skills={data.skills} theme={theme} />
        )}
        
        {/* Experience Section */}
        {data.experience && data.experience.length > 0 && (
          <ExperienceSection experience={data.experience} theme={theme} />
        )}
        
        {/* Contact Section */}
        <ContactSection data={data} theme={theme} />
      </div>
    </div>
  );
}

/**
 * Hero Section Component
 */
function HeroSection({ data, theme }) {
  const { personalInfo } = data;
  
  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          {/* Avatar */}
          {personalInfo.avatar && (
            <div className="mb-8">
              <img
                src={personalInfo.avatar}
                alt={personalInfo.name || 'Profile'}
                className="w-32 h-32 rounded-full mx-auto border-4 border-white/20 shadow-2xl"
              />
            </div>
          )}
          
          {/* Name and Title */}
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            {personalInfo.name || 'Portfolio'}
          </h1>
          
          {personalInfo.title && (
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
              {personalInfo.title}
            </p>
          )}
          
          {/* Bio */}
          {personalInfo.bio && (
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto leading-relaxed">
              {personalInfo.bio}
            </p>
          )}
          
          {/* Social Links */}
          {personalInfo.social && (
            <div className="flex justify-center space-x-6">
              {Object.entries(personalInfo.social).map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <SocialIcon platform={platform} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * About Section Component
 */
function AboutSection({ data, theme }) {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 text-center">
            About Me
          </h2>
          
          <div className="prose prose-lg prose-invert max-w-none">
            {typeof data.about === 'string' ? (
              <div className="text-white/80 leading-relaxed whitespace-pre-wrap">
                {data.about}
              </div>
            ) : (
              <div className="text-white/80 leading-relaxed">
                {JSON.stringify(data.about, null, 2)}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Projects Section Component
 */
function ProjectsSection({ projects, theme }) {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-12 text-center">
          Projects
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <ProjectCard key={index} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Project Card Component
 */
function ProjectCard({ project }) {
  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-all duration-300">
      {/* Project Image */}
      {project.image && (
        <div className="mb-6">
          <img
            src={project.image}
            alt={project.title}
            className="w-full h-48 object-cover rounded-lg"
          />
        </div>
      )}
      
      {/* Project Title */}
      <h3 className="text-xl font-bold text-white mb-3">
        {project.title}
      </h3>
      
      {/* Project Description */}
      {project.description && (
        <p className="text-white/80 mb-4 leading-relaxed">
          {project.description}
        </p>
      )}
      
      {/* Technologies */}
      {project.technologies && project.technologies.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {project.technologies.map((tech, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-sm text-white/90"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Project Links */}
      <div className="flex space-x-4">
        {project.url && (
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
          >
            View Project →
          </a>
        )}
        
        {project.github && (
          <a
            href={project.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/60 hover:text-white transition-colors text-sm"
          >
            GitHub →
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * Skills Section Component
 */
function SkillsSection({ skills, theme }) {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-12 text-center">
          Skills
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {skills.map((skill, index) => (
            <div
              key={index}
              className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg p-4 text-center hover:bg-white/8 transition-all duration-300"
            >
              <span className="text-white/90 font-medium">
                {typeof skill === 'string' ? skill : skill.name || skill.title}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Experience Section Component
 */
function ExperienceSection({ experience, theme }) {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-12 text-center">
          Experience
        </h2>
        
        <div className="space-y-8">
          {experience.map((exp, index) => (
            <ExperienceCard key={index} experience={exp} />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Experience Card Component
 */
function ExperienceCard({ experience }) {
  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">
            {experience.position || experience.title}
          </h3>
          <p className="text-blue-400 font-medium">
            {experience.company}
          </p>
        </div>
        
        {experience.duration && (
          <div className="text-white/60 text-sm mt-2 md:mt-0">
            {experience.duration}
          </div>
        )}
      </div>
      
      {experience.description && (
        <p className="text-white/80 leading-relaxed">
          {experience.description}
        </p>
      )}
    </div>
  );
}

/**
 * Contact Section Component
 */
function ContactSection({ data, theme }) {
  const { contact, personalInfo } = data;
  const contactInfo = contact || personalInfo || {};
  
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
            Get In Touch
          </h2>
          
          <p className="text-white/80 mb-8 leading-relaxed">
            {contactInfo.message || "I'm always interested in new opportunities and collaborations."}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            {contactInfo.email && (
              <a
                href={`mailto:${contactInfo.email}`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Send Email
              </a>
            )}
            
            {contactInfo.linkedin && (
              <a
                href={contactInfo.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-3 rounded-lg transition-colors"
              >
                LinkedIn
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Social Icon Component
 */
function SocialIcon({ platform }) {
  const icons = {
    github: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
      </svg>
    ),
    linkedin: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" />
      </svg>
    ),
    twitter: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
      </svg>
    )
  };
  
  return icons[platform.toLowerCase()] || (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
    </svg>
  );
}

export default PortfolioTemplate;