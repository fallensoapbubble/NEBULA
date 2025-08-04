'use client';

import React, { useState } from 'react';
import { GlassCard } from '../ui/Card.js';
import { GlassIconButton } from '../ui/Button.js';

/**
 * SideNavbar - Collapsible sidebar navigation with glass styling
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isCollapsed - Whether the sidebar is collapsed
 * @param {function} props.onToggle - Toggle collapse handler
 * @param {string} props.currentPath - Current active path
 * @param {function} props.onNavigate - Navigation handler
 * @param {Object} props.repository - Repository information
 * @param {Array} props.recentFiles - Recent files list
 */
export const SideNavbar = ({ 
  isCollapsed = false, 
  onToggle,
  currentPath = '/',
  onNavigate,
  repository,
  recentFiles = [],
  className = ''
}) => {
  const [expandedSections, setExpandedSections] = useState({
    repository: true,
    content: true,
    tools: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const navigationSections = [
    {
      id: 'repository',
      title: 'Repository',
      icon: '🏠',
      items: [
        { label: 'Overview', icon: '📊', path: '/editor', description: 'Repository overview' },
        { label: 'Files', icon: '📁', path: '/editor/files', description: 'Browse files' },
        { label: 'Settings', icon: '⚙️', path: '/editor/settings', description: 'Repository settings' }
      ]
    },
    {
      id: 'content',
      title: 'Content',
      icon: '📝',
      items: [
        { label: 'Pages', icon: '📄', path: '/editor/pages', description: 'Edit pages' },
        { label: 'Media', icon: '🖼️', path: '/editor/media', description: 'Manage media' },
        { label: 'Data', icon: '💾', path: '/editor/data', description: 'Edit data files' }
      ]
    },
    {
      id: 'tools',
      title: 'Tools',
      icon: '🔧',
      items: [
        { label: 'Preview', icon: '👁️', path: '/editor/preview', description: 'Preview site' },
        { label: 'Deploy', icon: '🚀', path: '/editor/deploy', description: 'Deploy changes' },
        { label: 'History', icon: '🕒', path: '/editor/history', description: 'View history' }
      ]
    }
  ];

  const sidebarWidth = isCollapsed ? 'w-16' : 'w-64';
  const contentPadding = isCollapsed ? 'px-2' : 'px-4';

  return (
    <div className={`glass-sidebar h-full ${sidebarWidth} transition-all duration-300 ease-in-out ${className}`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b border-border-1 ${isCollapsed ? 'px-2' : ''}`}>
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">N</span>
              </div>
              <div>
                <h2 className="text-text-1 font-semibold text-sm">Nebula</h2>
                {repository && (
                  <p className="text-text-3 text-xs truncate">{repository.name}</p>
                )}
              </div>
            </div>
          )}
          <GlassIconButton
            onClick={onToggle}
            size="sm"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? '→' : '←'}
          </GlassIconButton>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto py-4">
          {navigationSections.map((section) => (
            <div key={section.id} className={`mb-6 ${contentPadding}`}>
              {!isCollapsed && (
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex items-center justify-between w-full text-left text-text-2 text-xs font-medium uppercase tracking-wider mb-3 hover:text-text-1 transition-colors"
                >
                  <span className="flex items-center space-x-2">
                    <span>{section.icon}</span>
                    <span>{section.title}</span>
                  </span>
                  <span className={`transform transition-transform ${expandedSections[section.id] ? 'rotate-90' : ''}`}>
                    ▶
                  </span>
                </button>
              )}
              
              {(isCollapsed || expandedSections[section.id]) && (
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = currentPath === item.path;
                    return (
                      <button
                        key={item.path}
                        onClick={() => onNavigate?.(item.path)}
                        className={`
                          w-full flex items-center space-x-3 p-2 rounded-lg text-left transition-all duration-200
                          ${isActive 
                            ? 'bg-glass-3 border border-border-accent text-text-1' 
                            : 'text-text-2 hover:bg-glass-2 hover:text-text-1'
                          }
                          ${isCollapsed ? 'justify-center' : ''}
                        `}
                        title={isCollapsed ? `${item.label} - ${item.description}` : undefined}
                      >
                        <span className="text-sm">{item.icon}</span>
                        {!isCollapsed && (
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{item.label}</div>
                            <div className="text-xs text-text-3 truncate">{item.description}</div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Recent Files */}
        {!isCollapsed && recentFiles.length > 0 && (
          <div className={`border-t border-border-1 p-4 ${contentPadding}`}>
            <h3 className="text-text-2 text-xs font-medium uppercase tracking-wider mb-3">
              Recent Files
            </h3>
            <div className="space-y-1">
              {recentFiles.slice(0, 5).map((file, index) => (
                <button
                  key={index}
                  onClick={() => onNavigate?.(file.path)}
                  className="w-full flex items-center space-x-2 p-2 rounded text-left text-text-3 hover:bg-glass-2 hover:text-text-1 transition-colors"
                >
                  <span className="text-xs">📄</span>
                  <span className="text-xs truncate">{file.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className={`border-t border-border-1 p-4 ${contentPadding}`}>
          {!isCollapsed ? (
            <div className="text-center">
              <p className="text-text-3 text-xs">
                Powered by Nebula
              </p>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-violet-500 rounded opacity-50"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SideNavbar;