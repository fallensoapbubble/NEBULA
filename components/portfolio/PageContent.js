/**
 * Page Content Component
 * Renders different types of page content (markdown, JSON, YAML, HTML)
 * Supports dynamic content rendering based on file type
 */

'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

/**
 * Page Content Component
 * @param {object} props - Component props
 * @param {object} props.pageContent - Page content data
 * @param {object} props.pageInfo - Page information
 * @param {object} props.portfolioData - Portfolio data for context
 */
export function PageContent({ pageContent, pageInfo, portfolioData }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!pageContent) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>No content available for this page.</p>
        </div>
      </div>
    );
  }

  if (!pageContent.success) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500">
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="font-medium">Failed to load page content</p>
          <p className="text-sm text-gray-600 mt-1">{pageContent.error}</p>
        </div>
      </div>
    );
  }

  const { content } = pageContent;

  // Render based on content type
  switch (content.type) {
    case 'markdown':
      return <MarkdownContent content={content} pageInfo={pageInfo} portfolioData={portfolioData} />;
    
    case 'json':
      return <JsonContent content={content} pageInfo={pageInfo} portfolioData={portfolioData} />;
    
    case 'yaml':
      return <YamlContent content={content} pageInfo={pageInfo} portfolioData={portfolioData} />;
    
    case 'html':
      return <HtmlContent content={content} pageInfo={pageInfo} portfolioData={portfolioData} />;
    
    default:
      return <TextContent content={content} pageInfo={pageInfo} portfolioData={portfolioData} />;
  }
}

/**
 * Markdown Content Renderer
 */
function MarkdownContent({ content, pageInfo, portfolioData }) {
  const { frontmatter, body } = content;

  return (
    <div className="prose prose-lg max-w-none">
      {/* Render frontmatter as page header if present */}
      {frontmatter && Object.keys(frontmatter).length > 0 && (
        <div className="not-prose mb-8 p-6 bg-gray-50 rounded-lg border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Page Information</h2>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
            {Object.entries(frontmatter).map(([key, value]) => (
              <div key={key}>
                <dt className="text-sm font-medium text-gray-500 capitalize">
                  {key.replace(/[_-]/g, ' ')}
                </dt>
                <dd className="text-sm text-gray-900">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Render markdown body */}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          // Custom link renderer to handle internal links
          a: ({ href, children, ...props }) => {
            if (href && href.startsWith('/')) {
              // Internal link - could be enhanced to check if it's a portfolio page
              return (
                <a href={href} className="text-blue-600 hover:text-blue-800 underline" {...props}>
                  {children}
                </a>
              );
            }
            
            // External link
            return (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
                {...props}
              >
                {children}
                <svg className="inline-block w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
                </svg>
              </a>
            );
          },
          
          // Custom image renderer
          img: ({ src, alt, ...props }) => (
            <img 
              src={src} 
              alt={alt} 
              className="rounded-lg shadow-md max-w-full h-auto"
              loading="lazy"
              {...props}
            />
          ),
          
          // Custom code block renderer
          pre: ({ children, ...props }) => (
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto" {...props}>
              {children}
            </pre>
          ),
          
          // Custom table renderer
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200" {...props}>
                {children}
              </table>
            </div>
          )
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}

/**
 * JSON Content Renderer
 */
function JsonContent({ content, pageInfo, portfolioData }) {
  const { data } = content;

  // Try to render structured data intelligently
  if (Array.isArray(data)) {
    return <ArrayDataRenderer data={data} pageInfo={pageInfo} />;
  }

  if (typeof data === 'object' && data !== null) {
    return <ObjectDataRenderer data={data} pageInfo={pageInfo} />;
  }

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {pageInfo?.title || 'Page Content'}
      </h2>
      <pre className="bg-white p-4 rounded border text-sm overflow-x-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

/**
 * YAML Content Renderer
 */
function YamlContent({ content, pageInfo, portfolioData }) {
  // YAML content is parsed to JavaScript object, so render like JSON
  return <JsonContent content={content} pageInfo={pageInfo} portfolioData={portfolioData} />;
}

/**
 * HTML Content Renderer
 */
function HtmlContent({ content, pageInfo, portfolioData }) {
  return (
    <div className="prose prose-lg max-w-none">
      <div 
        dangerouslySetInnerHTML={{ __html: content.content }}
        className="html-content"
      />
    </div>
  );
}

/**
 * Text Content Renderer
 */
function TextContent({ content, pageInfo, portfolioData }) {
  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {pageInfo?.title || 'Page Content'}
      </h2>
      <pre className="whitespace-pre-wrap text-sm text-gray-700">
        {content.content}
      </pre>
    </div>
  );
}

/**
 * Array Data Renderer
 */
function ArrayDataRenderer({ data, pageInfo }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        {pageInfo?.title || 'Items'}
      </h2>
      
      <div className="grid gap-6">
        {data.map((item, index) => (
          <div key={index} className="bg-white rounded-lg border p-6">
            {typeof item === 'object' ? (
              <ObjectDataRenderer data={item} compact />
            ) : (
              <div className="text-gray-700">{String(item)}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Object Data Renderer
 */
function ObjectDataRenderer({ data, pageInfo, compact = false }) {
  const renderValue = (value) => {
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return (
          <ul className="list-disc list-inside space-y-1">
            {value.map((item, index) => (
              <li key={index} className="text-gray-700">
                {typeof item === 'object' ? JSON.stringify(item) : String(item)}
              </li>
            ))}
          </ul>
        );
      }
      return (
        <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }
    
    // Handle URLs
    if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
      return (
        <a 
          href={value} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline break-all"
        >
          {value}
        </a>
      );
    }
    
    return <span className="text-gray-700">{String(value)}</span>;
  };

  return (
    <div className={compact ? 'space-y-3' : 'space-y-6'}>
      {!compact && (
        <h2 className="text-2xl font-bold text-gray-900">
          {pageInfo?.title || 'Content'}
        </h2>
      )}
      
      <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className={compact ? 'col-span-1' : 'col-span-2'}>
            <dt className="text-sm font-medium text-gray-500 capitalize mb-1">
              {key.replace(/[_-]/g, ' ')}
            </dt>
            <dd className="text-sm">
              {renderValue(value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default PageContent;