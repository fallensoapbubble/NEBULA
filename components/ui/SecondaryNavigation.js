'use client';

import React from 'react';

/**
 * SecondaryNavigation - Contextual tab navigation component
 * 
 * @param {Object} props - Component props
 * @param {Array} props.tabs - Array of tab objects
 * @param {string} props.activeTab - Currently active tab ID
 * @param {string} props.context - Navigation context ('editor', 'gallery', 'settings')
 * @param {function} props.onTabChange - Tab change handler
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.variant - Navigation variant ('tabs', 'pills', 'underline')
 */
export const SecondaryNavigation = ({ 
  tabs = [], 
  activeTab, 
  context = 'editor',
  onTabChange,
  className = '',
  variant = 'tabs'
}) => {
  if (!tabs.length) return null;

  const getVariantClasses = () => {
    switch (variant) {
      case 'pills':
        return {
          container: 'bg-glass-1 p-1 rounded-lg',
          tab: 'px-4 py-2 rounded-md transition-all duration-200',
          active: 'bg-glass-3 text-text-1 shadow-sm',
          inactive: 'text-text-2 hover:text-text-1 hover:bg-glass-2'
        };
      case 'underline':
        return {
          container: 'border-b border-border-1',
          tab: 'px-4 py-3 border-b-2 transition-all duration-200',
          active: 'border-indigo-500 text-text-1',
          inactive: 'border-transparent text-text-2 hover:text-text-1 hover:border-border-1'
        };
      default: // tabs
        return {
          container: 'bg-glass-1 rounded-lg overflow-hidden',
          tab: 'px-6 py-3 transition-all duration-200',
          active: 'bg-glass-3 text-text-1',
          inactive: 'text-text-2 hover:text-text-1 hover:bg-glass-2'
        };
    }
  };

  const variantClasses = getVariantClasses();

  return (
    <nav className={`${className}`} role="tablist">
      <div className={`flex ${variantClasses.container}`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const tabClasses = [
            variantClasses.tab,
            isActive ? variantClasses.active : variantClasses.inactive,
            tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          ].filter(Boolean).join(' ');

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`${tab.id}-panel`}
              disabled={tab.disabled}
              className={tabClasses}
              onClick={() => !tab.disabled && onTabChange?.(tab.id)}
            >
              <div className="flex items-center space-x-2">
                {tab.icon && (
                  <span className="text-sm" aria-hidden="true">
                    {tab.icon}
                  </span>
                )}
                <span className="font-medium text-sm">{tab.label}</span>
                {tab.badge && (
                  <span className="bg-indigo-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

/**
 * TabPanel - Content panel for tabs
 */
export const TabPanel = ({ 
  id, 
  activeTab, 
  children, 
  className = '',
  ...props 
}) => {
  const isActive = activeTab === id;
  
  return (
    <div
      id={`${id}-panel`}
      role="tabpanel"
      aria-labelledby={id}
      hidden={!isActive}
      className={`${isActive ? 'block' : 'hidden'} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * Predefined tab configurations for different contexts
 */
export const getContextualTabs = (context, options = {}) => {
  const tabConfigs = {
    editor: [
      { id: 'edit', label: 'Edit', icon: '✏️' },
      { id: 'preview', label: 'Preview', icon: '👁️' },
      { id: 'settings', label: 'Settings', icon: '⚙️' }
    ],
    gallery: [
      { id: 'templates', label: 'Templates', icon: '🎨' },
      { id: 'featured', label: 'Featured', icon: '⭐' },
      { id: 'recent', label: 'Recent', icon: '🕒' }
    ],
    files: [
      { id: 'tree', label: 'Tree View', icon: '🌳' },
      { id: 'list', label: 'List View', icon: '📋' },
      { id: 'search', label: 'Search', icon: '🔍' }
    ],
    media: [
      { id: 'gallery', label: 'Gallery', icon: '🖼️' },
      { id: 'upload', label: 'Upload', icon: '📤' },
      { id: 'organize', label: 'Organize', icon: '📁' }
    ],
    settings: [
      { id: 'general', label: 'General', icon: '⚙️' },
      { id: 'appearance', label: 'Appearance', icon: '🎨' },
      { id: 'advanced', label: 'Advanced', icon: '🔧' }
    ]
  };

  const baseTabs = tabConfigs[context] || [];
  
  // Apply options like badges, disabled states, etc.
  return baseTabs.map(tab => ({
    ...tab,
    ...options[tab.id]
  }));
};

/**
 * TabContainer - Complete tab system with navigation and panels
 */
export const TabContainer = ({ 
  context = 'editor',
  tabs,
  activeTab,
  onTabChange,
  children,
  variant = 'tabs',
  className = ''
}) => {
  const tabsToUse = tabs || getContextualTabs(context);

  return (
    <div className={`w-full ${className}`}>
      <SecondaryNavigation
        tabs={tabsToUse}
        activeTab={activeTab}
        context={context}
        onTabChange={onTabChange}
        variant={variant}
      />
      <div className="mt-4">
        {children}
      </div>
    </div>
  );
};

/**
 * ResponsiveTabNavigation - Mobile-friendly tab navigation
 */
export const ResponsiveTabNavigation = ({ 
  tabs = [], 
  activeTab, 
  onTabChange,
  className = ''
}) => {
  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden md:block">
        <SecondaryNavigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={onTabChange}
          className={className}
        />
      </div>
      
      {/* Mobile Dropdown */}
      <div className="md:hidden">
        <select
          value={activeTab}
          onChange={(e) => onTabChange?.(e.target.value)}
          className="glass-select w-full"
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id} disabled={tab.disabled}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
};

export default SecondaryNavigation;