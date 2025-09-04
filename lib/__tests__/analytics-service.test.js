/**
 * Unit tests for analytics service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  WebVitalsTracker,
  UserInteractionTracker,
  GitHubRateLimitMonitor,
  ErrorTracker,
  AnalyticsService
} from '../analytics-service';

// Mock DOM APIs
const mockPerformanceObserver = vi.fn();
mockPerformanceObserver.mockReturnValue({
  observe: vi.fn(),
  disconnect: vi.fn(),
});
global.PerformanceObserver = mockPerformanceObserver;

global.performance = {
  getEntriesByType: vi.fn().mockReturnValue([{
    responseStart: 100,
    requestStart: 50,
  }]),
  timeOrigin: Date.now(),
  now: vi.fn().mockReturnValue(Date.now()),
  mark: vi.fn(),
  measure: vi.fn()
};
