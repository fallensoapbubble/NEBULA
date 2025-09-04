/**
 * GitHub API Usage Monitoring
 * Tracks and reports GitHub API usage and rate limits
 */

import monitoringService from '@/lib/monitoring-service.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '1h';

    // Get GitHub API usage data
    const dashboardData = await monitoringService.getDashboardData(timeRange);
    const githubData = dashboardData.githubAPI;

    // Get current rate limit status
    const rateLimitResponse = await fetch('https://api.github.com/rate_limit', {
      headers: {
        'Authorization': `token ${process.env.GITHUB_CLIENT_SECRET}`,
        'User-Agent': 'Nebula-Portfolio-Platform'
      }
    });

    let currentRateLimit = null;
    if (rateLimitResponse.ok) {
      const rateLimitData = await rateLimitResponse.json();
      currentRateLimit = rateLimitData.rate;
    }

    const usageData = {
      timeRange,
      usage: githubData,
      currentRateLimit,
      alerts: {
        rateLimitWarning: currentRateLimit && currentRateLimit.remaining < 100,
        rateLimitCritical: currentRateLimit && currentRateLimit.remaining < 10,
        highErrorRate: githubData.errorRate > 5
      },
      recommendations: []
    };

    // Add recommendations based on usage
    if (currentRateLimit && currentRateLimit.remaining < 100) {
      usageData.recommendations.push({
        type: 'warning',
        message: 'GitHub API rate limit is running low. Consider implementing caching or reducing API calls.',
        action: 'Implement Redis caching for frequently accessed data'
      });
    }

    if (githubData.errorRate > 5) {
      usageData.recommendations.push({
        type: 'error',
        message: 'High GitHub API error rate detected. Check authentication and permissions.',
        action: 'Review error logs and verify GitHub OAuth configuration'
      });
    }

    return Response.json({
      success: true,
      data: usageData
    });

  } catch (error) {
    console.error('GitHub usage monitoring error:', error);
    
    monitoringService.trackError(error, {
      endpoint: '/api/monitoring/github-usage',
      method: 'GET'
    });

    return Response.json({
      success: false,
      error: 'Failed to fetch GitHub usage data'
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { endpoint, method, statusCode, responseTime, rateLimitInfo } = body;

    // Track the API usage
    monitoringService.trackGitHubAPIUsage(
      endpoint,
      method,
      statusCode,
      responseTime,
      rateLimitInfo
    );

    return Response.json({
      success: true,
      message: 'GitHub API usage tracked'
    });

  } catch (error) {
    console.error('GitHub usage tracking error:', error);
    
    monitoringService.trackError(error, {
      endpoint: '/api/monitoring/github-usage',
      method: 'POST'
    });

    return Response.json({
      success: false,
      error: 'Failed to track GitHub usage'
    }, { status: 500 });
  }
}