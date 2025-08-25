/**
 * Dynamic Navigation System Tests
 * End-to-end tests for the complete navigation system
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PortfolioNavigationService } from '../portfolio-navigation-service.js';

// Mock Octokit
const mockOctokit = {
  rest: {
    repos: {
      get: vi.fn(),
      getContent: vi.fn()
    }
  }
};