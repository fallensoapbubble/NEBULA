import { NextResponse } from 'next/server';

/**
 * GitHub API Rate Limit Monitoring
 * Provides information about current GitHub API rate limit status
 */

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    // Basic rate limit check without authentication
    if (!token) {
      const publicRateLimit = await checkPublicRateLimit();
      
      return NextResponse.json({
        service: 'rate-limit-monitor',
        type: 'public',
        rateLimit: publicRateLimit,
        timestamp: new Date().toISOString(),
        note: 'This shows public API rate limits. Provide token for authenticated limits.'
      });
    }

    // Verify token for authenticated rate limit info
    if (!verifyMonitoringToken(token)) {
      return NextResponse.json(
        { 
          error: 'Invalid monitoring token',
          service: 'rate-limit-monitor'
        },
        { status: 401 }
      );
    }

    // Get authenticated rate limit information
    const authenticatedRateLimit = await checkAuthenticatedRateLimit();
    
    return NextResponse.json({
      service: 'rate-limit-monitor',
      type: 'authenticated',
      rateLimit: authenticatedRateLimit,
      recommendations: generateRateLimitRecommendations(authenticatedRateLimit),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Rate limit monitoring error:', error);
    
    return NextResponse.json(
      { 
        service: 'rate-limit-monitor',
        error: 'Failed to check rate limit status',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Check public GitHub API rate limit
 */
async function checkPublicRateLimit() {
  try {
    const response = await fetch('https://api.github.com/rate_limit', {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Nebula-Portfolio-Platform'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    const coreLimit = data.resources.core;
    
    return {
      limit: coreLimit.limit,
      remaining: coreLimit.remaining,
      reset: coreLimit.reset,
      resetTime: new Date(coreLimit.reset * 1000).toISOString(),
      used: coreLimit.limit - coreLimit.remaining,
      percentageUsed: Math.round(((coreLimit.limit - coreLimit.remaining) / coreLimit.limit) * 100),
      timeUntilReset: Math.max(0, (coreLimit.reset * 1000) - Date.now()),
      status: getRateLimitStatus(coreLimit.remaining, coreLimit.limit)
    };

  } catch (error) {
    console.error('Failed to check public rate limit:', error);
    
    return {
      error: 'Unable to fetch rate limit information',
      details: error.message,
      status: 'unknown'
    };
  }
}

/**
 * Check authenticated GitHub API rate limit
 */
async function checkAuthenticatedRateLimit() {
  try {
    // This would use a GitHub token if available
    const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
    
    if (!githubToken) {
      return {
        error: 'No GitHub token configured for authenticated rate limit checking',
        fallback: await checkPublicRateLimit()
      };
    }

    const response = await fetch('https://api.github.com/rate_limit', {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${githubToken}`,
        'User-Agent': 'Nebula-Portfolio-Platform'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      core: formatRateLimitInfo(data.resources.core),
      search: formatRateLimitInfo(data.resources.search),
      graphql: formatRateLimitInfo(data.resources.graphql),
      integrationManifest: formatRateLimitInfo(data.resources.integration_manifest),
      sourceImport: formatRateLimitInfo(data.resources.source_import),
      codeScanning: formatRateLimitInfo(data.resources.code_scanning_upload),
      actionsRunner: formatRateLimitInfo(data.resources.actions_runner_registration),
      scim: formatRateLimitInfo(data.resources.scim)
    };

  } catch (error) {
    console.error('Failed to check authenticated rate limit:', error);
    
    return {
      error: 'Unable to fetch authenticated rate limit information',
      details: error.message,
      fallback: await checkPublicRateLimit()
    };
  }
}

/**
 * Format rate limit information
 */
function formatRateLimitInfo(limitInfo) {
  if (!limitInfo) {
    return null;
  }

  const timeUntilReset = Math.max(0, (limitInfo.reset * 1000) - Date.now());
  
  return {
    limit: limitInfo.limit,
    remaining: limitInfo.remaining,
    reset: limitInfo.reset,
    resetTime: new Date(limitInfo.reset * 1000).toISOString(),
    used: limitInfo.limit - limitInfo.remaining,
    percentageUsed: Math.round(((limitInfo.limit - limitInfo.remaining) / limitInfo.limit) * 100),
    timeUntilReset,
    timeUntilResetMinutes: Math.ceil(timeUntilReset / (1000 * 60)),
    status: getRateLimitStatus(limitInfo.remaining, limitInfo.limit)
  };
}

/**
 * Get rate limit status based on remaining requests
 */
function getRateLimitStatus(remaining, limit) {
  const percentage = (remaining / limit) * 100;
  
  if (percentage > 50) {
    return 'healthy';
  } else if (percentage > 20) {
    return 'warning';
  } else if (percentage > 5) {
    return 'critical';
  } else {
    return 'exhausted';
  }
}

/**
 * Generate rate limit recommendations
 */
function generateRateLimitRecommendations(rateLimitInfo) {
  const recommendations = [];
  
  if (rateLimitInfo.error) {
    recommendations.push({
      type: 'error',
      message: 'Unable to determine rate limit status',
      action: 'Check GitHub token configuration'
    });
    return recommendations;
  }

  const coreLimit = rateLimitInfo.core;
  
  if (!coreLimit) {
    return recommendations;
  }

  switch (coreLimit.status) {
    case 'exhausted':
      recommendations.push({
        type: 'critical',
        message: 'Rate limit exhausted',
        action: `Wait ${coreLimit.timeUntilResetMinutes} minutes for reset or implement request queuing`
      });
      break;
      
    case 'critical':
      recommendations.push({
        type: 'warning',
        message: 'Rate limit critically low',
        action: 'Reduce API calls and implement caching strategies'
      });
      break;
      
    case 'warning':
      recommendations.push({
        type: 'info',
        message: 'Rate limit usage is high',
        action: 'Monitor usage and consider implementing request batching'
      });
      break;
      
    case 'healthy':
      recommendations.push({
        type: 'success',
        message: 'Rate limit usage is healthy',
        action: 'Continue current usage patterns'
      });
      break;
  }

  // Additional recommendations based on usage patterns
  if (coreLimit.percentageUsed > 80) {
    recommendations.push({
      type: 'optimization',
      message: 'High API usage detected',
      action: 'Consider implementing ISR with longer cache times'
    });
  }

  if (coreLimit.timeUntilResetMinutes < 30 && coreLimit.remaining < 100) {
    recommendations.push({
      type: 'planning',
      message: 'Rate limit reset approaching with low remaining requests',
      action: 'Plan API usage carefully for the next reset cycle'
    });
  }

  return recommendations;
}

/**
 * Verify monitoring token
 */
function verifyMonitoringToken(token) {
  if (!token) {
    return false;
  }

  const monitoringSecret = process.env.MONITORING_SECRET || process.env.REVALIDATION_SECRET;
  
  if (!monitoringSecret) {
    console.warn('MONITORING_SECRET not set, using development mode');
    return process.env.NODE_ENV === 'development' && token.length > 0;
  }

  return token === monitoringSecret;
}

/**
 * POST endpoint for rate limit alerts/notifications
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { token, threshold, webhook } = body;

    if (!verifyMonitoringToken(token)) {
      return NextResponse.json(
        { error: 'Invalid monitoring token' },
        { status: 401 }
      );
    }

    // Check current rate limit
    const rateLimitInfo = await checkAuthenticatedRateLimit();
    
    if (rateLimitInfo.error) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unable to check rate limit for alert' 
        },
        { status: 500 }
      );
    }

    const coreLimit = rateLimitInfo.core;
    const alertThreshold = threshold || 20; // Default 20% remaining
    
    const shouldAlert = (coreLimit.remaining / coreLimit.limit) * 100 <= alertThreshold;
    
    if (shouldAlert && webhook) {
      // Send webhook notification (implement as needed)
      try {
        await fetch(webhook, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'rate_limit_alert',
            status: coreLimit.status,
            remaining: coreLimit.remaining,
            limit: coreLimit.limit,
            percentageRemaining: Math.round((coreLimit.remaining / coreLimit.limit) * 100),
            resetTime: coreLimit.resetTime,
            timestamp: new Date().toISOString()
          })
        });
      } catch (webhookError) {
        console.error('Failed to send rate limit webhook:', webhookError);
      }
    }

    return NextResponse.json({
      success: true,
      alertTriggered: shouldAlert,
      currentStatus: coreLimit.status,
      remaining: coreLimit.remaining,
      threshold: alertThreshold,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Rate limit alert error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Rate limit alert failed' 
      },
      { status: 500 }
    );
  }
}