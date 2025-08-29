'use client';

import React from 'react';

/**
 * Minimal Template
 * A clean, minimal portfolio template focusing on content
 */
export function MinimalTemplate({ content, template, metadata, repository, theme }) {
  // Extract content from the main data file
  const mainContentFile = Object.keys(content).find(key => 
    key.includes('data.json') || key.includes('content.json')
  );
  
  const portfolioData = mainContentFile ? content[mainContentFile]?.content : {};
  
  // Fallback data structure
  const data = {
    name: portfolioData.name || portfolioData.personalInfo?.name || 'Portfolio',
    title: portfolioData.title || portfolioData.personalInfo?.title || '',
    bio: portfolioData.bio || portfolioData.about || '',
    email: portfolioData.email || portfolioData.personalInfo?.email || portfolioData.contact?.email,
    links: portfolioData.links || portfolioData.social || {},
    projects: portfolioData.projects || [],
    ...portfolioData
  };

  return (
    <div className={`minimal-template ${theme}`}>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-20">
          
          {/* Header */}
          <header className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-light text-white mb-4">
              {data.name}
            </h1>
            
            {data.title && (
              <p className="text-xl text-white/70 mb-6 font-light">
                {data.title}
              </p>
            )}
            
            {data.bio && (
              <p className="text-white/60 leading-relaxed max-w-lg mx-auto">
                {data.bio}
              </p>
            )}
          </header>
          
          {/* Projects */}
          {data.projects && data.projects.length > 0 && (
            <section className="mb-16">
              <h2 className="text-2xl font-light text-white mb-8 text-center">
                Work
              </h2>
              
              <div className="space-y-8">
                {data.projects.map((project, index) => (
                  <MinimalProjectCard key={index} project={project} />
                ))}
              </div>
            </section>
          )}
          
          {/* Contact */}
          <footer className="text-center">
            <div className="space-y-4">
              {data.email && (
                <div>
                  <a
                    href={`mailto:${data.email}`}
                    className="text-white/70 hover:text-white transition-colors underline decoration-white/30 hover:decoration-white"
                  >
                    {data.email}
                  </a>
                </div>
              )}
              
              {/* Links */}
              {Object.keys(data.links).length > 0 && (
                <div className="flex justify-center space-x-6">
                  {Object.entries(data.links).map(([platform, url]) => (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/50 hover:text-white/80 transition-colors text-sm uppercase tracking-wide"
                    >
                      {platform}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

/**
 * Minimal Project Card Component
 */
function MinimalProjectCard({ project }) {
  return (
    <div className="border-b border-white/10 pb-8 last:border-b-0">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-light text-white mb-2">
            {project.title}
          </h3>
          
          {project.description && (
            <p className="text-white/60 leading-relaxed mb-4">
              {project.description}
            </p>
          )}
          
          {/* Technologies */}
          {project.technologies && project.technologies.length > 0 && (
            <div className="text-sm text-white/40 mb-4">
              {project.technologies.join(' • ')}
            </div>
          )}
        </div>
        
        {/* Year */}
        {project.year && (
          <div className="text-white/40 text-sm md:ml-8 mb-4 md:mb-0">
            {project.year}
          </div>
        )}
      </div>
      
      {/* Links */}
      <div className="flex space-x-6 text-sm">
        {project.url && (
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/50 hover:text-white/80 transition-colors underline decoration-white/20 hover:decoration-white/50"
          >
            View Project
          </a>
        )}
        
        {project.github && (
          <a
            href={project.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/50 hover:text-white/80 transition-colors underline decoration-white/20 hover:decoration-white/50"
          >
            GitHub
          </a>
        )}
      </div>
    </div>
  );
}

export default MinimalTemplate;