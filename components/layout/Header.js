'use client';

import React from 'react';
import { Breadcrumbs } from '../ui/Breadcrumbs.js';
import { GlassButton, GlassIconButton } from '../ui/Button.js';

/**
 * Header - Main header component with breadcrumbs and actions
 * 
 * @param {Object} props - Component props
 * @param {Array} props.breadcrumbs - Breadcrumb items
 * @param {function} props.onNavigate - Navigation handler
 * @param {Object} props.user - User information
 * @param {Array} props.actions - Header action buttons
 * @param {string} props.className - Additional CSS classes
 */
export const Header = ({ 
  breadcrumbs = [],
  onNavigate,
  user,
  actions = [],
  className = ''
}) => {
  return (
    <header className={`glass-nav border-b border-border-1 ${className}`}>
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left Section - Breadcrumbs */}
        <div className="flex items-center flex-1 min-w-0">
          <Breadcrumbs
            items={breadcrumbs}
            onNavigate={onNavigate}
            className="flex-1 min-w-0"
          />
        </div>

        {/* Right Section - Actions and User */}
        <div className="flex items-center space-x-4">
          {/* Custom Actions */}
          {actions.map((action, index) => (
            <div key={index}>
              {action}
            </div>
          ))}

          {/* User Menu */}
          {user && (
            <div className="flex items-center space-x-3">
              <div className="hidden sm:block text-right">
                <p className="text-text-1 text-sm font-medium">{user.name}</p>
                <p className="text-text-3 text-xs">{user.username}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white text-sm font-medium">
                    {user.name?.charAt(0) || user.username?.charAt(0) || '?'}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

/**
 * EditorHeader - Specialized header for the editor interface
 */
export const EditorHeader = ({ 
  repository,
  currentPath = '/',
  onNavigate,
  user,
  onSave,
  hasUnsavedChanges = false,
  isSaving = false,
  className = ''
}) => {
  // Create breadcrumbs from current path
  const createEditorBreadcrumbs = () => {
    const breadcrumbs = [{ label: 'Home', path: '/', icon: '🏠' }];
    
    if (repository) {
      breadcrumbs.push({
        label: repository.owner,
        path: `/user/${repository.owner}`,
        icon: '👤'
      });
      breadcrumbs.push({
        label: repository.name,
        path: `/editor/${repository.owner}/${repository.name}`,
        icon: '📦'
      });
    }

    // Add path segments
    if (currentPath !== '/editor' && currentPath !== '/') {
      const segments = currentPath.replace('/editor', '').split('/').filter(Boolean);
      let buildPath = '/editor';
      
      if (repository) {
        buildPath += `/${repository.owner}/${repository.name}`;
      }
      
      segments.forEach(segment => {
        buildPath += `/${segment}`;
        breadcrumbs.push({
          label: segment.charAt(0).toUpperCase() + segment.slice(1),
          path: buildPath,
          icon: getSegmentIcon(segment)
        });
      });
    }

    return breadcrumbs;
  };

  const getSegmentIcon = (segment) => {
    const iconMap = {
      pages: '📄',
      media: '🖼️',
      data: '💾',
      files: '📁',
      settings: '⚙️',
      preview: '👁️',
      deploy: '🚀',
      history: '🕒'
    };
    return iconMap[segment] || '📄';
  };

  const actions = [
    // Save button
    onSave && (
      <GlassButton
        key="save"
        variant={hasUnsavedChanges ? 'primary' : 'secondary'}
        onClick={onSave}
        loading={isSaving}
        disabled={!hasUnsavedChanges}
        size="sm"
      >
        {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
      </GlassButton>
    ),
    
    // Preview button
    repository && (
      <GlassIconButton
        key="preview"
        variant="secondary"
        onClick={() => window.open(`/${repository.owner}/${repository.name}`, '_blank')}
        aria-label="Preview portfolio"
        size="sm"
      >
        👁️
      </GlassIconButton>
    )
  ].filter(Boolean);

  return (
    <Header
      breadcrumbs={createEditorBreadcrumbs()}
      onNavigate={onNavigate}
      user={user}
      actions={actions}
      className={className}
    />
  );
};

/**
 * GalleryHeader - Specialized header for the template gallery
 */
export const GalleryHeader = ({ 
  onNavigate,
  user,
  searchQuery,
  onSearchChange,
  className = ''
}) => {
  const breadcrumbs = [
    { label: 'Home', path: '/', icon: '🏠' },
    { label: 'Templates', path: '/templates', icon: '🎨' }
  ];

  const actions = [
    // Search input
    <div key="search" className="relative">
      <input
        type="text"
        placeholder="Search templates..."
        value={searchQuery}
        onChange={(e) => onSearchChange?.(e.target.value)}
        className="glass-input w-64 pl-10"
      />
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-3">
        🔍
      </div>
    </div>
  ];

  return (
    <Header
      breadcrumbs={breadcrumbs}
      onNavigate={onNavigate}
      user={user}
      actions={actions}
      className={className}
    />
  );
};

export default Header;