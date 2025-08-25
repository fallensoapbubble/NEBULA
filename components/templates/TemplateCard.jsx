import { useState } from 'react';
import { motion } from 'framer-motion';
import ForkWorkflow from './ForkWorkflow.jsx';

/**
 * Template Card Component
 * Displays template information with fork functionality
 */
export default function TemplateCard({ 
  template, 
  onForkComplete,
  onForkError,
  className = '' 
}) {
  const [showForkWorkflow, setShowForkWorkflow] = useState(false);

  const handleForkClick = () => {
    setShowForkWorkflow(true);
  };

  const handleForkComplete = (result) => {
    setShowForkWorkflow(false);
    
    if (onForkComplete) {
      onForkComplete(result, template);
    }
  };

  const handleForkError = (error) => {
    // Keep workflow open to show error
    
    if (onForkError) {
      onForkError(error, template);
    }
  };

  if (!template) {
    return null;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4 }}
        className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden ${className}`}
      >
        {/* Template Preview */}
        {template.preview_url && (
          <div className="aspect-video bg-gray-100 overflow-hidden">
            <img
              src={template.preview_url}
              alt={`${template.name} preview`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="w-full h-full hidden items-center justify-center bg-gray-100">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        )}

        {/* Template Info */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {template.name}
              </h3>
              <p className="text-sm text-gray-600">
                {template.repository}
              </p>
            </div>
            
            {/* Fork Button */}
            <button
              onClick={handleForkClick}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Fork
            </button>
          </div>

          {/* Description */}
          {template.description && (
            <p className="text-sm text-gray-700 mb-4 line-clamp-3">
              {template.description}
            </p>
          )}

          {/* Tags */}
          {template.tags && template.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {template.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                >
                  {tag}
                </span>
              ))}
              {template.tags.length > 3 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  +{template.tags.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Template Stats */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              {template.metadata?.author && (
                <span>by {template.metadata.author}</span>
              )}
              
              {template.metadata?.version && (
                <span>v{template.metadata.version}</span>
              )}
            </div>

            {/* Preview Link */}
            {template.preview_url && (
              <a
                href={template.preview_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                Preview
              </a>
            )}
          </div>

          {/* Template Structure Info */}
          {template.structure && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {template.structure.content_files?.length || 0} content files
                </span>
                <span>
                  {template.structure.required_fields?.length || 0} required fields
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Fork Workflow */}
      {showForkWorkflow && (
        <ForkWorkflow
          template={template}
          onForkComplete={handleForkComplete}
          onForkError={handleForkError}
          redirectToEditor={true}
        />
      )}
    </>
  );
}