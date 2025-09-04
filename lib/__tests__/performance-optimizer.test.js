/**
 * Unit tests for performance optimization utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  PrefetchManager, 
  ImageOptimizer, 
  AssetOptimizer,
  PerformanceMonitor 
} from '../performance-optimizer';

// Mock DOM APIs
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
});
global.IntersectionObserver = mockIntersectionObserver;

const mockPerformanceObserver = vi.fn();
mockPerformanceObserver.mockReturnValue({
  observe: vi.fn(),
  disconnect: vi.fn(),
});
global.PerformanceObserver = mockPerformanceObserver;

// Mock fetch
global.fetch = vi.fn();

describe('PrefetchManager', () => {
  let prefetchManager;

  beforeEach(() => {
    prefetchManager = new PrefetchManager();
    vi.clearAllMocks();
  });

  it('should initialize with empty state', () => {
    expect(prefetchManager.prefetchedUrls.size).toBe(0);
    expect(prefetchManager.prefetchQueue.length).toBe(0);
    expect(prefetchManager.isProcessing).toBe(false);
  });

  it('should add URLs to prefetch queue', () => {
    prefetchManager.prefetch('/test-url', 'high');
    
    expect(prefetchManager.prefetchQueue).toHaveLength(1);
    expect(prefetchManager.prefetchQueue[0]).toEqual({
      url: '/test-url',
      priority: 'high'
    });
  });

  it('should not add duplicate URLs', () => {
    prefetchManager.prefetch('/test-url');
    prefetchManager.prefetch('/test-url');
    
    expect(prefetchManager.prefetchQueue).toHaveLength(1);
  });

  it('should sort queue by priority', async () => {
    prefetchManager.prefetch('/low', 'low');
    prefetchManager.prefetch('/high', 'high');
    prefetchManager.prefetch('/medium', 'medium');
    
    // Mock DOM methods
    document.createElement = vi.fn().mockReturnValue({
      rel: '',
      href: '',
    });
    document.head = { appendChild: vi.fn() };
    
    await prefetchManager.processPrefetchQueue();
    
    // Should process high priority first
    expect(prefetchManager.prefetchedUrls.has('/high')).toBe(true);
  });

  it('should generate user journey prefetch rules', () => {
    const spy = vi.spyOn(prefetchManager, 'prefetch');
    
    prefetchManager.prefetchUserJourney('/', {});
    
    expect(spy).toHaveBeenCalledWith('/templates', 'medium');
    expect(spy).toHaveBeenCalledWith('/auth/signin', 'medium');
  });
});

describe('ImageOptimizer', () => {
  it('should generate optimized props', () => {
    const props = ImageOptimizer.getOptimizedProps('/test.jpg', {
      width: 400,
      height: 300,
      quality: 80,
      priority: true
    });

    expect(props).toEqual({
      src: '/test.jpg',
      width: 400,
      height: 300,
      quality: 80,
      priority: true,
      placeholder: 'blur',
      blurDataURL: expect.stringContaining('data:image/svg+xml;base64,'),
      sizes: expect.stringContaining('400px'),
    });
  });

  it('should generate responsive sizes', () => {
    const sizes = ImageOptimizer.generateSizes(800);
    expect(sizes).toBe('(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 800px');
    
    const defaultSizes = ImageOptimizer.generateSizes();
    expect(defaultSizes).toBe('100vw');
  });

  it('should generate blur data URL', () => {
    const dataUrl = ImageOptimizer.generateBlurDataURL(400, 300);
    
    expect(dataUrl).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(dataUrl.length).toBeGreaterThan(50);
  });
});

describe('AssetOptimizer', () => {
  beforeEach(() => {
    // Mock Canvas API
    global.HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
    });
    global.HTMLCanvasElement.prototype.toBlob = vi.fn((callback, type, quality) => {
      const mockBlob = new Blob(['mock'], { type });
      callback(mockBlob);
    });
    
    // Mock Image API
    global.Image = class {
      constructor() {
        setTimeout(() => {
          this.width = 800;
          this.height = 600;
          this.onload?.();
        }, 0);
      }
    };
    
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
  });

  it('should compress images', async () => {
    const mockFile = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
    
    const compressed = await AssetOptimizer.compressImage(mockFile, {
      maxWidth: 1000,
      maxHeight: 800,
      quality: 0.8,
      format: 'webp'
    });

    expect(compressed).toBeInstanceOf(Blob);
  });

  it('should generate responsive images', async () => {
    const mockFile = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
    
    const images = await AssetOptimizer.generateResponsiveImages(mockFile);
    
    expect(images).toHaveLength(3);
    expect(images[0]).toHaveProperty('width', 640);
    expect(images[0]).toHaveProperty('suffix', 'sm');
    expect(images[1]).toHaveProperty('width', 1024);
    expect(images[2]).toHaveProperty('width', 1920);
  });
});

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    global.gtag = vi.fn();
    console.log = vi.fn();
  });

  it('should initialize web vitals measurement', () => {
    PerformanceMonitor.measureWebVitals();
    
    expect(mockPerformanceObserver).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should report metrics', () => {
    PerformanceMonitor.reportMetric('LCP', 2500);
    
    expect(global.gtag).toHaveBeenCalledWith('event', 'web_vitals', {
      event_category: 'Performance',
      event_label: 'LCP',
      value: 2500,
      non_interaction: true,
    });
  });

  it('should monitor resource loading', () => {
    PerformanceMonitor.monitorResourceLoading();
    
    expect(mockPerformanceObserver).toHaveBeenCalledWith(expect.any(Function));
  });
});