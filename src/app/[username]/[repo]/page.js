import { notFound } from 'next/navigation';
import Link from 'next/link';
// import { PortfolioRenderer } from '../../../components/portfolio/PortfolioRenderer.js';
// import { ErrorBoundary } from '../../../components/error/ErrorBoundary.js';

/**
 * Dynamic Portfolio Page with ISR
 * Renders portfolios from GitHub repositories at /[username]/[repo]
 */

// Enable ISR with 10-minute revalidation
export const revalidate = 600;

/**
 * Generate static params for popular repositories (optional)
 * This can be used to pre-generate popular portfolios
 */
export async function generateStaticParams() {
  // Return empty array to enable on-demand generation for all paths
  // In production, you might want to pre-generate popular portfolios
  return [];
}

/**
 * Generate metadata for the portfolio page
 */
export async function generateMetadata({ params }) {
  const { username, repo } = params;
  
  try {
    // Use a minimal GitHub API call to get basic repo info for metadata
    // This doesn't require authentication for public repos
    const response = await fetch(`https://api.github.com/repos/${username}/${repo}`, {
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (!response.ok) {
      return {
        title: `${username}/${repo} - Portfolio Not Found`,
        description: 'This portfolio could not be found or is not accessible.'
      };
    }
    
    const repoData = await response.json();
    
    return {
      title: `${repoData.name} - ${username}'s Portfolio`,
      description: repoData.description || `Portfolio by ${username}`,
      openGraph: {
        title: `${repoData.name} - ${username}'s Portfolio`,
        description: repoData.description || `Portfolio by ${username}`,
        type: 'website',
        url: `https://nebula-mu-henna.vercel.app/${username}/${repo}`,
      },
      twitter: {
        card: 'summary_large_image',
        title: `${repoData.name} - ${username}'s Portfolio`,
        description: repoData.description || `Portfolio by ${username}`,
      }
    };
  } catch (error) {
    return {
      title: `${username}/${repo} - Portfolio`,
      description: `Portfolio by ${username}`
    };
  }
}

/**
 * Main portfolio page component
 */
export default async function PortfolioPage({ params }) {
  const { username, repo } = params;
  
  try {
    // Validate parameters
    if (!username || !repo) {
      notFound();
    }
    
    // Validate GitHub username format (basic validation)
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]$/.test(username) && username.length > 39) {
      notFound();
    }
    
    // Validate repository name format (basic validation)
    if (!/^[a-zA-Z0-9._-]+$/.test(repo) && repo.length > 100) {
      notFound();
    }
    
    // Fetch portfolio data
    const portfolioData = await fetchPortfolioData(username, repo);
    
    if (!portfolioData.success) {
      // Handle different error types
      if (portfolioData.error === 'REPOSITORY_NOT_FOUND') {
        notFound();
      }
      
      if (portfolioData.error === 'REPOSITORY_PRIVATE') {
        return (
          <PortfolioErrorPage 
            type="private"
            username={username}
            repo={repo}
            message="This repository is private and cannot be displayed as a public portfolio."
          />
        );
      }
      
      if (portfolioData.error === 'INVALID_TEMPLATE') {
        return (
          <PortfolioErrorPage 
            type="invalid"
            username={username}
            repo={repo}
            message="This repository doesn't contain a valid portfolio template."
            details={portfolioData.details}
          />
        );
      }
      
      // Generic error
      return (
        <PortfolioErrorPage 
          type="error"
          username={username}
          repo={repo}
          message={portfolioData.message || "An error occurred while loading this portfolio."}
        />
      );
    }
    
    // Render the portfolio
    return (
      <div>
        <h1>Portfolio for {username}/{repo}</h1>
        <p>Portfolio data loaded successfully</p>
      </div>
    );
    
  } catch (error) {
    console.error('Portfolio page error:', error);
    
    // Return error page for any unexpected errors
    return (
      <PortfolioErrorPage 
        type="error"
        username={username}
        repo={repo}
        message="An unexpected error occurred while loading this portfolio."
      />
    );
  }
}

/**
 * Fetch portfolio data from GitHub repository
 * This function handles all the logic for retrieving and processing portfolio data
 */
async function fetchPortfolioData(username, repo) {
  try {
    // First, check if repository exists and is public using unauthenticated request
    const repoCheckResponse = await fetch(`https://api.github.com/repos/${username}/${repo}`, {
      next: { revalidate: 600 } // Cache for 10 minutes
    });
    
    if (!repoCheckResponse.ok) {
      if (repoCheckResponse.status === 404) {
        return {
          success: false,
          error: 'REPOSITORY_NOT_FOUND'
        };
      }
      
      if (repoCheckResponse.status === 403) {
        return {
          success: false,
          error: 'REPOSITORY_PRIVATE'
        };
      }
      
      throw new Error(`GitHub API error: ${repoCheckResponse.status}`);
    }
    
    const repoData = await repoCheckResponse.json();
    
    // Check if repository is private
    if (repoData.private) {
      return {
        success: false,
        error: 'REPOSITORY_PRIVATE'
      };
    }
    
    // Create GitHub API service (no auth token needed for public repos)
    // We'll use the public API endpoints
    const githubService = new PublicGitHubService();
    
    // For now, create a simple template analysis
    const analysisResult = {
      success: true,
      analysis: {
        templateType: 'github-readme',
        contentFiles: [
          { path: 'README.md', type: 'markdown', schema: null }
        ]
      }
    };
    
    // Fetch content files based on template analysis
    const contentResult = await fetchPortfolioContent(
      githubService, 
      username, 
      repo, 
      analysisResult.analysis
    );
    
    if (!contentResult.success) {
      return {
        success: false,
        error: 'CONTENT_FETCH_ERROR',
        message: contentResult.error
      };
    }
    
    return {
      success: true,
      data: {
        repository: repoData,
        template: analysisResult.analysis,
        content: contentResult.content,
        metadata: {
          username,
          repo,
          generatedAt: new Date().toISOString(),
          templateType: analysisResult.analysis.templateType
        }
      }
    };
    
  } catch (error) {
    console.error('Error fetching portfolio data:', error);
    
    return {
      success: false,
      error: 'FETCH_ERROR',
      message: error.message
    };
  }
}

/**
 * Fetch portfolio content based on template analysis
 */
async function fetchPortfolioContent(githubService, username, repo, templateAnalysis) {
  try {
    const content = {};
    const errors = [];
    const warnings = [];
    
    // Fetch each content file defined in the template
    for (const contentFile of templateAnalysis.contentFiles) {
      try {
        const fileResult = await githubService.getFileContent(username, repo, contentFile.path);
        
        if (fileResult.success) {
          // Validate and parse content based on file type
          const parseResult = await parseAndValidateContent(
            fileResult.content.content, 
            contentFile.type, 
            contentFile.schema,
            contentFile.path
          );
          
          if (parseResult.success) {
            content[contentFile.path] = {
              type: contentFile.type,
              content: parseResult.content,
              schema: contentFile.schema,
              lastModified: fileResult.content.lastModified,
              validation: parseResult.validation
            };
            
            // Add any warnings from parsing
            if (parseResult.warnings && parseResult.warnings.length > 0) {
              warnings.push(...parseResult.warnings.map(w => `${contentFile.path}: ${w}`));
            }
          } else {
            errors.push(`Failed to parse ${contentFile.path}: ${parseResult.error}`);
            
            // Still include raw content for debugging
            content[contentFile.path] = {
              type: contentFile.type,
              content: fileResult.content.content,
              schema: contentFile.schema,
              lastModified: fileResult.content.lastModified,
              parseError: parseResult.error,
              raw: true
            };
          }
        } else {
          // Handle missing files gracefully
          if (fileResult.status === 404) {
            warnings.push(`Content file not found: ${contentFile.path}`);
            
            // Create empty content structure based on schema
            content[contentFile.path] = {
              type: contentFile.type,
              content: createEmptyContentFromSchema(contentFile.schema, contentFile.type),
              schema: contentFile.schema,
              lastModified: new Date().toISOString(),
              missing: true
            };
          } else {
            errors.push(`Failed to fetch ${contentFile.path}: ${fileResult.error}`);
          }
        }
      } catch (error) {
        errors.push(`Error processing ${contentFile.path}: ${error.message}`);
      }
    }
    
    // Always return content, even if some files failed
    return {
      success: true,
      content,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      stats: {
        totalFiles: templateAnalysis.contentFiles.length,
        loadedFiles: Object.keys(content).length,
        errorCount: errors.length,
        warningCount: warnings.length
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: `Content fetch error: ${error.message}`
    };
  }
}

/**
 * Parse and validate content based on type and schema
 */
async function parseAndValidateContent(rawContent, type, schema, filePath) {
  try {
    let parsedContent;
    const validation = { valid: true, errors: [], warnings: [] };
    
    switch (type) {
      case 'json':
        try {
          parsedContent = JSON.parse(rawContent);
          
          // Validate against schema if provided
          if (schema) {
            const schemaValidation = validateContentAgainstSchema(parsedContent, schema);
            validation.valid = schemaValidation.valid;
            validation.errors = schemaValidation.errors;
            validation.warnings = schemaValidation.warnings;
          }
        } catch (parseError) {
          return {
            success: false,
            error: `Invalid JSON: ${parseError.message}`
          };
        }
        break;
        
      case 'markdown':
        const frontmatter = extractFrontmatter(rawContent);
        const content = rawContent.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
        
        parsedContent = {
          raw: rawContent,
          content: content.trim(),
          frontmatter
        };
        
        // Validate frontmatter against schema if provided
        if (schema && schema.frontmatter) {
          const frontmatterValidation = validateContentAgainstSchema(frontmatter, schema.frontmatter);
          validation.valid = frontmatterValidation.valid;
          validation.errors = frontmatterValidation.errors;
          validation.warnings = frontmatterValidation.warnings;
        }
        break;
        
      case 'yaml':
      case 'yml':
        try {
          // Basic YAML parsing (you might want to use a proper YAML parser)
          parsedContent = parseSimpleYaml(rawContent);
          
          if (schema) {
            const yamlValidation = validateContentAgainstSchema(parsedContent, schema);
            validation.valid = yamlValidation.valid;
            validation.errors = yamlValidation.errors;
            validation.warnings = yamlValidation.warnings;
          }
        } catch (parseError) {
          return {
            success: false,
            error: `Invalid YAML: ${parseError.message}`
          };
        }
        break;
        
      default:
        // Plain text or unknown type
        parsedContent = rawContent;
        validation.warnings.push(`Unknown content type: ${type}, treating as plain text`);
    }
    
    return {
      success: true,
      content: parsedContent,
      validation,
      warnings: validation.warnings
    };
    
  } catch (error) {
    return {
      success: false,
      error: `Parse error: ${error.message}`
    };
  }
}

/**
 * Validate content against schema definition
 */
function validateContentAgainstSchema(content, schema) {
  const validation = { valid: true, errors: [], warnings: [] };
  
  if (!schema || typeof schema !== 'object') {
    return validation;
  }
  
  try {
    // Basic schema validation
    for (const [fieldName, fieldDef] of Object.entries(schema)) {
      const value = content[fieldName];
      
      // Check required fields
      if (fieldDef.required && (value === undefined || value === null || value === '')) {
        validation.errors.push(`Required field missing: ${fieldName}`);
        validation.valid = false;
        continue;
      }
      
      // Skip validation if field is not present and not required
      if (value === undefined || value === null) {
        continue;
      }
      
      // Type validation
      if (fieldDef.type) {
        const typeValid = validateFieldType(value, fieldDef.type, fieldName);
        if (!typeValid.valid) {
          validation.errors.push(...typeValid.errors);
          validation.valid = false;
        }
        validation.warnings.push(...typeValid.warnings);
      }
      
      // Length validation
      if (fieldDef.maxLength && typeof value === 'string' && value.length > fieldDef.maxLength) {
        validation.warnings.push(`Field ${fieldName} exceeds maximum length of ${fieldDef.maxLength}`);
      }
      
      if (fieldDef.minLength && typeof value === 'string' && value.length < fieldDef.minLength) {
        validation.errors.push(`Field ${fieldName} is shorter than minimum length of ${fieldDef.minLength}`);
        validation.valid = false;
      }
    }
    
    // Check for unexpected fields
    for (const fieldName of Object.keys(content)) {
      if (!schema[fieldName]) {
        validation.warnings.push(`Unexpected field found: ${fieldName}`);
      }
    }
    
  } catch (error) {
    validation.errors.push(`Schema validation error: ${error.message}`);
    validation.valid = false;
  }
  
  return validation;
}

/**
 * Validate field type
 */
function validateFieldType(value, expectedType, fieldName) {
  const result = { valid: true, errors: [], warnings: [] };
  
  switch (expectedType) {
    case 'string':
      if (typeof value !== 'string') {
        result.errors.push(`Field ${fieldName} should be a string, got ${typeof value}`);
        result.valid = false;
      }
      break;
      
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        result.errors.push(`Field ${fieldName} should be a number, got ${typeof value}`);
        result.valid = false;
      }
      break;
      
    case 'boolean':
      if (typeof value !== 'boolean') {
        result.errors.push(`Field ${fieldName} should be a boolean, got ${typeof value}`);
        result.valid = false;
      }
      break;
      
    case 'array':
      if (!Array.isArray(value)) {
        result.errors.push(`Field ${fieldName} should be an array, got ${typeof value}`);
        result.valid = false;
      }
      break;
      
    case 'object':
      if (typeof value !== 'object' || Array.isArray(value) || value === null) {
        result.errors.push(`Field ${fieldName} should be an object, got ${typeof value}`);
        result.valid = false;
      }
      break;
      
    default:
      result.warnings.push(`Unknown field type: ${expectedType} for field ${fieldName}`);
  }
  
  return result;
}

/**
 * Create empty content structure from schema
 */
function createEmptyContentFromSchema(schema, type) {
  if (!schema || typeof schema !== 'object') {
    return type === 'json' ? {} : '';
  }
  
  const emptyContent = {};
  
  for (const [fieldName, fieldDef] of Object.entries(schema)) {
    switch (fieldDef.type) {
      case 'string':
      case 'text':
      case 'markdown':
        emptyContent[fieldName] = '';
        break;
      case 'number':
        emptyContent[fieldName] = 0;
        break;
      case 'boolean':
        emptyContent[fieldName] = false;
        break;
      case 'array':
        emptyContent[fieldName] = [];
        break;
      case 'object':
        emptyContent[fieldName] = fieldDef.properties ? 
          createEmptyContentFromSchema(fieldDef.properties, 'json') : {};
        break;
      default:
        emptyContent[fieldName] = null;
    }
  }
  
  return emptyContent;
}

/**
 * Simple YAML parser for basic key-value pairs
 */
function parseSimpleYaml(yamlContent) {
  const result = {};
  const lines = yamlContent.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        const key = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
        
        // Try to parse as number or boolean
        if (value === 'true') {
          result[key] = true;
        } else if (value === 'false') {
          result[key] = false;
        } else if (!isNaN(value) && value !== '') {
          result[key] = Number(value);
        } else {
          result[key] = value;
        }
      }
    }
  }
  
  return result;
}

/**
 * Extract frontmatter from markdown content
 */
function extractFrontmatter(content) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = content.match(frontmatterRegex);
  
  if (match) {
    try {
      // Simple YAML-like parsing for frontmatter
      const frontmatterText = match[1];
      const frontmatter = {};
      
      frontmatterText.split('\n').forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
          frontmatter[key] = value;
        }
      });
      
      return frontmatter;
    } catch (error) {
      console.warn('Failed to parse frontmatter:', error);
      return {};
    }
  }
  
  return {};
}

/**
 * Public GitHub Service for unauthenticated requests
 * This is a simplified version that only uses public API endpoints
 */
class PublicGitHubService {
  constructor() {
    this.baseUrl = 'https://api.github.com';
  }

  async getRepository(owner, repo) {
    const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}`, {
      next: { revalidate: 600 },
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Nebula-Portfolio-Platform'
      }
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    return {
      success: true,
      data: await response.json()
    };
  }
  
  async getContents(owner, repo, path = '') {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
    
    const response = await fetch(url, {
      next: { revalidate: 300 }, // Cache for 5 minutes
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Nebula-Portfolio-Platform'
      }
    });
    
    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch ${path}: ${response.status}`,
        status: response.status
      };
    }
    
    const data = await response.json();
    
    return {
      success: true,
      data
    };
  }

  async getFileContent(owner, repo, path, ref = null) {
    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}${ref ? `?ref=${ref}` : ''}`;
      
      const response = await fetch(url, {
        next: { revalidate: 300 },
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Nebula-Portfolio-Platform'
        }
      });
      
      if (!response.ok) {
        return {
          success: false,
          error: `Failed to fetch ${path}: ${response.status}`,
          status: response.status
        };
      }
      
      const file = await response.json();
      
      // Ensure we're dealing with a file, not a directory
      if (file.type !== 'file') {
        return {
          success: false,
          error: 'Path points to a directory, not a file'
        };
      }
      
      // Decode content (GitHub API returns base64 encoded content)
      const content = file.encoding === 'base64' 
        ? Buffer.from(file.content, 'base64').toString('utf-8')
        : file.content;
      
      return {
        success: true,
        content: {
          path: file.path,
          name: file.name,
          sha: file.sha,
          size: file.size,
          content,
          encoding: file.encoding,
          downloadUrl: file.download_url,
          lastModified: file.last_modified || new Date().toISOString()
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Error fetching file content: ${error.message}`
      };
    }
  }

  async getRepositoryStructure(owner, repo, path = '', ref = null) {
    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}${ref ? `?ref=${ref}` : ''}`;
      
      const response = await fetch(url, {
        next: { revalidate: 300 },
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Nebula-Portfolio-Platform'
        }
      });
      
      if (!response.ok) {
        return {
          success: false,
          error: `Failed to fetch repository structure: ${response.status}`,
          status: response.status
        };
      }
      
      const contents = await response.json();
      
      // Handle single file vs directory
      const items = Array.isArray(contents) ? contents : [contents];
      
      const structure = {
        path,
        type: 'directory',
        items: []
      };

      for (const item of items) {
        const structureItem = {
          name: item.name,
          path: item.path,
          type: item.type, // 'file' or 'dir'
          size: item.size,
          sha: item.sha,
          url: item.url,
          downloadUrl: item.download_url
        };

        // For files, add additional metadata
        if (item.type === 'file') {
          structureItem.extension = this.getFileExtension(item.name);
          structureItem.contentType = this.getContentType(item.name);
          structureItem.editable = this.isEditableFile(item.name);
        }

        structure.items.push(structureItem);
      }

      // Sort items: directories first, then files alphabetically
      structure.items.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'dir' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      return {
        success: true,
        structure
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Error fetching repository structure: ${error.message}`
      };
    }
  }

  // Utility methods
  getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  }

  getContentType(filename) {
    const extension = this.getFileExtension(filename);
    const contentTypes = {
      'json': 'application/json',
      'md': 'text/markdown',
      'markdown': 'text/markdown',
      'txt': 'text/plain',
      'js': 'application/javascript',
      'ts': 'application/typescript',
      'html': 'text/html',
      'css': 'text/css',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml'
    };
    
    return contentTypes[extension] || 'text/plain';
  }

  isEditableFile(filename) {
    const extension = this.getFileExtension(filename);
    const editableExtensions = ['json', 'md', 'markdown', 'txt', 'js', 'ts', 'html', 'css', 'yml', 'yaml'];
    return editableExtensions.includes(extension);
  }
}

/**
 * Portfolio Error Page Component
 */
function PortfolioErrorPage({ type, username, repo, message, details }) {
  const errorMessages = {
    private: {
      title: "Private Repository",
      description: "This repository is private and cannot be displayed as a public portfolio.",
      suggestion: "Make the repository public to display it as a portfolio."
    },
    invalid: {
      title: "Invalid Portfolio Template",
      description: "This repository doesn't contain a valid portfolio template structure.",
      suggestion: "Add a .nebula/config.json file with proper template configuration."
    },
    error: {
      title: "Portfolio Unavailable",
      description: "An error occurred while loading this portfolio.",
      suggestion: "Please try again later or contact the repository owner."
    }
  };
  
  const errorInfo = errorMessages[type] || errorMessages.error;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 text-center">
        <div className="text-6xl mb-6">
          {type === 'private' ? '🔒' : type === 'invalid' ? '⚠️' : '❌'}
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-4">
          {errorInfo.title}
        </h1>
        
        <p className="text-white/80 mb-6">
          {message || errorInfo.description}
        </p>
        
        <div className="text-sm text-white/60 mb-6">
          <p><strong>Repository:</strong> {username}/{repo}</p>
        </div>
        
        <p className="text-sm text-white/60 mb-8">
          {errorInfo.suggestion}
        </p>
        
        {details && (
          <details className="text-left text-sm text-white/50 mb-6">
            <summary className="cursor-pointer mb-2">Technical Details</summary>
            <pre className="bg-black/20 p-3 rounded text-xs overflow-auto">
              {JSON.stringify(details, null, 2)}
            </pre>
          </details>
        )}
        
        <div className="flex flex-col sm:flex-row gap-3">
          <a 
            href={`https://github.com/${username}/${repo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg px-4 py-2 text-white text-sm transition-colors"
          >
            View on GitHub
          </a>
          <Link 
            href="/"
            className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 text-white text-sm transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}