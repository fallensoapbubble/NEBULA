import React, { useState } from 'react';
import { GlassButton } from '../ui/Button.js';

/**
 * AppLayout - Main application layout with sidebar and breadcrumbs
 */
export const AppLayout = ({ 
  children, 
  breadcrumbs = [], 
  showSidebar = true,
  sidebarItems = [],
  className = '' 
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const defaultSidebarItems = [
    { icon: '🏠', label: 'Home', href: '/', active: true },
    { icon: '🎨', label: 'Templates', href: '/templates' },
    { icon: '📊', label: 'Dashboard', href: '/dashboard' },
    { icon: '⚙️', label: 'Settings', href: '/settings' },
    { icon: '📚', label: 'Documentation', href: '/docs' },
    { icon: '💬', label: 'Support', href: '/support' }
  ];

  const menuItems = sidebarItems.length > 0 ? sidebarItems : defaultSidebarItems;

  return (
    <div className={`min-h-screen relative ${className}`}>
      {/* Full Background GIF */}
      <div className="fixed inset-0 z-0">
        <img 
          src="https://giffiles.alphacoders.com/141/14130.gif"
          alt="Background Animation"
          className="w-full h-full object-cover"
        />
        {/* Lighter overlay to make GIF more visible */}
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/25"></div>
      </div>

      {showSidebar && (
        <>
          {/* Sidebar */}
          <div className={`fixed left-0 top-0 h-full w-64 glass-sidebar z-40 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-8">
                <div className="w-10 h-10 bg-gradient-to-br from-white/20 to-white/10 rounded-xl flex items-center justify-center border border-white/20">
                  <span className="text-white text-lg font-bold">N</span>
                </div>
                <div>
                  <h1 className="text-white text-xl font-bold">Nebula</h1>
                  <p className="text-white/60 text-xs">Portfolio Platform</p>
                </div>
              </div>

              <nav className="space-y-2">
                {menuItems.map((item, index) => (
                  <a
                    key={index}
                    href={item.href}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      item.active 
                        ? 'bg-white/20 text-white border border-white/30' 
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </a>
                ))}
              </nav>
            </div>
          </div>

          {/* Mobile Sidebar Overlay */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            ></div>
          )}
        </>
      )}

      {/* Main Content */}
      <div className={`${showSidebar ? 'lg:ml-64' : ''} relative z-10`}>
        {/* Top Navigation with Breadcrumbs */}
        <nav className="glass-nav border-b border-white/10 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                {showSidebar && (
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="lg:hidden p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                )}
                
                {/* Breadcrumbs */}
                {breadcrumbs.length > 0 && (
                  <div className="flex items-center space-x-2 text-sm">
                    {breadcrumbs.map((crumb, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        {index > 0 && (
                          <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                        {crumb.href ? (
                          <a 
                            href={crumb.href}
                            className={crumb.active ? 'text-white font-medium' : 'text-white/60 hover:text-white'}
                          >
                            {crumb.label}
                          </a>
                        ) : (
                          <span className={crumb.active ? 'text-white font-medium' : 'text-white/60'}>
                            {crumb.label}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-4">
                <GlassButton
                  variant="secondary"
                  onClick={() => window.location.href = '/templates'}
                  size="sm"
                >
                  Browse Templates
                </GlassButton>
                <GlassButton
                  variant="primary"
                  onClick={() => window.location.href = '/api/auth/github'}
                  size="sm"
                >
                  Get Started
                </GlassButton>
              </div>
            </div>
          </div>
        </nav>

        {/* Page Content */}
        <main className="relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
};

/**
 * Breadcrumb - Individual breadcrumb component
 */
export const Breadcrumb = ({ label, href, active = false, icon }) => {
  const content = (
    <span className={`flex items-center space-x-1 ${active ? 'text-white font-medium' : 'text-white/60 hover:text-white'}`}>
      {icon && <span className="text-sm">{icon}</span>}
      <span>{label}</span>
    </span>
  );

  if (href && !active) {
    return <a href={href}>{content}</a>;
  }

  return content;
};

/**
 * BreadcrumbSeparator - Separator component for breadcrumbs
 */
export const BreadcrumbSeparator = () => (
  <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export default AppLayout;