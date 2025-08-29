/**
 * Template Metadata Component
 * Displays comprehensive template information including availability, stats, and features
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function TemplateMetadata({ template, showDetailed = false, className = '' }) {
  const [popularity, setPopularity] = useState(null);
  const [availability, setAvailability] = useState(null);

  useEffect(() => {
    if (template) {
      calculatePopularity();
      checkAvailability();
    }
  }, [template]);

  const calculatePopularity = () => {
    const stars = template.metadata?.stars || 0;
    const forks = template.metadata?.forks || 0;
    const totalScore = stars + (forks * 2); // Weight forks more heavily

    let level = 'new';
    let description = 'New template';

    if (totalScore >= 500) {
      level = 'popular';
      description = 'Very popular';
    } else if (totalScore >= 200) {
      level = 'trending';
      description = 'Trending';
    } else if (totalScore >= 50) {
      level = 'growing';
      description = 'Growing popularity';
    }

    setPopularity({
      level,
      description,
      score: totalScore,
      stars,
      forks
    });
  };

  const checkAvailability = () => {
    const hasLightMode = template.tags?.includes('light-mode') || template.tags?.includes('light');
    const hasDarkMode = template.tags?.includes('dark-mode') || template.tags?.includes('dark');
    const isResponsive = template.tags?.includes('responsive') || template.tags?.includes('mobile');
    const isAccessible = template.tags?.includes('accessible') || template.tags?.includes('a11y');

    setAvailability({
      lightMode: hasLightMode,
      darkMode: hasDarkMode,
      responsive: isResponsive,
      accessible: isAccessible,
      validated: template.validation?.isValid || false,
      lastUpdated: template.metadata?.updated_at
    });
  };

  if (!template) return null;

  return (
    <div className={`template-metadata ${className}`}>
      {/* Basic Metadata */}
      <div className="space-y-3">
        {/* Author and Version */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-glass-2 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {template.metadata?.author}
              </p>
              <p className="text-xs text-gray-400">
                v{template.metadata?.version}
              </p>
            </div>
          </div>

          {/* Popularity Badge */}
          {popularity && (
            <PopularityBadge popularity={popularity} />
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatItem
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            }
            label="Stars"
            value={template.metadata?.stars || 0}
          />
          <StatItem
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            }
            label="Forks"
            value={template.metadata?.forks || 0}
          />
          <StatItem
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            label="Updated"
            value={formatDate(template.metadata?.updated_at)}
          />
        </div>

        {/* Availability Status */}
        {availability && (
          <AvailabilityStatus availability={availability} />
        )}

        {/* Tags */}
        {template.tags && template.tags.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-400 mb-2">Tags</p>
            <div className="flex flex-wrap gap-1">
              {template.tags.map((tag, index) => (
                <TagBadge key={index} tag={tag} />
              ))}
            </div>
          </div>
        )}

        {/* Detailed Information */}
        {showDetailed && (
          <DetailedMetadata template={template} />
        )}

        {/* Validation Status */}
        <ValidationStatus validation={template.validation} />
      </div>
    </div>
  );
}

// Popularity Badge Component
function PopularityBadge({ popularity }) {
  const getBadgeColor = (level) => {
    switch (level) {
      case 'popular':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'trending':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'growing':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getIcon = (level) => {
    switch (level) {
      case 'popular':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'trending':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'growing':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        );
    }
  };

  return (
    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getBadgeColor(popularity.level)}`}>
      {getIcon(popularity.level)}
      <span>{popularity.description}</span>
    </div>
  );
}

// Stat Item Component
function StatItem({ icon, label, value }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center text-gray-400 mb-1">
        {icon}
      </div>
      <p className="text-sm font-medium text-white">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

// Availability Status Component
function AvailabilityStatus({ availability }) {
  const features = [
    {
      key: 'darkMode',
      label: 'Dark Mode',
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )
    },
    {
      key: 'lightMode',
      label: 'Light Mode',
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      key: 'responsive',
      label: 'Responsive',
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      key: 'accessible',
      label: 'Accessible',
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ];

  return (
    <div>
      <p className="text-xs font-medium text-gray-400 mb-2">Features</p>
      <div className="grid grid-cols-2 gap-2">
        {features.map((feature) => (
          <div
            key={feature.key}
            className={`flex items-center space-x-2 px-2 py-1 rounded text-xs ${
              availability[feature.key]
                ? 'bg-green-500/20 text-green-400'
                : 'bg-gray-500/20 text-gray-500'
            }`}
          >
            {feature.icon}
            <span>{feature.label}</span>
            {availability[feature.key] && (
              <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Tag Badge Component
function TagBadge({ tag }) {
  const getTagColor = (tag) => {
    const colorMap = {
      'minimal': 'bg-blue-500/20 text-blue-400',
      'creative': 'bg-purple-500/20 text-purple-400',
      'developer': 'bg-green-500/20 text-green-400',
      'business': 'bg-orange-500/20 text-orange-400',
      'photography': 'bg-pink-500/20 text-pink-400',
      'blog': 'bg-indigo-500/20 text-indigo-400',
      'dark-mode': 'bg-gray-500/20 text-gray-400',
      'light-mode': 'bg-yellow-500/20 text-yellow-400',
      'responsive': 'bg-teal-500/20 text-teal-400',
      'glassmorphic': 'bg-cyan-500/20 text-cyan-400'
    };

    return colorMap[tag] || 'bg-gray-500/20 text-gray-400';
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTagColor(tag)}`}>
      {tag}
    </span>
  );
}

// Detailed Metadata Component
function DetailedMetadata({ template }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="space-y-3 pt-3 border-t border-gray-700"
    >
      {/* Repository Information */}
      <div>
        <p className="text-xs font-medium text-gray-400 mb-2">Repository</p>
        <div className="space-y-1 text-xs text-gray-300">
          <div className="flex justify-between">
            <span>Full Name:</span>
            <span className="font-mono">{template.repository?.full_name}</span>
          </div>
          <div className="flex justify-between">
            <span>Created:</span>
            <span>{formatDate(template.metadata?.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span>Language:</span>
            <span>JavaScript</span>
          </div>
        </div>
      </div>

      {/* Structure Information */}
      <div>
        <p className="text-xs font-medium text-gray-400 mb-2">Structure</p>
        <div className="space-y-1 text-xs text-gray-300">
          <div className="flex justify-between">
            <span>Content Files:</span>
            <span>{template.structure?.content_files?.length || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Required Fields:</span>
            <span>{template.structure?.required_fields?.length || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Config Files:</span>
            <span>{template.structure?.config_files?.length || 0}</span>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="flex space-x-2">
        <a
          href={template.repository?.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-1 px-2 py-1 bg-glass-2 rounded text-xs text-gray-300 hover:text-white transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span>GitHub</span>
        </a>
        {template.preview_url && (
          <a
            href={template.preview_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 px-2 py-1 bg-glass-2 rounded text-xs text-gray-300 hover:text-white transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>Preview</span>
          </a>
        )}
      </div>
    </motion.div>
  );
}

// Validation Status Component
function ValidationStatus({ validation }) {
  if (!validation) return null;

  return (
    <div className="pt-3 border-t border-gray-700">
      <div className={`flex items-center space-x-2 text-xs ${
        validation.isValid ? 'text-green-400' : 'text-yellow-400'
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          validation.isValid ? 'bg-green-500' : 'bg-yellow-500'
        }`}></div>
        <span className="font-medium">
          {validation.isValid ? 'Template Validated' : 'Has Warnings'}
        </span>
      </div>

      {validation.warnings && validation.warnings.length > 0 && (
        <div className="mt-2 space-y-1">
          {validation.warnings.slice(0, 2).map((warning, index) => (
            <p key={index} className="text-xs text-yellow-300 pl-4">
              • {warning}
            </p>
          ))}
          {validation.warnings.length > 2 && (
            <p className="text-xs text-yellow-400 pl-4">
              +{validation.warnings.length - 2} more warnings
            </p>
          )}
        </div>
      )}

      {validation.errors && validation.errors.length > 0 && (
        <div className="mt-2 space-y-1">
          {validation.errors.slice(0, 2).map((error, index) => (
            <p key={index} className="text-xs text-red-300 pl-4">
              • {error}
            </p>
          ))}
          {validation.errors.length > 2 && (
            <p className="text-xs text-red-400 pl-4">
              +{validation.errors.length - 2} more errors
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Utility function to format dates
function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
  
  return date.toLocaleDateString();
}