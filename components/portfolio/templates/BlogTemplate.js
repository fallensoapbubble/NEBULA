'use client';

import React from 'react';

/**
 * Blog Template
 * Renders markdown-based portfolio content with a blog-style layout
 */
export function BlogTemplate({ content, template, metadata, repository, theme }) {
  // Extract markdown content files
  const markdownFiles = Object.entries(content).filter(([path, data]) => 
    data.type === 'markdown'
  );
  
  // Extract config if available
  const configFile = Object.entries(content).find(([path, data]) => 
    path.includes('config.json') || path.includes('site.json')
  );
  
  const siteConfig = configFile ? configFile[1].content : {};
  
  // Sort markdown files by date if available
  const sortedPosts = markdownFiles
    .map(([path, data]) => ({
      path,
      ...data,
      frontmatter: data.content.frontmatter || {},
      content: data.content.raw || data.content
    }))
    .sort((a, b) => {
      const dateA = new Date(a.frontmatter.date || 0);
      const dateB = new Date(b.frontmatter.date || 0);
      return dateB - dateA; // Most recent first
    });

  return (
    <div className={`blog-template ${theme}`}>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        
        {/* Header */}
        <BlogHeader siteConfig={siteConfig} repository={repository} />
        
        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {sortedPosts.length > 0 ? (
            <div className="space-y-12">
              {sortedPosts.map((post, index) => (
                <BlogPost key={post.path} post={post} isFirst={index === 0} />
              ))}
            </div>
          ) : (
            <EmptyBlogState />
          )}
        </main>
      </div>
    </div>
  );
}

/**
 * Blog Header Component
 */
function BlogHeader({ siteConfig, repository }) {
  return (
    <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {siteConfig.siteTitle || siteConfig.title || repository.name || 'Blog'}
          </h1>
          
          {(siteConfig.description || repository.description) && (
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              {siteConfig.description || repository.description}
            </p>
          )}
          
          {siteConfig.author && (
            <p className="text-white/60 mt-4">
              by {siteConfig.author}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}

/**
 * Blog Post Component
 */
function BlogPost({ post, isFirst }) {
  const { frontmatter, content, path } = post;
  
  return (
    <article className={`bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 ${isFirst ? 'md:p-12' : ''}`}>
      {/* Post Header */}
      <header className="mb-8">
        <h2 className={`font-bold text-white mb-4 ${isFirst ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl'}`}>
          {frontmatter.title || extractTitleFromPath(path)}
        </h2>
        
        <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
          {frontmatter.date && (
            <time dateTime={frontmatter.date}>
              {formatDate(frontmatter.date)}
            </time>
          )}
          
          {frontmatter.author && (
            <span>by {frontmatter.author}</span>
          )}
          
          {frontmatter.readTime && (
            <span>{frontmatter.readTime} min read</span>
          )}
        </div>
        
        {/* Tags */}
        {frontmatter.tags && frontmatter.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {frontmatter.tags.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-sm text-white/90"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        
        {/* Featured Badge */}
        {frontmatter.featured && (
          <div className="mt-4">
            <span className="inline-flex items-center px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-full text-sm text-blue-300">
              ⭐ Featured
            </span>
          </div>
        )}
      </header>
      
      {/* Post Content */}
      <div className="prose prose-lg prose-invert max-w-none">
        <MarkdownContent content={content} />
      </div>
      
      {/* Post Footer */}
      {(frontmatter.url || frontmatter.github) && (
        <footer className="mt-8 pt-6 border-t border-white/10">
          <div className="flex space-x-4">
            {frontmatter.url && (
              <a
                href={frontmatter.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
              >
                Read More →
              </a>
            )}
            
            {frontmatter.github && (
              <a
                href={frontmatter.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white transition-colors text-sm"
              >
                GitHub →
              </a>
            )}
          </div>
        </footer>
      )}
    </article>
  );
}

/**
 * Markdown Content Renderer
 */
function MarkdownContent({ content }) {
  // Remove frontmatter from content
  const cleanContent = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
  
  // Basic markdown parsing (you might want to use a proper markdown parser)
  const processedContent = cleanContent
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold text-white mt-8 mb-4">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-white mt-10 mb-6">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-white mt-12 mb-8">$1</h1>')
    
    // Bold and italic
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">$1</a>')
    
    // Code blocks (basic)
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-black/40 border border-white/10 rounded-lg p-4 overflow-x-auto my-6"><code class="text-sm text-white/90">$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-black/40 px-2 py-1 rounded text-sm text-white/90">$1</code>')
    
    // Paragraphs
    .replace(/\n\n/g, '</p><p class="text-white/80 leading-relaxed mb-4">')
    .replace(/^/, '<p class="text-white/80 leading-relaxed mb-4">')
    .replace(/$/, '</p>');

  return (
    <div 
      className="markdown-content"
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
}

/**
 * Empty Blog State Component
 */
function EmptyBlogState() {
  return (
    <div className="text-center py-20">
      <div className="text-6xl mb-6">📝</div>
      <h2 className="text-2xl font-bold text-white mb-4">
        No Posts Yet
      </h2>
      <p className="text-white/80 max-w-md mx-auto">
        This blog doesn&apos;t have any posts yet. Check back later for updates!
      </p>
    </div>
  );
}

/**
 * Utility Functions
 */

function extractTitleFromPath(path) {
  // Extract filename and remove extension
  const filename = path.split('/').pop().replace(/\.(md|markdown)$/, '');
  
  // Convert kebab-case or snake_case to title case
  return filename
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
}

export default BlogTemplate;