/**
 * API endpoint for GitHub rate limit monitoring
 */

import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const rateLimitInfo = await request.json();
    
    // Validate rate limit data
    if (!rateLimitInfo.resource || typeof rateLimitInfo.remaining !== 'number') {
      return NextResponse.json(
        { error: 'Invalid rate limit data' },
        { status: 400 }
      );
    }

    // Calculate usage percentage
    const usagePercent = ((rateLimitInfo.limit - rateLimitInfo.remaining) / rateLimitInfo.limit) * 100;
    
    // Log rate limit status
    console.log('🔄 GitHub Rate Limit:', {
      resource: rateLimitInfo.resource,
      usage: `${usagePercent.toFixed(1)}%`,
      remaining: rateLimitInfo.remaining,
      limit: rateLimitInfo.limit,
      reset: new Date(rateLimitInfo.reset * 1000).toISOString(),
      endpoint: rateLimitInfo.endpoint,
    });

    // Check for concerning usage levels
    if (usagePercent >= 80) {
      console.warn('⚠️ High GitHub API usage:', {
        resource: rateLimitInfo.resource,
        usage: `${usagePercent.toFixed(1)}%`,
        remaining: rateLimitInfo.remaining,
        resetIn: Math.round((rateLimitInfo.reset * 1000 - Date.now()) / 1000 / 60) + ' minutes',
      });
    }

    // Store rate limit data
    await storeRateLimitData(rateLimitInfo, usagePercent);

    // Send alerts if necessary
    if (usagePercent >= 90) {
      await sendRateLimitAlert(rateLimitInfo, usagePercent);
    }

    return NextResponse.json({ 
      success: true,
      usage_percent: usagePercent,
      time_until_reset: Math.max(0, (rateLimitInfo.reset * 1000) - Date.now()),
    });
  } catch (error) {
    console.error('Error processing rate limit data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Return current rate limit status
    const status = await getCurrentRateLimitStatus();
    
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting rate limit status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function storeRateLimitData(rateLimitInfo, usagePercent) {
  const record = {
    ...rateLimitInfo,
    usage_percent: usagePercent,
    recorded_at: new Date().toISOString(),
  };

  // In production, store in database or time-series database
  if (process.env.DATABASE_URL) {
    try {
      console.log('Would store rate limit data:', record);
    } catch (error) {
      console.warn('Failed to store rate limit data:', error);
    }
  }

  // Send to monitoring service
  if (process.env.MONITORING_ENDPOINT) {
    try {
      await fetch(process.env.MONITORING_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'github_rate_limit',
          data: record,
        }),
      });
    } catch (error) {
      console.warn('Failed to send to monitoring service:', error);
    }
  }
}

async function sendRateLimitAlert(rateLimitInfo, usagePercent) {
  const alert = {
    type: 'rate_limit_high_usage',
    severity: usagePercent >= 95 ? 'critical' : 'warning',
    resource: rateLimitInfo.resource,
    usage_percent: usagePercent,
    remaining: rateLimitInfo.remaining,
    reset_time: new Date(rateLimitInfo.reset * 1000).toISOString(),
    endpoint: rateLimitInfo.endpoint,
    timestamp: new Date().toISOString(),
  };

  // Send to alerting service
  if (process.env.ALERT_WEBHOOK_URL) {
    try {
      await fetch(process.env.ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      });
    } catch (error) {
      console.warn('Failed to send rate limit alert:', error);
    }
  }

  // Log critical alerts
  if (alert.severity === 'critical') {
    console.error('🚨 CRITICAL: GitHub rate limit nearly exhausted:', alert);
  }
}

async function getCurrentRateLimitStatus() {
  // In production, fetch from database or cache
  // For now, return mock data
  return {
    core: {
      limit: 5000,
      remaining: 4500,
      reset: Math.floor(Date.now() / 1000) + 3600,
      used: 500,
      resource: 'core',
    },
    search: {
      limit: 30,
      remaining: 25,
      reset: Math.floor(Date.now() / 1000) + 60,
      used: 5,
      resource: 'search',
    },
  };
}