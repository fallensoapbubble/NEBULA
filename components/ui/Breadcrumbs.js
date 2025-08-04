'use client';

import React from 'react';

/**
 * Breadcrumbs - Navigation trail component
 * 
 * @param {Object} props - Component props
 * @param {Array} props.items - Breadcrumb items array
 * @param {string} props.separator - Separator character/element
 * @param {number} props.maxItems - Maximum items to show before truncation
 * @param {function} props.onNavigate - Navigation handler
 * @param {string} props.className - Additional CSS classes
 */
export const Breadcrumbs = ({ 
  items = [], 
  separator = '/', 
  maxItems = 5,
  onNavigate,
  className = ''
}) => {
  if (!items.length) return null;

  // Handle truncation if there are too many items
  let displayItems = items;
  let showEllipsis = false;

  if (items.length > maxItems) {
    showEllipsis = true;
    // Keep first item, last 2 items, and show ellipsis
    displayItems = [
      items[0],
      { label: '...', path: null, isEllipsis: true },
      ...items.slice(-2)
    ];
  }

  return (
    <nav 
      className={`flex items-center space-x-2 text-sm ${className}`}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center space-x-2">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isClickable = item.path && !item.isEllipsis && onNavigate;

          return (
            <li key={`${item.path}-${index}`} className="flex items-center space-x-2">
              {/* Breadcrumb Item */}
              {item.isEllipsis ? (
                <span className="text-text-3 px-2">...</span>
              ) : isClickable ? (
                <button
                  onClick={() => onNavigate(item.path)}
                  className="flex items-center space-x-1 text-text-2 hover:text-text-1 transition-colors rounded px-2 py-1 hover:bg-glass-1"
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.icon && <span className="text-xs">{item.icon}</span>}
                  <span className={isLast ? 'text-text-1 font-medium' : ''}>{item.label}</span>
                </button>
              ) : (
                <span 
                  className={`flex items-center space-x-1 px-2 py-1 ${
                    isLast ? 'text-text-1 font-medium' : 'text-text-2'
                  }`}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.icon && <span className="text-xs">{item.icon}</span>}
                  <span>{item.label}</span>
                </span>
              )}

              {/* Separator */}
              {!isLast && (
                <span className="text-text-3 select-none" aria-hidden="true">
                  {separator}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

/**
 * BreadcrumbItem - Individual breadcrumb item component
 */
export const BreadcrumbItem = ({ 
  label, 
  path, 
  icon, 
  isActive = false, 
  onClick,
  className = ''
}) => {
  const baseClasses = 'flex items-center space-x-1 px-2 py-1 rounded transition-colors';
  const activeClasses = isActive 
    ? 'text-text-1 font-medium bg-glass-1' 
    : 'text-text-2 hover:text-text-1 hover:bg-glass-1';
  const clickableClasses = onClick ? 'cursor-pointer' : '';

  const combinedClasses = [
    baseClasses,
    activeClasses,
    clickableClasses,
    className
  ].filter(Boolean).join(' ');

  const handleClick = () => {
    if (onClick && path) {
      onClick(path);
    }
  };

  return (
    <span 
      className={combinedClasses}
      onClick={handleClick}
      aria-current={isActive ? 'page' : undefined}
    >
      {icon && <span className="text-xs">{icon}</span>}
      <span>{label}</span>
    </span>
  );
};

/**
 * BreadcrumbSeparator - Separator component
 */
export const BreadcrumbSeparator = ({ children = '/', className = '' }) => {
  return (
    <span className={`text-text-3 select-none ${className}`} aria-hidden="true">
      {children}
    </span>
  );
};

/**
 * Utility function to create breadcrumb items from path
 */
export const createBreadcrumbsFromPath = (path, pathLabels = {}) => {
  if (!path || path === '/') {
    return [{ label: 'Home', path: '/', icon: '🏠' }];
  }

  const segments = path.split('/').filter(Boolean);
  const breadcrumbs = [{ label: 'Home', path: '/', icon: '🏠' }];

  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const label = pathLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    
    breadcrumbs.push({
      label,
      path: currentPath,
      icon: getBreadcrumbIcon(segment)
    });
  });

  return breadcrumbs;
};

/**
 * Get appropriate icon for breadcrumb segment
 */
const getBreadcrumbIcon = (segment) => {
  const iconMap = {
    editor: '✏️',
    pages: '📄',
    media: '🖼️',
    data: '💾',
    files: '📁',
    settings: '⚙️',
    preview: '👁️',
    deploy: '🚀',
    history: '🕒',
    user: '👤',
    repository: '📦',
    templates: '🎨'
  };
  
  return iconMap[segment] || '📄';
};

export default Breadcrumbs;