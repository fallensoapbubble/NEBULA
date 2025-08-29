/**
 * Template Components
 * Reusable components for portfolio templates
 */

import React from 'react';

/**
 * Detect asset type from file extension
 * @param {string} extension - File extension
 * @returns {string} Asset type
 */
function detectAssetType(extension) {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'];
  const videoExtensions = ['mp4', 'webm', 'ogg', 'avi', 'mov'];
  const audioExtensions = ['mp3', 'wav', 'ogg', 'aac', 'm4a'];
  
  if (imageExtensions.includes(extension)) return 'image';
  if (videoExtensions.includes(extension)) return 'video';
  if (audioExtensions.includes(extension)) return 'audio';
  
  return 'unknown';
}

/**
 * Basic template component
 */
export const BasicTemplateComponent = ({ children, className = '' }) => {
  return (
    <div className={`template-component ${className}`}>
      {children}
    </div>
  );
};

/**
 * Markdown Content Component
 */
export const MarkdownContent = ({ content, className = '' }) => {
  return (
    <div className={`markdown-content ${className}`} dangerouslySetInnerHTML={{ __html: content }} />
  );
};

/**
 * Project Card Component
 */
export const ProjectCard = ({ project, className = '' }) => {
  return (
    <div className={`project-card ${className}`}>
      <h3>{project.name}</h3>
      <p>{project.description}</p>
      {project.url && (
        <a href={project.url} target="_blank" rel="noopener noreferrer">
          View Project
        </a>
      )}
    </div>
  );
};

/**
 * Repository Stats Component
 */
export const RepositoryStats = ({ stats, className = '' }) => {
  return (
    <div className={`repository-stats ${className}`}>
      <div className="stat">
        <span className="label">Stars:</span>
        <span className="value">{stats.stars || 0}</span>
      </div>
      <div className="stat">
        <span className="label">Forks:</span>
        <span className="value">{stats.forks || 0}</span>
      </div>
      <div className="stat">
        <span className="label">Language:</span>
        <span className="value">{stats.language || 'N/A'}</span>
      </div>
    </div>
  );
};

/**
 * Social Links Component
 */
export const SocialLinks = ({ links, className = '' }) => {
  return (
    <div className={`social-links ${className}`}>
      {links.map((link, index) => (
        <a
          key={index}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="social-link"
        >
          {link.name}
        </a>
      ))}
    </div>
  );
};

/**
 * Portfolio Image Component
 */
export const PortfolioImage = ({ src, alt, className = '' }) => {
  return (
    <img
      src={src}
      alt={alt}
      className={`portfolio-image ${className}`}
      loading="lazy"
    />
  );
};

/**
 * Portfolio Section Component
 */
export const PortfolioSection = ({ title, children, className = '' }) => {
  return (
    <section className={`portfolio-section ${className}`}>
      {title && <h2 className="section-title">{title}</h2>}
      <div className="section-content">
        {children}
      </div>
    </section>
  );
};

/**
 * GitHub README Component
 */
export const GitHubReadme = ({ content, className = '' }) => {
  return (
    <div className={`github-readme ${className}`}>
      <MarkdownContent content={content} />
    </div>
  );
};

/**
 * Experience Item Component
 */
export const ExperienceItem = ({ experience, className = '' }) => {
  return (
    <div className={`experience-item ${className}`}>
      <h3 className="position">{experience.position}</h3>
      <h4 className="company">{experience.company}</h4>
      <p className="duration">{experience.duration}</p>
      <p className="description">{experience.description}</p>
    </div>
  );
};

/**
 * Skill Badge Component
 */
export const SkillBadge = ({ skill, className = '' }) => {
  return (
    <span className={`skill-badge ${className}`}>
      {skill}
    </span>
  );
};

export default BasicTemplateComponent;