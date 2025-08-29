/**
 * EditorLayout - Main layout component for the web editor interface
 * Provides sidebar navigation, breadcrumbs, and content area
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useEditor, editorActions } from './EditorContext.js';
import { GlassButton } from '../ui/Button.js';
import { GlassCard } from '../ui/Card.js';

/**
 * Editor Sidebar Component
 */
const EditorSidebar = ({ isCollapsed, onToggle }) => {
  const { state, dispatch } = useEditor();
  const { repository, navigation, content } = state;

  // Sidebar navigation items (removed unnecessary routes)
  const navigationSections = [
    {
      title: 'Repository',
      items: [
        { 
          icon: '📁', 
          label: 'Overview', 
          path: `/editor/${repository.owner}/${repository.name}`,
          active: navigation.currentPath === `/editor/${repository.owner}/${repository.name}`
        },
        { 
          icon: '📄', 
          label: 'Files', 
          path: `/editor/${repository.owner}/${repository.name}/files`,
          active: navigation.currentPath.includes('/files')
        }
      ]
    },
    {
      title: 'Content',
      items: [
        { 
          icon: '✏️', 
          label: 'Editor', 
          path: `/editor/${repository.owner}/${repository.name}/edit`,
          active: navigation.activeSecondaryTab === 'edit'
        },
        { 
          icon: '👁️', 
          label: 'Preview', 
          path: `/editor/${repository.owner}/${repository.name}/preview`,
          active: navigation.activeSecondaryTab === 'preview'
        },
        { 
          icon: '🖼️', 
          label: 'Media', 
          path: `/editor/${repository.owner}/${repository.name}/media`,
          active: navigation.currentPath.includes('/media')
        }
      ]
    },
    {
      title: 'Tools',
      items: [
        { 
          icon: '🔄', 
          label: 'Sync', 
          path: `/editor/${repository.owner}/${repository.name}/sync`,
          active: navigation.currentPath.includes('/sync')
        },
        { 
          icon: '📊', 
          label: 'History', 
          path: `/editor/${repository.owner}/${repository.name}/history`,
          active: navigation.currentPath.includes('/history')
        }
      ]
    }
  ];

  const handleNavigation = (path) => {
    dispatch(editorActions.setCurrentPath(path));
    // Update breadcrumbs based on path
    updateBreadcrumbs(path);
  };

  const updateBreadcrumbs = (path) => {
    const baseBreadcrumbs = [
      { label: 'Home', href: '/', icon: '🏠' },
      { label: repository.owner, href: `/user/${repository.owner}`, icon: '👤' },
      { label: repository.name, href: `/editor/${repository.owner}/${repository.name}`, icon: '📁' }
    ];

    let breadcrumbs = [...baseBreadcrumbs];

    if (path.includes('/files')) {
      breadcrumbs.push({ label: 'Files', href: path, icon: '📄', active: true });
    } else if (path.includes('/edit')) {
      breadcrumbs.push({ label: 'Editor', href: path, icon: '✏️', active: true });
    } else if (path.includes('/preview')) {
      breadcrumbs.push({ label: 'Preview', href: path, icon: '👁️', active: true });
    } else if (path.includes('/media')) {
      breadcrumbs.push({ label: 'Media', href: path, icon: '🖼️', active: true });
    } else if (path.includes('/sync')) {
      breadcrumbs.push({ label: 'Sync', href: path, icon: '🔄', active: true });
    } else if (path.includes('/history')) {
      breadcrumbs.push({ label: 'History', href: path, icon: '📊', active: true });
    } else {
      breadcrumbs[breadcrumbs.length - 1].active = true;
    }

    dispatch(editorActions.setBreadcrumbs(breadcrumbs));
  };

  return (
    <div className={`fixed left-0 top-0 h-full glass-sidebar z-40 transform transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    } ${isCollapsed ? 'lg:w-16' : 'lg:w-64'}`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-white/20 to-white/10 rounded-xl flex items-center justify-center border border-white/20">
                <span className="text-white text-lg font-bold">N</span>
              </div>
              <div>
                <h1 className="text-white text-lg font-bold">Editor</h1>
                <p className="text-white/60 text-xs">{repository.owner}/{repository.name}</p>
              </div>
            </div>
          )}
          
          <button
            onClick={onToggle}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg 
              className={`w-5 h-5 transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="space-y-6">
          {navigationSections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              {!isCollapsed && (
                <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">
                  {section.title}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((item, itemIndex) => (
                  <button
                    key={itemIndex}
                    onClick={() => handleNavigation(item.path)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                      item.active 
                        ? 'bg-white/20 text-white border border-white/30' 
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                    title={isCollapsed ? item.label : ''}
                  >
                    <span className="text-lg flex-shrink-0">{item.icon}</span>
                    {!isCollapsed && (
                      <span className="font-medium truncate">{item.label}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Recent Files */}
        {!isCollapsed && navigation.recentFiles.length > 0 && (
          <div className="mt-8">
            <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">
              Recent Files
            </h3>
            <div className="space-y-1">
              {navigation.recentFiles.slice(0, 5).map((filePath, index) => (
                <button
                  key={index}
                  onClick={() => dispatch(editorActions.setCurrentFile(filePath))}
                  className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors text-left"
                >
                  <span className="text-sm">📄</span>
                  <span className="text-sm truncate">{filePath.split('/').pop()}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Status Indicators */}
        <div className="mt-8 space-y-2">
          {/* Unsaved Changes Indicator */}
          {Object.keys(content.unsavedChanges).length > 0 && (
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 ${
              isCollapsed ? 'justify-center' : ''
            }`}>
              <span className="text-amber-400 text-sm">⚠️</span>
              {!isCollapsed && (
                <span className="text-amber-400 text-xs">
                  {Object.keys(content.unsavedChanges).length} unsaved
                </span>
              )}
            </div>
          )}

          {/* Sync Status Indicator */}
          {state.sync.hasConflicts && (
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 ${
              isCollapsed ? 'justify-center' : ''
            }`}>
              <span className="text-red-400 text-sm">🔄</span>
              {!isCollapsed && (
                <span className="text-red-400 text-xs">Conflicts</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Editor Breadcrumbs Component
 */
const EditorBreadcrumbs = () => {
  const { state } = useEditor();
  const { breadcrumbs } = state.navigation;

  if (!breadcrumbs.length) return null;

  return (
    <div className="flex items-center space-x-2 text-sm">
      {breadcrumbs.map((crumb, index) => (
        <div key={index} className="flex items-center space-x-2">
          {index > 0 && (
            <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          {crumb.href && !crumb.active ? (
            <a 
              href={crumb.href}
              className="flex items-center space-x-1 text-white/60 hover:text-white transition-colors"
            >
              {crumb.icon && <span className="text-xs">{crumb.icon}</span>}
              <span>{crumb.label}</span>
            </a>
          ) : (
            <span className={`flex items-center space-x-1 ${crumb.active ? 'text-white font-medium' : 'text-white/60'}`}>
              {crumb.icon && <span className="text-xs">{crumb.icon}</span>}
              <span>{crumb.label}</span>
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

/**
 * Secondary Navigation Component
 */
const SecondaryNavigation = () => {
  const { state, dispatch } = useEditor();
  const { navigation, repository } = state;

  const tabs = [
    { id: 'edit', label: 'Edit', icon: '✏️' },
    { id: 'preview', label: 'Preview', icon: '👁️' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  const handleTabChange = (tabId) => {
    dispatch(editorActions.setActiveSecondaryTab(tabId));
    const newPath = `/editor/${repository.owner}/${repository.name}/${tabId}`;
    dispatch(editorActions.setCurrentPath(newPath));
  };

  return (
    <div className="flex items-center space-x-1 bg-white/5 rounded-lg p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleTabChange(tab.id)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
            navigation.activeSecondaryTab === tab.id
              ? 'bg-white/20 text-white shadow-sm'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <span className="text-sm">{tab.icon}</span>
          <span className="text-sm font-medium">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

/**
 * Main Editor Layout Component
 */
export const EditorLayout = ({ children, className = '' }) => {
  const { state, dispatch } = useEditor();
  const { navigation, ui, repository } = state;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Handle sidebar toggle
  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
    dispatch(editorActions.toggleSidebar());
  };

  // Handle mobile sidebar overlay
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Responsive sidebar handling
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`min-h-screen relative ${className}`}>
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <img 
          src="https://giffiles.alphacoders.com/141/14130.gif"
          alt="Background Animation"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/25"></div>
      </div>

      {/* Sidebar */}
      <EditorSidebar 
        isCollapsed={sidebarCollapsed} 
        onToggle={handleSidebarToggle}
      />

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className={`transition-all duration-300 ${
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      } relative z-10`}>
        {/* Top Navigation */}
        <nav className="glass-nav border-b border-white/10 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                  className="lg:hidden p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                {/* Breadcrumbs */}
                <EditorBreadcrumbs />
              </div>
              
              {/* Secondary Navigation */}
              <div className="hidden md:block">
                <SecondaryNavigation />
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                {ui.saving && (
                  <div className="flex items-center space-x-2 text-white/70">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span className="text-sm">Saving...</span>
                  </div>
                )}
                
                <GlassButton
                  variant="secondary"
                  size="sm"
                  onClick={() => window.open(`/${repository.owner}/${repository.name}`, '_blank')}
                >
                  View Live
                </GlassButton>
                
                <GlassButton
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://github.com/${repository.owner}/${repository.name}`, '_blank')}
                >
                  GitHub
                </GlassButton>
              </div>
            </div>
          </div>
        </nav>

        {/* Mobile Secondary Navigation */}
        <div className="md:hidden border-b border-white/10 bg-black/20 backdrop-blur-sm">
          <div className="px-4 py-3">
            <SecondaryNavigation />
          </div>
        </div>

        {/* Page Content */}
        <main className="relative z-10 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
};

export default EditorLayout;