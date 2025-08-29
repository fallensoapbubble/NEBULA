/**
 * Template Tracking Hook
 * Provides utilities for tracking template usage and interactions
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook for tracking template interactions
 */
export function useTemplateTracking() {
  const trackedViews = useRef(new Set());

  /**
   * Track a template event
   */
  const trackEvent = useCallback(async (templateId, event, metadata = {}) => {
    if (!templateId || !event) {
      console.warn('Template tracking: templateId and event are required');
      return;
    }

    try {
      const response = await fetch(`/api/templates/${encodeURIComponent(templateId)}/stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event,
          metadata: {
            userAgent: navigator.userAgent,
            referrer: document.referrer,
            timestamp: new Date().toISOString(),
            ...metadata
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Tracking failed: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Template tracking error:', error);
      return null;
    }
  }, []);

  /**
   * Track template view (only once per session)
   */
  const trackView = useCallback(async (templateId) => {
    if (trackedViews.current.has(templateId)) {
      return; // Already tracked in this session
    }

    const result = await trackEvent(templateId, 'view');
    if (result) {
      trackedViews.current.add(templateId);
    }
    return result;
  }, [trackEvent]);

  /**
   * Track template fork
   */
  const trackFork = useCallback(async (templateId, repositoryName) => {
    return await trackEvent(templateId, 'fork', {
      repositoryName,
      action: 'repository_created'
    });
  }, [trackEvent]);

  /**
   * Track template preview
   */
  const trackPreview = useCallback(async (templateId, previewType = 'modal') => {
    return await trackEvent(templateId, 'preview', {
      previewType,
      action: 'preview_opened'
    });
  }, [trackEvent]);

  /**
   * Track template download
   */
  const trackDownload = useCallback(async (templateId, downloadType = 'zip') => {
    return await trackEvent(templateId, 'download', {
      downloadType,
      action: 'template_downloaded'
    });
  }, [trackEvent]);

  /**
   * Get template statistics
   */
  const getStats = useCallback(async (templateId) => {
    if (!templateId) {
      return null;
    }

    try {
      const response = await fetch(`/api/templates/${encodeURIComponent(templateId)}/stats`);
      
      if (!response.ok) {
        throw new Error(`Failed to get stats: ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Failed to get template stats:', error);
      return null;
    }
  }, []);

  return {
    trackEvent,
    trackView,
    trackFork,
    trackPreview,
    trackDownload,
    getStats
  };
}

/**
 * Hook for automatically tracking template views
 */
export function useTemplateViewTracking(templateId, enabled = true) {
  const { trackView } = useTemplateTracking();
  const hasTracked = useRef(false);

  useEffect(() => {
    if (enabled && templateId && !hasTracked.current) {
      trackView(templateId);
      hasTracked.current = true;
    }
  }, [templateId, enabled, trackView]);

  // Reset tracking when template changes
  useEffect(() => {
    hasTracked.current = false;
  }, [templateId]);
}

/**
 * Hook for template popularity data
 */
export function useTemplatePopularity(templateId) {
  const { getStats } = useTemplateTracking();
  const [popularity, setPopularity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!templateId) {
      setPopularity(null);
      return;
    }

    let mounted = true;

    const fetchPopularity = async () => {
      setLoading(true);
      setError(null);

      try {
        const stats = await getStats(templateId);
        
        if (mounted) {
          if (stats) {
            setPopularity({
              score: stats.popularityScore,
              views: stats.views,
              forks: stats.forks,
              trending: stats.trending,
              rank: stats.rank,
              level: getPopularityLevel(stats.popularityScore)
            });
          } else {
            setPopularity(null);
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
          setPopularity(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchPopularity();

    return () => {
      mounted = false;
    };
  }, [templateId, getStats]);

  return { popularity, loading, error };
}

/**
 * Determine popularity level based on score
 */
function getPopularityLevel(score) {
  if (score >= 1000) return 'very-popular';
  if (score >= 500) return 'popular';
  if (score >= 100) return 'trending';
  if (score >= 50) return 'growing';
  return 'new';
}

/**
 * Hook for batch template statistics
 */
export function useBatchTemplateStats(templateIds) {
  const { getStats } = useTemplateTracking();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!templateIds || templateIds.length === 0) {
      setStats({});
      return;
    }

    let mounted = true;

    const fetchBatchStats = async () => {
      setLoading(true);
      setError(null);

      try {
        const promises = templateIds.map(async (templateId) => {
          const templateStats = await getStats(templateId);
          return { templateId, stats: templateStats };
        });

        const results = await Promise.all(promises);
        
        if (mounted) {
          const statsMap = results.reduce((acc, { templateId, stats }) => {
            acc[templateId] = stats;
            return acc;
          }, {});
          
          setStats(statsMap);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
          setStats({});
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchBatchStats();

    return () => {
      mounted = false;
    };
  }, [templateIds, getStats]);

  return { stats, loading, error };
}