/**
 * Template Statistics API Route
 * Tracks and provides template usage statistics
 */

import { NextResponse } from 'next/server';

// Mock statistics storage (in production, this would be a database)
const templateStats = new Map();

/**
 * GET /api/templates/[templateId]/stats
 * Get template usage statistics
 */
export async function GET(request, { params }) {
  try {
    const templateId = params.templateId;

    if (!templateId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_TEMPLATE_ID',
            message: 'Template ID is required'
          }
        },
        { status: 400 }
      );
    }

    // Get current stats or initialize
    const stats = templateStats.get(templateId) || {
      templateId,
      views: 0,
      forks: 0,
      lastViewed: null,
      lastForked: null,
      popularityScore: 0,
      weeklyViews: 0,
      monthlyViews: 0,
      weeklyForks: 0,
      monthlyForks: 0,
      createdAt: new Date().toISOString()
    };

    // Calculate popularity score
    const popularityScore = calculatePopularityScore(stats);

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        popularityScore,
        trending: isTemplatetrending(stats),
        rank: getTemplateRank(templateId)
      }
    });

  } catch (error) {
    console.error('Template stats API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve template statistics',
          details: error.message
        }
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/templates/[templateId]/stats
 * Track template usage events
 */
export async function POST(request, { params }) {
  try {
    const templateId = params.templateId;
    const { event, metadata = {} } = await request.json();

    if (!templateId || !event) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Template ID and event type are required'
          }
        },
        { status: 400 }
      );
    }

    // Validate event type
    const validEvents = ['view', 'fork', 'preview', 'download'];
    if (!validEvents.includes(event)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_EVENT',
            message: `Event must be one of: ${validEvents.join(', ')}`
          }
        },
        { status: 400 }
      );
    }

    // Get current stats or initialize
    const stats = templateStats.get(templateId) || {
      templateId,
      views: 0,
      forks: 0,
      previews: 0,
      downloads: 0,
      lastViewed: null,
      lastForked: null,
      lastPreviewed: null,
      lastDownloaded: null,
      popularityScore: 0,
      weeklyViews: 0,
      monthlyViews: 0,
      weeklyForks: 0,
      monthlyForks: 0,
      weeklyPreviews: 0,
      monthlyPreviews: 0,
      createdAt: new Date().toISOString()
    };

    // Update stats based on event
    const now = new Date().toISOString();
    
    switch (event) {
      case 'view':
        stats.views++;
        stats.weeklyViews++;
        stats.monthlyViews++;
        stats.lastViewed = now;
        break;
        
      case 'fork':
        stats.forks++;
        stats.weeklyForks++;
        stats.monthlyForks++;
        stats.lastForked = now;
        break;
        
      case 'preview':
        stats.previews++;
        stats.weeklyPreviews++;
        stats.monthlyPreviews++;
        stats.lastPreviewed = now;
        break;
        
      case 'download':
        stats.downloads++;
        stats.lastDownloaded = now;
        break;
    }

    // Add metadata if provided
    if (metadata.userAgent) {
      stats.lastUserAgent = metadata.userAgent;
    }
    if (metadata.referrer) {
      stats.lastReferrer = metadata.referrer;
    }

    // Update popularity score
    stats.popularityScore = calculatePopularityScore(stats);
    stats.updatedAt = now;

    // Store updated stats
    templateStats.set(templateId, stats);

    return NextResponse.json({
      success: true,
      data: {
        event,
        templateId,
        stats: {
          views: stats.views,
          forks: stats.forks,
          previews: stats.previews,
          downloads: stats.downloads,
          popularityScore: stats.popularityScore
        }
      }
    });

  } catch (error) {
    console.error('Template stats tracking error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to track template usage',
          details: error.message
        }
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate popularity score based on various metrics
 */
function calculatePopularityScore(stats) {
  const weights = {
    views: 1,
    forks: 10,
    previews: 2,
    downloads: 5,
    recency: 5
  };

  let score = 0;
  
  // Base metrics
  score += (stats.views || 0) * weights.views;
  score += (stats.forks || 0) * weights.forks;
  score += (stats.previews || 0) * weights.previews;
  score += (stats.downloads || 0) * weights.downloads;

  // Recency bonus (more recent activity gets higher score)
  const now = new Date();
  const lastActivity = new Date(Math.max(
    new Date(stats.lastViewed || 0).getTime(),
    new Date(stats.lastForked || 0).getTime(),
    new Date(stats.lastPreviewed || 0).getTime()
  ));
  
  const daysSinceActivity = (now - lastActivity) / (1000 * 60 * 60 * 24);
  const recencyMultiplier = Math.max(0, 1 - (daysSinceActivity / 30)); // Decay over 30 days
  score *= (1 + recencyMultiplier * weights.recency);

  return Math.round(score);
}

/**
 * Check if template is trending
 */
function isTemplatetrending(stats) {
  const weeklyThreshold = 10; // Minimum weekly views to be considered trending
  const forkRatio = 0.1; // Minimum fork-to-view ratio
  
  const hasEnoughViews = (stats.weeklyViews || 0) >= weeklyThreshold;
  const hasGoodForkRatio = (stats.forks || 0) / Math.max(stats.views || 1, 1) >= forkRatio;
  
  return hasEnoughViews && hasGoodForkRatio;
}

/**
 * Get template rank among all templates
 */
function getTemplateRank(templateId) {
  // Get all templates sorted by popularity score
  const allStats = Array.from(templateStats.values())
    .sort((a, b) => b.popularityScore - a.popularityScore);
  
  const rank = allStats.findIndex(stats => stats.templateId === templateId) + 1;
  return rank || null;
}

/**
 * GET /api/templates/stats/leaderboard
 * Get template leaderboard (top templates by popularity)
 */
export async function getLeaderboard(limit = 10) {
  const allStats = Array.from(templateStats.values())
    .sort((a, b) => b.popularityScore - a.popularityScore)
    .slice(0, limit);

  return allStats.map((stats, index) => ({
    rank: index + 1,
    templateId: stats.templateId,
    popularityScore: stats.popularityScore,
    views: stats.views,
    forks: stats.forks,
    trending: isTemplatetrending(stats)
  }));
}