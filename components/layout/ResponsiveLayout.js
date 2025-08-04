'use client';

import React, { useState, useEffect } from 'react';
import { SideNavbar } from './Sidebar.js';
import { Header } from './Header.js';
import { GlassIconButton } from '../ui/Button.js';

/**
 * ResponsiveLayout - Main layout component with responsive navigation
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Main content
 * @param {Object} props.headerProps - Props for the header component
 * @param {Object} props.sidebarProps - Props for the sidebar component
 * @param {boolean} props.showSidebar - Whether to show the sidebar
 * @param {string} props.className - Additional CSS classes
 */
export const ResponsiveLayout = ({ 
  children,
  headerProps = {},
  sidebarProps = {},
  showSidebar = true,
  className = ''
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Auto-collapse sidebar on mobile
      if (mobile) {
        setIsSidebarCollapsed(true);
        setIsMobileMenuOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobile && isMobileMenuOpen) {
        const sidebar = document.getElementById('mobile-sidebar');
        if (sidebar && !sidebar.contains(event.target)) {
          setIsMobileMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, isMobileMenuOpen]);

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileMenuOpen(!isMobileMenuOpen);
    } else {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  const handleNavigate = (path) => {
    // Close mobile menu on navigation
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
    
    // Call the navigation handler from props
    if (headerProps.onNavigate) {
      headerProps.onNavigate(path);
    }
    if (sidebarProps.onNavigate) {
      sidebarProps.onNavigate(path);
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-bg-primary to-bg-secondary ${className}`}>
      {/* Mobile Menu Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden" />
      )}

      <div className="flex h-screen">
        {/* Sidebar */}
        {showSidebar && (
          <>
            {/* Desktop Sidebar */}
            <div className={`hidden md:block transition-all duration-300 ${
              isSidebarCollapsed ? 'w-16' : 'w-64'
            }`}>
              <SideNavbar
                {...sidebarProps}
                isCollapsed={isSidebarCollapsed}
                onToggle={toggleSidebar}
                onNavigate={handleNavigate}
                className="h-full"
              />
            </div>

            {/* Mobile Sidebar */}
            <div 
              id="mobile-sidebar"
              className={`md:hidden fixed left-0 top-0 h-full w-64 z-50 transform transition-transform duration-300 ${
                isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
            >
              <SideNavbar
                {...sidebarProps}
                isCollapsed={false}
                onToggle={toggleSidebar}
                onNavigate={handleNavigate}
                className="h-full"
              />
            </div>
          </>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <Header
            {...headerProps}
            onNavigate={handleNavigate}
            className="flex-shrink-0"
          />

          {/* Mobile Menu Button */}
          {isMobile && showSidebar && (
            <div className="md:hidden absolute top-4 left-4 z-30">
              <GlassIconButton
                onClick={toggleSidebar}
                size="sm"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? '✕' : '☰'}
              </GlassIconButton>
            </div>
          )}

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

/**
 * EditorLayout - Specialized layout for the editor interface
 */
export const EditorLayout = ({ 
  children,
  repository,
  currentPath,
  user,
  onNavigate,
  onSave,
  hasUnsavedChanges,
  isSaving,
  recentFiles = [],
  className = ''
}) => {
  const headerProps = {
    breadcrumbs: createEditorBreadcrumbs(repository, currentPath),
    onNavigate,
    user,
    actions: [
      onSave && (
        <button
          key="save"
          onClick={onSave}
          disabled={!hasUnsavedChanges || isSaving}
          className={`glass-button ${hasUnsavedChanges ? 'glass-button-primary' : 'glass-button-secondary'}`}
        >
          {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
        </button>
      )
    ].filter(Boolean)
  };

  const sidebarProps = {
    currentPath,
    onNavigate,
    repository,
    recentFiles
  };

  return (
    <ResponsiveLayout
      headerProps={headerProps}
      sidebarProps={sidebarProps}
      className={className}
    >
      {children}
    </ResponsiveLayout>
  );
};

/**
 * GalleryLayout - Specialized layout for the template gallery
 */
export const GalleryLayout = ({ 
  children,
  user,
  onNavigate,
  searchQuery,
  onSearchChange,
  className = ''
}) => {
  const headerProps = {
    breadcrumbs: [
      { label: 'Home', path: '/', icon: '🏠' },
      { label: 'Templates', path: '/templates', icon: '🎨' }
    ],
    onNavigate,
    user,
    actions: [
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
    ]
  };

  return (
    <ResponsiveLayout
      headerProps={headerProps}
      showSidebar={false}
      className={className}
    >
      {children}
    </ResponsiveLayout>
  );
};

// Helper function to create editor breadcrumbs
const createEditorBreadcrumbs = (repository, currentPath = '/') => {
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

export default ResponsiveLayout;