
'use client';

import React, { useState, useEffect } from 'react';
import { GlassCard, GlassCardHeader, GlassCardContent, GlassCardTitle, GlassCardDescription } from '../../components/ui/Card.js';
import { GlassButton } from '../../components/ui/Button.js';
import { LoadingSpinner } from '../../components/ui/Loading.js';
import { AppLayout } from '../../components/layout/AppLayout.js';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGetStarted = () => {
    setIsLoading(true);
    // Redirect to GitHub OAuth
    if (typeof window !== 'undefined') {
      window.location.href = '/api/auth/github';
    }
  };

  const handleViewTemplates = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/templates';
    }
  };

  const features = [
    {
      icon: '🎨',
      title: 'Beautiful Templates',
      description: 'Choose from professionally designed portfolio templates that showcase your work perfectly.'
    },
    {
      icon: '🔧',
      title: 'Easy Customization',
      description: 'Edit your portfolio content through our intuitive web interface - no coding required.'
    },
    {
      icon: '🚀',
      title: 'Instant Deployment',
      description: 'Your portfolio goes live immediately at your personalized URL with automatic updates.'
    },
    {
      icon: '💾',
      title: 'Own Your Data',
      description: 'Everything is stored in your GitHub repository. You maintain complete control and ownership.'
    },
    {
      icon: '⚡',
      title: 'Lightning Fast',
      description: 'Built with Next.js and optimized for performance with global CDN distribution.'
    },
    {
      icon: '🔒',
      title: 'Secure & Private',
      description: 'Your data stays in your GitHub account. We never store your content on our servers.'
    }
  ];

  const breadcrumbs = [
    { label: 'Home', href: '/', active: true }
  ];

  const sidebarItems = [
    { icon: '🏠', label: 'Home', href: '/', active: true },
    { icon: '🎨', label: 'Templates', href: '/templates' },
    { icon: '📊', label: 'Dashboard', href: '/dashboard' }
  ];

  return (
    <AppLayout 
      breadcrumbs={breadcrumbs}
      sidebarItems={sidebarItems}
    >

        {/* Hero Section */}
        <section className="relative py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight text-contrast-strong">
                Your Portfolio,
                <br />
                <span className="bg-gradient-to-r from-white/90 to-white/60 bg-clip-text text-transparent">
                  Your Rules
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed text-contrast">
                Create stunning portfolios with professional templates, edit them through our intuitive interface, 
                and host them directly from your GitHub repository. Complete ownership, zero vendor lock-in.
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                <GlassButton
                  variant="primary"
                  onClick={handleGetStarted}
                  loading={isLoading}
                  size="lg"
                  leftIcon="🚀"
                >
                  Start Building Now
                </GlassButton>
                <GlassButton
                  variant="secondary"
                  onClick={handleViewTemplates}
                  size="lg"
                  leftIcon="🎨"
                >
                  Explore Templates
                </GlassButton>
              </div>

              {/* Feature Preview */}
              <div className="max-w-4xl mx-auto">
                <GlassCard className="p-4 sm:p-8 bg-visible border-white/15">
                  <div className="text-center">
                    <div className="text-6xl mb-4">✨</div>
                    <p className="text-white text-lg font-medium mb-2 text-contrast">Experience the Magic</p>
                    <p className="text-white/80 text-sm text-contrast">Professional portfolios made simple with our glassmorphic interface</p>
                  </div>
                </GlassCard>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 text-contrast-strong">
                Why Choose Nebula?
              </h2>
              <p className="text-xl text-white/80 max-w-2xl mx-auto text-contrast">
                Built for developers who value ownership, simplicity, and beautiful design.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <GlassCard key={index} className="h-full bg-visible border-white/15 hover:bg-white/8">
                  <GlassCardHeader>
                    <div className="text-4xl mb-4">{feature.icon}</div>
                    <GlassCardTitle className="text-white text-contrast">{feature.title}</GlassCardTitle>
                  </GlassCardHeader>
                  <GlassCardContent>
                    <GlassCardDescription className="text-white/80 text-contrast">{feature.description}</GlassCardDescription>
                  </GlassCardContent>
                </GlassCard>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 text-contrast-strong">
                How It Works
              </h2>
              <p className="text-xl text-white/80 max-w-2xl mx-auto text-contrast">
                Get your portfolio live in minutes with our simple 3-step process.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: '01',
                  title: 'Choose Template',
                  description: 'Browse our collection of professional portfolio templates and select the one that fits your style.',
                  icon: '🎨'
                },
                {
                  step: '02',
                  title: 'Customize Content',
                  description: 'Use our intuitive web editor to add your projects, experience, and personal information.',
                  icon: '✏️'
                },
                {
                  step: '03',
                  title: 'Go Live',
                  description: 'Your portfolio is automatically deployed and accessible at your personalized URL.',
                  icon: '🚀'
                }
              ].map((step, index) => (
                <div key={index} className="text-center">
                  <div className="relative mb-8">
                    <div className="w-20 h-20 bg-white/10 border border-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                      <span className="text-white text-2xl">{step.icon}</span>
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-white/20 border border-white/30 rounded-full flex items-center justify-center backdrop-blur-sm">
                      <span className="text-white text-sm font-bold">{step.step}</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4 text-contrast">{step.title}</h3>
                  <p className="text-white/80 leading-relaxed text-contrast">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <GlassCard className="text-center p-12 bg-visible border-white/15">
              <GlassCardHeader>
                <GlassCardTitle className="text-4xl md:text-5xl mb-6 text-white text-contrast-strong">
                  Ready to Build Your Portfolio?
                </GlassCardTitle>
                <GlassCardDescription className="text-xl mb-8 text-white/80 text-contrast">
                  Join developers who&apos;ve taken control of their online presence. 
                  Start building your professional portfolio today.
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <GlassButton
                    variant="primary"
                    onClick={handleGetStarted}
                    loading={isLoading}
                    size="lg"
                    leftIcon="🚀"
                  >
                    Get Started Free
                  </GlassButton>
                  <GlassButton
                    variant="secondary"
                    onClick={handleViewTemplates}
                    size="lg"
                    leftIcon="👁️"
                  >
                    View Examples
                  </GlassButton>
                </div>
                <p className="text-white/60 text-sm mt-6 text-contrast">
                  No credit card required • GitHub account needed • 100% free
                </p>
              </GlassCardContent>
            </GlassCard>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="flex items-center space-x-3 mb-4 md:mb-0">
                <div className="w-8 h-8 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <span className="text-white text-sm font-bold">N</span>
                </div>
                <div>
                  <p className="text-white font-semibold">Nebula</p>
                  <p className="text-white/50 text-xs">Decentralized Portfolio Platform</p>
                </div>
              </div>
              <div className="flex items-center space-x-6 text-white/50 text-sm">
                <a href="#" className="hover:text-white transition-colors">Privacy</a>
                <a href="#" className="hover:text-white transition-colors">Terms</a>
                <a href="#" className="hover:text-white transition-colors">Support</a>
                <a href="https://github.com" className="hover:text-white transition-colors">GitHub</a>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-white/10 text-center">
              <p className="text-white/50 text-sm">
                © 2024 Nebula. Built with ❤️ for developers who value ownership.
              </p>
            </div>
          </div>
        </footer>
    </AppLayout>
  );
}
