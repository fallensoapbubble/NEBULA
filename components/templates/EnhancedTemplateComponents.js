/**
 * Enhanced Template Components
 * Advanced components for rendering portfolio data from GitHub files with template-specific layouts
 */

import React from 'react';
import { usePortfolioData } from './PortfolioDataProvider.js';
import { useTemplateStyle } from './TemplateStyleProvider.js';
import { MarkdownContent } from './TemplateComponents.js';

/**
 * GitHubFileRenderer - Enhanced component for rendering various GitHub file types
 */
export const GitHubFileRenderer = ({ 
  filePath, 
  fileContent, 
  repository,
  renderMode = 'auto',
  className = '',
  ...props 
}) => {
  const { getAssetUrl } = usePortfolioData();
  
  // Determine file type and rendering mode
  const fileExtension = filePath?.split('.').pop()?.toLowerCase();
  const actualRenderMode = renderMode === 'auto' ? detectRenderMode(filePath, fileContent) : renderMode;

  // Process content based on file type
  const processedContent = React.useMemo(() => {
    if (!fileContent) return '';
    if (!repository) return fileContent;
    if (!repository) return fileContent;
    
    let processed = fileContent;
    
    // Handle different file types
    switch (actualRenderMode) {
      case 'markdown':
        // Enhanced markdown processing for GitHub files
        processed = processMarkdownForGitHub(processed, repository);
        break;
      case 'json':
        // Pretty print JSON with syntax highlighting
        try {
          const parsed = typeof processed === 'string' ? JSON.parse(processed) : processed;
          processed = JSON.stringify(parsed, null, 2);
        } catch (e) {
          // Keep original if parsing fails
        }
        break;
      case 'yaml':
        // Basic YAML processing
        processed = processYamlContent(processed);
        break;
      default:
        // Plain text processing
        processed = processPlainText(processed, repository);
    }
    
    return processed;
  }, [fileContent, repository, actualRenderMode]);

  if (!fileContent) {
    return null;
  }

  return (
    <div className={`github-file-renderer file-type-${actualRenderMode} ${className}`} {...props}>
      {actualRenderMode === 'markdown' ? (
        <MarkdownContent
          content={processedContent}
          className="github-file-markdown"
        />
      ) : actualRenderMode === 'json' ? (
        <pre className="github-file-json bg-glass-2 p-4 rounded-lg overflow-x-auto">
          <code className="text-sm text-text-2">{processedContent}</code>
        </pre>
      ) : (
        <div className="github-file-content text-text-2 whitespace-pre-wrap">
          {processedContent}
        </div>
      )}
    </div>
  );
};

/**
 * TemplateSpecificRenderer - Renders content based on template configuration
 */
export const TemplateSpecificRenderer = ({ 
  template, 
  sectionName, 
  sectionData, 
  variant = 'default',
  className = '',
  ...props 
}) => {
  const { portfolio, repository } = usePortfolioData();
  const { getThemeClass } = useTemplateStyle();

  // Get template-specific rendering configuration
  const renderConfig = React.useMemo(() => {
    const config = template?.structure?.section_configs?.[sectionName] || {};
    return {
      layout: config.layout || 'default',
      components: config.components || [],
      styling: config.styling || {},
      ...config
    };
  }, [template, sectionName]);

  // Render based on template configuration
  const renderContent = () => {
    if (!sectionData) return null;

    switch (renderConfig.layout) {
      case 'grid':
        return (
          <div className={`grid ${renderConfig.styling.gridCols || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'} gap-6`}>
            {Array.isArray(sectionData) ? sectionData.map((item, index) => (
              <div key={index} className="template-grid-item">
                {renderSectionItem(item, renderConfig, index)}
              </div>
            )) : (
              <div className="template-grid-item">
                {renderSectionItem(sectionData, renderConfig, 0)}
              </div>
            )}
          </div>
        );
      case 'list':
        return (
          <div className="space-y-4">
            {Array.isArray(sectionData) ? sectionData.map((item, index) => (
              <div key={index} className="template-list-item">
                {renderSectionItem(item, renderConfig, index)}
              </div>
            )) : (
              <div className="template-list-item">
                {renderSectionItem(sectionData, renderConfig, 0)}
              </div>
            )}
          </div>
        );
      case 'carousel':
        return (
          <div className="template-carousel overflow-x-auto">
            <div className="flex space-x-4 pb-4">
              {Array.isArray(sectionData) ? sectionData.map((item, index) => (
                <div key={index} className="template-carousel-item flex-shrink-0 w-80">
                  {renderSectionItem(item, renderConfig, index)}
                </div>
              )) : (
                <div className="template-carousel-item flex-shrink-0 w-80">
                  {renderSectionItem(sectionData, renderConfig, 0)}
                </div>
              )}
            </div>
          </div>
        );
      default:
        return renderSectionItem(sectionData, renderConfig, 0);
    }
  };

  return (
    <div className={getThemeClass(`template-specific-renderer section-${sectionName} ${className}`)} {...props}>
      {renderContent()}
    </div>
  );
};

/**
 * CustomCSSRenderer - Component for applying custom CSS from repository files
 */
export const CustomCSSRenderer = ({ 
  cssContent, 
  repository,
  scope = 'template',
  className = '',
  children,
  ...props 
}) => {
  const [cssId] = React.useState(() => `custom-css-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  // Process and inject custom CSS
  React.useEffect(() => {
    if (!cssContent) return;

    try {
      // Process CSS content for repository-specific assets
      let processedCSS = cssContent;
      
      if (repository) {
        // Convert relative URLs in CSS to absolute GitHub URLs
        processedCSS = processedCSS.replace(
          /url\(['"]?(?!https?:\/\/)([^'")\s]+)['"]?\)/g,
          `url('https://raw.githubusercontent.com/${repository.full_name}/main/$1')`
        );
      }

      // Scope CSS if needed
      if (scope !== 'global') {
        processedCSS = scopeCSS(processedCSS, `.${cssId}`);
      }

      // Inject CSS
      const styleElement = document.createElement('style');
      styleElement.id = cssId;
      styleElement.textContent = processedCSS;
      document.head.appendChild(styleElement);

      return () => {
        const element = document.getElementById(cssId);
        if (element) {
          element.remove();
        }
      };
    } catch (error) {
      console.error('Failed to process custom CSS:', error);
    }
  }, [cssContent, repository, scope, cssId]);

  return (
    <div className={`custom-css-renderer ${cssId} ${className}`} {...props}>
      {children}
    </div>
  );
};

/**
 * RepositoryAssetRenderer - Component for rendering repository assets (images, files, etc.)
 */
export const RepositoryAssetRenderer = ({ 
  assetPath, 
  repository,
  assetType = 'auto',
  fallback = null,
  className = '',
  ...props 
}) => {
  const { getAssetUrl } = usePortfolioData();
  const [assetError, setAssetError] = React.useState(false);
  const [assetLoaded, setAssetLoaded] = React.useState(false);

  // Determine asset type and URL
  const { actualAssetType, assetUrl } = React.useMemo(() => {
    if (!assetPath) return { actualAssetType: 'unknown', assetUrl: null };

    const url = getAssetUrl(assetPath);
    const extension = assetPath.split('.').pop()?.toLowerCase();
    const type = assetType === 'auto' ? detectAssetType(extension) : assetType;

    return { actualAssetType: type, assetUrl: url };
  }, [assetPath, assetType, getAssetUrl]);

  const handleAssetError = () => {
    setAssetError(true);
  };

  const handleAssetLoad = () => {
    setAssetLoaded(true);
  };

  if (!assetUrl || assetError) {
    if (fallback) {
      return fallback;
    }
    
    return (
      <div className={`repository-asset-error bg-glass-2 border border-border-1 rounded-lg p-4 text-center ${className}`}>
        <div className="text-text-2">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.5-.935-6.086-2.455" />
          </svg>
          <p className="text-sm">Asset not found: {assetPath}</p>
        </div>
      </div>
    );
  }

  // Render based on asset type
  switch (actualAssetType) {
    case 'image':
      return (
        <div className={`repository-asset-image ${className}`} {...props}>
          {!assetLoaded && (
            <div className="asset-loading bg-glass-2 animate-pulse rounded-lg" style={{ aspectRatio: '16/9' }}>
              <div className="flex items-center justify-center h-full text-text-2">Loading...</div>
            </div>
          )}
          <img
            src={assetUrl}
            alt={assetPath}
            className={`${assetLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 rounded-lg`}
            onError={handleAssetError}
            onLoad={handleAssetLoad}
          />
        </div>
      );
    case 'video':
      return (
        <div className={`repository-asset-video ${className}`} {...props}>
          <video
            src={assetUrl}
            controls
            className="w-full rounded-lg"
            onError={handleAssetError}
            onLoadedData={handleAssetLoad}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    case 'audio':
      return (
        <div className={`repository-asset-audio ${className}`} {...props}>
          <audio
            src={assetUrl}
            controls
            className="w-full"
            onError={handleAssetError}
            onLoadedData={handleAssetLoad}
          >
            Your browser does not support the audio tag.
          </audio>
        </div>
      );
    default:
      return (
        <div className={`repository-asset-file ${className}`} {...props}>
          <a
            href={assetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 text-accent hover:text-accent-hover underline"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{assetPath}</span>
          </a>
        </div>
      );
  }
};

/**
 * AdvancedProjectCard - Enhanced project card with GitHub integration
 */
export const AdvancedProjectCard = ({ 
  project, 
  repository,
  variant = 'default',
  showGitHubStats = true,
  showReadme = false,
  className = '',
  ...props 
}) => {
  const { getAssetUrl } = usePortfolioData();

  // Enhanced project data handling for GitHub repositories
  const projectData = React.useMemo(() => {
    const data = { ...project };
    
    // Auto-generate GitHub source URL if not provided but we have repository info
    if (!data.source && repository && data.repository) {
      data.source = `https://github.com/${repository.owner}/${data.repository}`;
    }
    
    // Handle GitHub repository metadata
    if (data.github) {
      data.stars = data.github.stargazers_count;
      data.forks = data.github.forks_count;
      data.language = data.github.language;
      data.updated_at = data.github.updated_at;
      data.topics = data.github.topics || [];
    }
    
    return data;
  }, [project, repository]);

  const variantClasses = {
    default: 'bg-glass-1 border border-border-1 rounded-lg overflow-hidden hover:border-border-accent transition-all duration-300',
    compact: 'bg-glass-1 border border-border-1 rounded-lg p-4',
    minimal: 'border-b border-border-1 pb-4 mb-4 last:border-b-0 last:mb-0',
    featured: 'bg-gradient-to-br from-glass-1 to-glass-2 border border-accent/30 rounded-lg overflow-hidden shadow-glass-lg'
  };

  return (
    <div className={`advanced-project-card ${variantClasses[variant]} ${className}`} {...props}>
      {/* Project Image */}
      {variant !== 'minimal' && projectData.image && (
        <RepositoryAssetRenderer
          assetPath={projectData.image}
          repository={repository}
          className="project-image w-full h-48 object-cover"
          fallback={
            <div className="w-full h-48 bg-glass-2 flex items-center justify-center">
              <div className="text-center text-text-2">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-sm">{projectData.name}</p>
              </div>
            </div>
          }
        />
      )}
      
      <div className={`project-content ${variant === 'compact' ? '' : 'p-6'}`}>
        {/* Header with title and stats */}
        <div className="flex justify-between items-start mb-2">
          <h3 className="project-title text-xl font-semibold text-text-1">
            {projectData.name}
          </h3>
          {showGitHubStats && (projectData.stars || projectData.forks) && (
            <div className="flex space-x-3 text-text-2 text-sm">
              {projectData.stars && (
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {projectData.stars}
                </span>
              )}
              {projectData.forks && (
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  {projectData.forks}
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Description */}
        <p className="project-description text-text-2 mb-4 leading-relaxed">
          {projectData.description}
        </p>
        
        {/* Topics/Tags */}
        {projectData.topics && projectData.topics.length > 0 && (
          <div className="project-topics flex flex-wrap gap-2 mb-4">
            {projectData.topics.map((topic, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-accent/20 text-accent text-xs rounded-full border border-accent/30"
              >
                {topic}
              </span>
            ))}
          </div>
        )}
        
        {/* Technologies */}
        {projectData.technologies && projectData.technologies.length > 0 && (
          <div className="project-technologies flex flex-wrap gap-2 mb-4">
            {projectData.technologies.map((tech, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-glass-2 text-text-2 text-xs rounded-full border border-border-1"
              >
                {tech}
              </span>
            ))}
          </div>
        )}
        
        {/* Language indicator */}
        {projectData.language && (
          <div className="project-language mb-4">
            <span className="inline-flex items-center px-2 py-1 bg-accent/20 text-accent text-xs rounded-full">
              <span className="w-2 h-2 bg-accent rounded-full mr-2"></span>
              {projectData.language}
            </span>
          </div>
        )}
        
        {/* README preview */}
        {showReadme && projectData.readme && (
          <div className="project-readme mb-4">
            <GitHubFileRenderer
              filePath="README.md"
              fileContent={projectData.readme}
              repository={repository}
              className="bg-glass-2 p-3 rounded border border-border-1"
            />
          </div>
        )}
        
        {/* Action buttons */}
        <div className="project-links flex flex-wrap gap-3">
          {projectData.demo && (
            <a
              href={projectData.demo}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-button glass-button-primary text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Demo
            </a>
          )}
          {projectData.source && (
            <a
              href={projectData.source}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-button glass-button-secondary text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
              </svg>
              Source
            </a>
          )}
          {projectData.npm && (
            <a
              href={projectData.npm}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-button glass-button-secondary text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2L3 7v6l7 5 7-5V7l-7-5zM8 13H6v-3h2v3zm4 0h-2V8H8v5H6V8h6v5z"/>
              </svg>
              NPM
            </a>
          )}
        </div>
        
        {/* Metadata footer */}
        {projectData.updated_at && (
          <div className="project-meta mt-4 pt-4 border-t border-border-1 text-text-2 text-xs">
            Last updated: {new Date(projectData.updated_at).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper functions

/**
 * Detects the appropriate render mode for a file
 */
function detectRenderMode(filePath, content) {
  if (!filePath) return 'text';
  
  const extension = filePath.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'json':
      return 'json';
    case 'yml':
    case 'yaml':
      return 'yaml';
    case 'html':
    case 'htm':
      return 'html';
    default:
      return 'text';
  }
}

/**
 * Processes markdown content for GitHub-specific features
 */
function processMarkdownForGitHub(content, repository) {
  if (!repository) return content;
  
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
  
  // Handle GitHub-specific syntax like badges
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
 * Processes YAML content for display
 */
function processYamlContent(content) {
  // Basic YAML processing - could be enhanced with a YAML parser
  return content;
}

/**
 * Processes plain text content
 */
function processPlainText(content, repository) {
  // Basic text processing - convert URLs to links
  return content.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-accent hover:text-accent-hover underline">$1</a>'
  );
}

/**
 * Renders a section item based on configuration
 */
function renderSectionItem(item, config, index) {
  // This would be expanded based on template configuration
  if (typeof item === 'string') {
    return <div className="text-text-2">{item}</div>;
  }
  
  if (typeof item === 'object') {
    return (
      <div className="bg-glass-1 border border-border-1 rounded-lg p-4">
        {Object.entries(item).map(([key, value]) => (
          <div key={key} className="mb-2 last:mb-0">
            <span className="font-medium text-text-1">{key}: </span>
            <span className="text-text-2">{String(value)}</span>
          </div>
        ))}
      </div>
    );
  }
  
  return <div>{String(item)}</div>;
}

/**
 * Scopes CSS to a specific selector
 */
function scopeCSS(css, scope) {
  try {
    return css.replace(/([^{}]+){/g, (match, selector) => {
      const trimmedSelector = selector.trim();
      if (trimmedSelector.startsWith('@') || trimmedSelector.includes('keyframes')) {
        return match; // Don't scope at-rules
      }
      return `${scope} ${trimmedSelector} {`;
    });
  } catch (error) {
    console.error('Failed to scope CSS:', error);
    return css;
  }
}

/**
 * Detects asset type from file extension
 */
function detectAssetType(extension) {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'];
  const videoExtensions = ['mp4', 'webm', 'ogg', 'avi', 'mov'];
  const audioExtensions = ['mp3', 'wav', 'ogg', 'aac', 'm4a'];
  
  if (imageExtensions.includes(extension)) return 'image';
  if (videoExtensions.includes(extension)) return 'video';
  if (audioExtensions.includes(extension)) return 'audio';
  
  return 'file';
}

export default {
  GitHubFileRenderer,
  TemplateSpecificRenderer,
  CustomCSSRenderer,
  RepositoryAssetRenderer,
  AdvancedProjectCard
};