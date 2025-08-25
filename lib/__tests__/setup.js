import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom';

// Extend Vitest's expect with Testing Library matchers
expect.extend(matchers);

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock next/navigation
import { vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock framer-motion for simpler testing
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (target, prop) => {
      return ({ children, ...props }) => {
        // Return a div with the motion props as data attributes
        const motionProps = {};
        Object.keys(props).forEach(key => {
          if (key.startsWith('animate') || key.startsWith('initial') || key.startsWith('exit') || key.startsWith('while')) {
            motionProps[`data-motion-${key}`] = JSON.stringify(props[key]);
          } else {
            motionProps[key] = props[key];
          }
        });
        
        return React.createElement(prop === 'div' ? 'div' : 'div', motionProps, children);
      };
    }
  }),
  AnimatePresence: ({ children }) => children,
}));

// Global React import for JSX
import React from 'react';
global.React = React;

// Make React available globally for JSX
globalThis.React = React;