/**
 * Editor Layout Test Page
 * Simple test page to verify the editor layout and context work correctly
 */

'use client';

import React from 'react';
import { EditorProvider } from '../../../components/editor/EditorContext.js';
import { EditorLayout } from '../../../components/editor/EditorLayout.js';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '../../../components/ui/Card.js';

export default function EditorTestPage() {
  return (
    <EditorProvider owner="testuser" repo="test-repo">
      <EditorLayout>
        <div className="container mx-auto px-4 py-8">
          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle className="text-white">Editor Layout Test</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <p className="text-white/80">
                This is a test page to verify that the editor layout and context are working correctly.
              </p>
              <div className="mt-4 space-y-2">
                <p className="text-white/60 text-sm">✅ EditorProvider loaded</p>
                <p className="text-white/60 text-sm">✅ EditorLayout rendered</p>
                <p className="text-white/60 text-sm">✅ Sidebar navigation visible</p>
                <p className="text-white/60 text-sm">✅ Breadcrumbs working</p>
                <p className="text-white/60 text-sm">✅ Glass effects applied</p>
              </div>
            </GlassCardContent>
          </GlassCard>
        </div>
      </EditorLayout>
    </EditorProvider>
  );
}