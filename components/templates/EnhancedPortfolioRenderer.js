/**
 * Enhanced Portfolio Renderer
 * Advanced template rendering components for portfolio data from GitHub files
 */

import React, { useMemo, useState, useCallback } from 'react';
import { usePortfolioData } from './PortfolioDataProvider.js';
import { useTemplateStyle } from './TemplateStyleProvider.js';
import { logger } from '../../lib/logger.js';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '../ui/Card.js';
import { LoadingSpinner } from '../ui/Loading.js';

/**
 * Enhanced Portfolio Section - Renders sections with GitHub file integration
 */
export const EnhancedPortfolioSection = ({ 
  sectionName, 
  title, 
  children, 
  className = '',
  renderMode = 'auto',
  fallbackContent = null,
  ...props 
}) => {
  const { hasSection, getSection, repository } = usePortfolioData();
  const { getThemeClass } = useTemplateStyle();
  
  const sectionData = getSection(sectionName);
  
  // Auto-detect render mode based on data type
  const effectiveRenderMode = useMemo(() => {
    if (renderMode !== 'auto') return renderMode;
    
    if (!sectionData) return 'empty';
    if (sectionData.type === 'markdown') return 'markdown';
    if (sectionData.type === 'data' && Array.isArray(sectionData.data)) return 'list';
    if (sectionData.type === 'data' && typeof sectionData.data === 'object') return 'object';
    return 'text';
  }, [sectionData, renderMode]);
  
  if (!hasSection(sectionName) && !fallbackContent) {
    return null;
  }

  const sectionClass = getThemeClass(`enhanced-portfolio-section section-${sectionName} ${className}`);

  return (
    <section className={sectionClass} data-section={sectionName} {...props}>
      {title && (
        <header className="section-header mb-8">
          <h2 className="section-title text-3xl font-bold text-text-1 text-center">
            {title}
          </h2>
          {repository && (
            <div className="section-meta text-center mt-2">
              <span className="text-text-3 text-sm">
                From {repository.name}
              </span>
            </div>
          )}
        </header>
      )}
      
      <div className="section-content">
        {sectionData ? (
          <SectionContentRenderer 
            data={sectionData} 
            renderMode={effectiveRenderMode}
            sectionName={sectionName}
          />
        ) : fallbackContent}
        {children}
      </div>
    </section>
  );
};

/**
 * Section Content Renderer - Renders different types of section content
 */
const SectionContentRenderer = ({ data, renderMode, sectionName }) => {
  const { repository } = usePortfolioData();
  
  switch (renderMode) {
    case 'markdown':
      return <MarkdownRenderer content={data.data} repository={repository} />;
    
    case 'list':
      return <ListRenderer items={data.data} sectionName={sectionName} />;
    
    case 'object':
      return <ObjectRenderer data={data.data} sectionName={sectionName} />;
    
    case 'text':
    default:
      return <TextRenderer content={data.data} />;
  }
};

/**
 * Enhanced Markdown Renderer with GitHub-specific features
 */
export const MarkdownRenderer = ({ 
  content, 
  repository, 
  className = '',
  maxLength = null,
  showReadMore = false,
  processGitHubLinks = true,
  ...props 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { getThemeClass } = useTemplateStyle();
  
  const processedContent = useMemo(() => {
    if (!content) return '';
    
    let processed = content;
    
    // Process GitHub-specific markdown features
    if (processGitHubLinks && repository) {
      processed = processGitHubMarkdown(processed, repository);
    }
    
    // Convert markdown to HTML
    processed = convertMarkdownToHTML(processed);
    
    return processed;
  }, [content, repository, processGitHubLinks]);
  
  const shouldTruncate = maxLength && content.length > maxLength;
  const displayContent = shouldTruncate && !isExpanded 
    ? convertMarkdownToHTML(content.substring(0, maxLength) + '...')
    : processedContent;

  const markdownClass = getThemeClass(`enhanced-markdown-renderer prose prose-invert max-w-none ${className}`);

  return (
    <div className={markdownClass} {...props}>
      <div 
        dangerouslySetInnerHTML={{ __html: displayContent }}
        className="markdown-content text-text-2 leading-relaxed"
      />
      {shouldTruncate && showReadMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4 text-accent hover:text-accent-hover text-sm underline transition-colors"
        >
          {isExpanded ? 'Show Less' : 'Read More'}
        </button>
      )}
    </div>
  );
};

/**
 * Enhanced List Renderer for array data
 */
const ListRenderer = ({ items, sectionName }) => {
  const { getThemeClass } = useTemplateStyle();
  
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div className="text-text-2 text-center py-8">
        No {sectionName} data available
      </div>
    );
  }

  const listClass = getThemeClass(`enhanced-list-renderer list-${sectionName}`);

  return (
    <div className={listClass}>
      {items.map((item, index) => (
        <ListItemRenderer 
          key={index} 
          item={item} 
          index={index}
          sectionName={sectionName}
        />
      ))}
    </div>
  );
};

/**
 * List Item Renderer - Renders individual list items based on section type
 */
const ListItemRenderer = ({ item, index, sectionName }) => {
  const { getThemeClass } = useTemplateStyle();
  
  const itemClass = getThemeClass(`list-item list-item-${sectionName} mb-6`);

  switch (sectionName) {
    case 'projects':
      return <EnhancedProjectCard key={index} project={item} className={itemClass} />;
    
    case 'experience':
      return <EnhancedExperienceItem key={index} experience={item} className={itemClass} />;
    
    case 'skills':
      return <EnhancedSkillGroup key={index} skillGroup={item} className={itemClass} />;
    
    case 'education':
      return <EnhancedEducationItem key={index} education={item} className={itemClass} />;
    
    default:
      return <GenericListItem key={index} item={item} className={itemClass} />;
  }
};

/**
 * Enhanced Project Card with GitHub integration
 */
export const EnhancedProjectCard = ({ 
  project, 
  variant = 'default',
  showGitHubStats = true,
  showTechnologies = true,
  showDescription = true,
  className = '',
  ...props 
}) => {
  const { repository, getAssetUrl } = usePortfolioData();
  const { getThemeClass } = useTemplateStyle();
  
  const projectData = useMemo(() => {
    const data = { ...project };
    
    // Auto-generate GitHub URLs if repository info is available
    if (!data.source && repository && data.repository) {
      data.source = `https://github.com/${repository.owner?.login || repository.owner}/${data.repository}`;
    }
    
    // Handle GitHub API data if present
    if (data.github) {
      data.stars = data.github.stargazers_count;
      data.forks = data.github.forks_count;
      data.language = data.github.language;
      data.updated_at = data.github.updated_at;
    }
    
    return data;
  }, [project, repository]);

  const cardClass = getThemeClass(`enhanced-project-card ${className}`);

  return (
    <GlassCard className={cardClass} {...props}>
      {projectData.image && (
        <div className="project-image-container">
          <EnhancedPortfolioImage
            src={projectData.image}
            alt={projectData.name}
            className="w-full h-48 object-cover rounded-t-lg"
            fallback={<ProjectImageFallback name={projectData.name} />}
          />
        </div>
      )}
      
      <GlassCardContent className="p-6">
        <div className="project-header flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="project-title text-xl font-semibold text-text-1 mb-1">
              {projectData.name}
            </h3>
            {projectData.language && (
              <div className="project-language">
                <span className="inline-flex items-center px-2 py-1 bg-accent/20 text-accent text-xs rounded-full">
                  <span className="w-2 h-2 bg-accent rounded-full mr-2"></span>
                  {projectData.language}
                </span>
              </div>
            )}
          </div>
          
          {showGitHubStats && (projectData.stars || projectData.forks) && (
            <GitHubStats stars={projectData.stars} forks={projectData.forks} />
          )}
        </div>
        
        {showDescription && projectData.description && (
          <p className="project-description text-text-2 mb-4 leading-relaxed">
            {projectData.description}
          </p>
        )}
        
        {showTechnologies && projectData.technologies && (
          <TechnologyBadges technologies={projectData.technologies} />
        )}
        
        <ProjectLinks project={projectData} />
        
        {projectData.updated_at && (
          <div className="project-meta mt-4 pt-4 border-t border-border-1 text-text-3 text-xs">
            Last updated: {new Date(projectData.updated_at).toLocaleDateString()}
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  );
};

/**
 * Enhanced Experience Item with rich formatting
 */
export const EnhancedExperienceItem = ({ 
  experience, 
  variant = 'default',
  showAchievements = true,
  className = '',
  ...props 
}) => {
  const { getThemeClass } = useTemplateStyle();
  
  const itemClass = getThemeClass(`enhanced-experience-item ${className}`);

  return (
    <GlassCard className={itemClass} {...props}>
      <GlassCardHeader>
        <div className="experience-header flex justify-between items-start">
          <div className="flex-1">
            <GlassCardTitle className="experience-position">
              {experience.position}
            </GlassCardTitle>
            <p className="experience-company text-accent font-medium">
              {experience.company}
            </p>
            {experience.location && (
              <p className="experience-location text-text-3 text-sm">
                {experience.location}
              </p>
            )}
          </div>
          <div className="experience-duration text-text-2 text-sm text-right">
            <div>{experience.duration}</div>
            {experience.type && (
              <div className="text-text-3 text-xs mt-1">{experience.type}</div>
            )}
          </div>
        </div>
      </GlassCardHeader>
      
      <GlassCardContent>
        {experience.description && (
          <p className="experience-description text-text-2 leading-relaxed mb-4">
            {experience.description}
          </p>
        )}
        
        {showAchievements && experience.achievements && (
          <div className="experience-achievements">
            <h4 className="text-text-1 font-medium mb-2">Key Achievements:</h4>
            <ul className="space-y-2">
              {experience.achievements.map((achievement, i) => (
                <li key={i} className="text-text-2 flex items-start">
                  <span className="text-accent mr-2 mt-1">•</span>
                  <span>{achievement}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {experience.technologies && (
          <div className="experience-technologies mt-4">
            <h4 className="text-text-1 font-medium mb-2">Technologies:</h4>
            <TechnologyBadges technologies={experience.technologies} />
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  );
};

/**
 * Enhanced Skill Group with visual indicators
 */
export const EnhancedSkillGroup = ({ 
  skillGroup, 
  showLevels = true,
  variant = 'default',
  className = '',
  ...props 
}) => {
  const { getThemeClass } = useTemplateStyle();
  
  const groupClass = getThemeClass(`enhanced-skill-group ${className}`);

  return (
    <div className={groupClass} {...props}>
      <h3 className="skill-group-title text-lg font-semibold text-text-1 mb-4">
        {skillGroup.category}
      </h3>
      
      <div className="skill-items space-y-3">
        {skillGroup.items.map((skill, i) => (
          <EnhancedSkillItem 
            key={i} 
            skill={skill} 
            showLevel={showLevels}
            variant={variant}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Enhanced Skill Item with level indicators
 */
export const EnhancedSkillItem = ({ 
  skill, 
  showLevel = true,
  variant = 'default',
  className = '',
  ...props 
}) => {
  const skillName = typeof skill === 'string' ? skill : skill.name;
  const skillLevel = typeof skill === 'object' ? skill.level : null;
  const skillCategory = typeof skill === 'object' ? skill.category : null;
  
  const { getThemeClass } = useTemplateStyle();
  const itemClass = getThemeClass(`enhanced-skill-item ${className}`);

  return (
    <div className={itemClass} {...props}>
      <div className="flex justify-between items-center">
        <div className="skill-info">
          <span className="skill-name text-text-1 font-medium">{skillName}</span>
          {skillCategory && (
            <span className="skill-category text-text-3 text-xs ml-2">
              ({skillCategory})
            </span>
          )}
        </div>
        
        {showLevel && skillLevel && (
          <div className="skill-level flex space-x-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i < skillLevel ? 'bg-accent' : 'bg-glass-2'
                }`}
              />
            ))}
          </div>
        )}
      </div>
      
      {showLevel && skillLevel && (
        <div className="skill-progress mt-2">
          <div className="w-full bg-glass-2 rounded-full h-1">
            <div 
              className="bg-accent h-1 rounded-full transition-all duration-300"
              style={{ width: `${(skillLevel / 5) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Enhanced Education Item
 */
export const EnhancedEducationItem = ({ 
  education, 
  showDetails = true,
  className = '',
  ...props 
}) => {
  const { getThemeClass } = useTemplateStyle();
  
  const itemClass = getThemeClass(`enhanced-education-item ${className}`);

  return (
    <GlassCard className={itemClass} {...props}>
      <GlassCardHeader>
        <div className="education-header flex justify-between items-start">
          <div className="flex-1">
            <GlassCardTitle className="education-degree">
              {education.degree}
            </GlassCardTitle>
            <p className="education-institution text-accent font-medium">
              {education.institution}
            </p>
            {education.location && (
              <p className="education-location text-text-3 text-sm">
                {education.location}
              </p>
            )}
          </div>
          <div className="education-year text-text-2 text-sm">
            {education.year}
          </div>
        </div>
      </GlassCardHeader>
      
      {showDetails && (education.description || education.gpa || education.honors) && (
        <GlassCardContent>
          {education.description && (
            <p className="education-description text-text-2 leading-relaxed mb-3">
              {education.description}
            </p>
          )}
          
          <div className="education-details flex flex-wrap gap-4 text-sm">
            {education.gpa && (
              <div className="education-gpa">
                <span className="text-text-3">GPA:</span>
                <span className="text-text-1 font-medium ml-1">{education.gpa}</span>
              </div>
            )}
            
            {education.honors && (
              <div className="education-honors">
                <span className="text-text-3">Honors:</span>
                <span className="text-accent ml-1">{education.honors}</span>
              </div>
            )}
          </div>
        </GlassCardContent>
      )}
    </GlassCard>
  );
};

// Helper Components

/**
 * Enhanced Portfolio Image with better error handling
 */
export const EnhancedPortfolioImage = ({ 
  src, 
  alt, 
  className = '',
  fallback = null,
  loading = 'lazy',
  onLoad = null,
  onError = null,
  ...props 
}) => {
  const { getAssetUrl } = usePortfolioData();
  const [imageState, setImageState] = useState('loading');
  
  const imageUrl = useMemo(() => {
    if (!src) return null;
    
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    
    return getAssetUrl(src);
  }, [src, getAssetUrl]);
  
  const handleImageLoad = useCallback(() => {
    setImageState('loaded');
    onLoad?.();
  }, [onLoad]);
  
  const handleImageError = useCallback(() => {
    setImageState('error');
    onError?.();
  }, [onError]);
  
  if (!imageUrl || imageState === 'error') {
    return fallback || (
      <div className={`portfolio-image-fallback bg-glass-2 flex items-center justify-center ${className}`} {...props}>
        <div className="text-center text-text-2 p-4">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-xs">Image not available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`enhanced-portfolio-image-container ${className}`}>
      {imageState === 'loading' && (
        <div className="image-loading-placeholder bg-glass-2 animate-pulse flex items-center justify-center absolute inset-0">
          <LoadingSpinner size="sm" />
        </div>
      )}
      <img
        src={imageUrl}
        alt={alt || 'Portfolio image'}
        className={`enhanced-portfolio-image ${imageState === 'loaded' ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        loading={loading}
        onLoad={handleImageLoad}
        onError={handleImageError}
        {...props}
      />
    </div>
  );
};

// Additional helper components and functions will be added in the next part...

/**
 * GitHub Stats Component
 */
export const GitHubStats = ({ stars, forks, watchers, className = '' }) => {
  const stats = [
    { key: 'stars', value: stars, icon: '⭐' },
    { key: 'forks', value: forks, icon: '🔀' },
    { key: 'watchers', value: watchers, icon: '👁️' }
  ].filter(stat => stat.value !== undefined && stat.value !== null);

  if (stats.length === 0) return null;

  return (
    <div className={`github-stats flex space-x-3 text-text-2 text-sm ${className}`}>
      {stats.map(({ key, value, icon }) => (
        <span key={key} className="flex items-center">
          <span className="mr-1">{icon}</span>
          {value.toLocaleString()}
        </span>
      ))}
    </div>
  );
};

/**
 * Technology Badges Component
 */
const TechnologyBadges = ({ technologies, className = '' }) => {
  if (!technologies || !Array.isArray(technologies)) return null;

  return (
    <div className={`technology-badges flex flex-wrap gap-2 ${className}`}>
      {technologies.map((tech, i) => (
        <span
          key={i}
          className="technology-badge px-2 py-1 bg-glass-2 text-text-2 text-xs rounded-full border border-border-1 hover:border-border-accent transition-colors"
        >
          {typeof tech === 'string' ? tech : tech.name}
        </span>
      ))}
    </div>
  );
};

/**
 * Project Links Component
 */
const ProjectLinks = ({ project, className = '' }) => {
  const links = [
    { key: 'demo', url: project.demo, label: 'Demo', icon: '🔗' },
    { key: 'source', url: project.source, label: 'Source', icon: '📁' },
    { key: 'npm', url: project.npm, label: 'NPM', icon: '📦' }
  ].filter(link => link.url);

  if (links.length === 0) return null;

  return (
    <div className={`project-links flex flex-wrap gap-3 mt-4 ${className}`}>
      {links.map(({ key, url, label, icon }) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="glass-button glass-button-secondary text-sm hover:scale-105 transition-transform"
        >
          <span className="mr-2">{icon}</span>
          {label}
        </a>
      ))}
    </div>
  );
};

/**
 * Project Image Fallback
 */
const ProjectImageFallback = ({ name }) => (
  <div className="w-full h-48 bg-glass-2 flex items-center justify-center">
    <div className="text-center text-text-2">
      <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
      <p className="text-sm font-medium">{name}</p>
    </div>
  </div>
);

/**
 * Object Renderer for object data
 */
const ObjectRenderer = ({ data, sectionName }) => {
  const { getThemeClass } = useTemplateStyle();
  
  if (!data || typeof data !== 'object') {
    return (
      <div className="text-text-2 text-center py-8">
        No {sectionName} data available
      </div>
    );
  }

  const objectClass = getThemeClass(`enhanced-object-renderer object-${sectionName}`);

  return (
    <GlassCard className={objectClass}>
      <GlassCardContent className="p-4">
        <div className="space-y-2">
          {Object.entries(data).map(([key, value]) => (
            <ObjectItem key={key} keyName={key} value={value} />
          ))}
        </div>
      </GlassCardContent>
    </GlassCard>
  );
};

/**
 * Object Item Renderer
 */
const ObjectItem = ({ keyName, value }) => {
  const renderValue = (val) => {
    if (typeof val === 'object' && val !== null) {
      return (
        <div className="ml-4 mt-2 space-y-1">
          {Object.entries(val).map(([k, v]) => (
            <ObjectItem key={k} keyName={k} value={v} />
          ))}
        </div>
      );
    }
    
    if (typeof val === 'string' && val.startsWith('http')) {
      return (
        <a 
          href={val} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-accent hover:text-accent-hover underline"
        >
          {val}
        </a>
      );
    }
    
    return <span className="text-text-2">{String(val)}</span>;
  };

  return (
    <div className="object-item">
      <div className="flex items-start">
        <span className="text-text-1 font-medium mr-2">{keyName}:</span>
        {renderValue(value)}
      </div>
    </div>
  );
};

/**
 * Text Renderer for simple text content
 */
const TextRenderer = ({ content }) => {
  if (!content) return null;

  return (
    <GlassCard>
      <GlassCardContent>
        <div className="text-text-2 leading-relaxed">
          {typeof content === 'string' ? (
            <p>{content}</p>
          ) : (
            <pre className="whitespace-pre-wrap">{JSON.stringify(content, null, 2)}</pre>
          )}
        </div>
      </GlassCardContent>
    </GlassCard>
  );
};

/**
 * Generic List Item for unknown section types
 */
const GenericListItem = ({ item, className = '' }) => {
  const { getThemeClass } = useTemplateStyle();
  
  const itemClass = getThemeClass(`generic-list-item ${className}`);

  return (
    <GlassCard className={itemClass}>
      <GlassCardContent>
        {typeof item === 'object' ? (
          <ObjectRenderer data={item} sectionName="generic" />
        ) : (
          <TextRenderer content={item} />
        )}
      </GlassCardContent>
    </GlassCard>
  );
};

// Utility Functions

/**
 * Processes GitHub-specific markdown features
 */
function processGitHubMarkdown(content, repository) {
  if (!content || !repository) return content;
  
  let processed = content;
  
  // Convert relative image URLs to absolute GitHub URLs
  processed = processed.replace(
    /!\[([^\]]*)\]\((?!https?:\/\/)([^)]+)\)/g,
    `![$1](https://raw.githubusercontent.com/${repository.full_name}/main/$2)`
  );
  
  // Convert relative links to GitHub blob URLs
  processed = processed.replace(
    /\[([^\]]+)\]\((?!https?:\/\/)(?!mailto:)(?!#)([^)]+)\)/g,
    `[$1](https://github.com/${repository.full_name}/blob/main/$2)`
  );
  
  // Handle GitHub-specific syntax like shields.io badges
  processed = processed.replace(
    /!\[([^\]]*)\]\(https:\/\/img\.shields\.io\/github\/([^)]+)\)/g,
    `![$1](https://img.shields.io/github/$2)`
  );
  
  // Handle GitHub mentions and issues
  processed = processed.replace(
    /@([a-zA-Z0-9-]+)/g,
    `[@$1](https://github.com/$1)`
  );
  
  processed = processed.replace(
    /#(\d+)/g,
    `[#$1](https://github.com/${repository.full_name}/issues/$1)`
  );
  
  return processed;
}

/**
 * Converts markdown to HTML with enhanced features
 */
function convertMarkdownToHTML(markdown) {
  if (!markdown) return '';
  
  let html = markdown;
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-text-1 mt-6 mb-3">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-text-1 mt-8 mb-4">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-text-1 mt-8 mb-4">$1</h1>');
  
  // Bold and italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-text-1">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
  
  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-glass-2 p-4 rounded-lg overflow-x-auto my-4 border border-border-1"><code class="text-sm">$1</code></pre>');
  html = html.replace(/`(.*?)`/g, '<code class="bg-glass-2 px-2 py-1 rounded text-sm border border-border-1">$1</code>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-accent hover:text-accent-hover underline transition-colors">$1</a>');
  
  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg border border-border-1 my-4" loading="lazy" />');
  
  // Lists
  html = html.replace(/^\* (.*$)/gim, '<li class="ml-4 mb-1">• $1</li>');
  html = html.replace(/^- (.*$)/gim, '<li class="ml-4 mb-1">• $1</li>');
  html = html.replace(/^\d+\. (.*$)/gim, '<li class="ml-4 mb-1 list-decimal">$1</li>');
  
  // Blockquotes
  html = html.replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-accent pl-4 italic text-text-2 my-4">$1</blockquote>');
  
  // Horizontal rules
  html = html.replace(/^---$/gim, '<hr class="border-border-1 my-8" />');
  
  // Line breaks
  html = html.replace(/\n\n/g, '</p><p class="mb-4">');
  html = html.replace(/\n/g, '<br>');
  
  // Wrap in paragraph tags if not already HTML
  if (!html.includes('<p>') && !html.includes('<h') && !html.includes('<div')) {
    html = `<p class="mb-4">${html}</p>`;
  }
  
  return html;
}

// Components are already exported individually above