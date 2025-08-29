'use client';

import { useEffect } from 'react';
import { initializeErrorTracking, logEnvironmentInfo } from '../lib/debug-utils.js';

/**
 * Debug Initializer Component
 * Sets up error tracking and logging for development
 */
export default function DebugInitializer() {
  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV === 'development') {
      initializeErrorTracking();
      logEnvironmentInfo();
    }
  }, []);

  // This component doesn't render anything
  return null;
}