/**
 * Validation Preview Integration Example
 * Demonstrates task 8.3: Real-Time Validation + Preview functionality
 */

'use client';

import React, { useState } from 'react';
import { EditorProvider } from '../EditorContext.js';
import { ValidationProvider } from '../ValidationProvider.js';
import { ValidationPreviewIntegration } from '../ValidationPreviewIntegration.js';
import { PreviewPane } from '../PreviewPane.js';
import { GlassCard, GlassCardHeader, GlassCardContent } from '../../ui/Card.js';
import { GlassButton } from '../../ui/Button.js';

/**
 * Example component showing validation and preview integration
 */
export const ValidationPreviewExample = () => {
  const [sampleData, setSampleData] = useState({
    personal: {
      name: 'John Doe',
      title: 'Full Stack Developer',
      email: 'john@example.com'
    },
    projects: [
      {
        title: 'Portfolio Website',
        description: 'A modern portfolio built with Next.js',
        technologies: ['React', 'Next.js', 'Tailwind CSS']
      }
    ],
    skills: ['JavaScript', 'React', 'Node.js', 'Python']
  });

  const [currentView, setCurrentView] = useState('integration'); // 'integration' | 'preview-only'

  /**
   * Simulate data changes for testing validation
   */
  const handleDataChange = (field, value) => {
    setSampleData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Add validation errors for testing
   */
  const addValidationErrors = () => {
    setSampleData(prev => ({
      ...prev,
      personal: {
        ...prev.personal,
        name: '', // This will cause a validation error
        email: 'invalid-email' // This will cause a validation error
      }
    }));
  };

  /**
   * Fix validation errors
   */
  const fixValidationErrors = () => {
    setSampleData(prev => ({
      ...prev,
      personal: {
        ...prev.personal,
        name: 'John Doe',
        email: 'john@example.com'
      }
    }));
  };

  return (
    <div className="validation-preview-example p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-text-1 mb-2">
          Real-Time Validation + Preview Demo
        </h1>
        <p className="text-text-2">
          Task 8.3 Implementation: Schema-based validation with live preview
        </p>
      </div>

      {/* Controls */}
      <GlassCard>
        <GlassCardHeader>
          <h2 className="text-xl font-semibold text-text-1">Demo Controls</h2>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="flex flex-wrap gap-4">
            <GlassButton
              onClick={() => setCurrentView('integration')}
              variant={currentView === 'integration' ? 'primary' : 'secondary'}
            >
              Full Integration
            </GlassButton>
            <GlassButton
              onClick={() => setCurrentView('preview-only')}
              variant={currentView === 'preview-only' ? 'primary' : 'secondary'}
            >
              Preview Only
            </GlassButton>
            <GlassButton
              onClick={addValidationErrors}
              variant="outline"
            >
              Add Validation Errors
            </GlassButton>
            <GlassButton
              onClick={fixValidationErrors}
              variant="outline"
            >
              Fix Validation Errors
            </GlassButton>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Sample Data Display */}
      <GlassCard>
        <GlassCardHeader>
          <h3 className="text-lg font-semibold text-text-1">Current Data</h3>
        </GlassCardHeader>
        <GlassCardContent>
          <pre className="bg-surface-2 rounded p-4 text-sm overflow-x-auto">
            {JSON.stringify(sampleData, null, 2)}
          </pre>
        </GlassCardContent>
      </GlassCard>

      {/* Editor with Validation and Preview */}
      <EditorProvider owner="demo-user" repo="demo-portfolio">
        <ValidationProvider owner="demo-user" repo="demo-portfolio">
          {currentView === 'integration' && (
            <ValidationPreviewIntegration />
          )}
          
          {currentView === 'preview-only' && (
            <PreviewPane showValidation={true} />
          )}
        </ValidationProvider>
      </EditorProvider>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard>
          <GlassCardContent className="text-center p-6">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-semibold text-text-1 mb-2">Real-Time Validation</h3>
            <p className="text-text-2 text-sm">
              Schema-based validation with inline feedback as you type
            </p>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardContent className="text-center p-6">
            <div className="text-3xl mb-3">👁️</div>
            <h3 className="font-semibold text-text-1 mb-2">Live Preview</h3>
            <p className="text-text-2 text-sm">
              See changes instantly with dark/light mode support
            </p>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardContent className="text-center p-6">
            <div className="text-3xl mb-3">⚠️</div>
            <h3 className="font-semibold text-text-1 mb-2">Unsaved Changes</h3>
            <p className="text-text-2 text-sm">
              Track changes with warnings and validation status
            </p>
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* Implementation Notes */}
      <GlassCard>
        <GlassCardHeader>
          <h3 className="text-lg font-semibold text-text-1">Implementation Features</h3>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-text-1 mb-2">✅ Validation Features</h4>
                <ul className="text-sm text-text-2 space-y-1">
                  <li>• Schema-based validation with inline feedback</li>
                  <li>• Real-time validation with debouncing</li>
                  <li>• Field-level and form-level validation</li>
                  <li>• Validation history tracking</li>
                  <li>• Completeness percentage calculation</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-text-1 mb-2">👁️ Preview Features</h4>
                <ul className="text-sm text-text-2 space-y-1">
                  <li>• Live preview with auto-updates</li>
                  <li>• Dark/light mode switching</li>
                  <li>• External preview window support</li>
                  <li>• Preview error handling</li>
                  <li>• Responsive preview viewport</li>
                </ul>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-text-1 mb-2">🔄 Integration Features</h4>
              <ul className="text-sm text-text-2 space-y-1">
                <li>• Unsaved changes tracking with validation status</li>
                <li>• Prevent saving when validation errors exist</li>
                <li>• Integrated validation and preview panels</li>
                <li>• Context-aware status indicators</li>
                <li>• Seamless editor integration</li>
              </ul>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
};

export default ValidationPreviewExample;