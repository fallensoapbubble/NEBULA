/**
 * API endpoint for error tracking and reporting
 */

import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const error = await request.json();
    
    // Validate error data
    if (!error.type || !error.message) {
      return NextResponse.json(
        { error: 'Invalid error data' },
        { status: 400 }
      );
    }

    // Enrich error data
    const enrichedError = {
      ...error,
      id: generateErrorId(),
      severity: classifyErrorSeverity(error),
      fingerprint: generateErrorFingerprint(error),
      environment: process.env.NODE_ENV,
      recorded_at: new Date().toISOString(),
    };

    // Log error
    console.error('🚨 Error tracked:', {
      id: enrichedError.id,
      type: enrichedError.type,
      message: enrichedError.message,
      severity: enrichedError.severity,
      url: enrichedError.url,
      fingerprint: enrichedError.fingerprint,
    });

    // Process error
    await processError(enrichedError);

    return NextResponse.json({ 
      success: true,
      error_id: enrichedError.id,
      severity: enrichedError.severity,
    });
  } catch (processingError) {
    console.error('Error processing error report:', processingError);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '24h';
    const severity = searchParams.get('severity');
    
    // Get error statistics
    const stats = await getErrorStats(timeframe, severity);
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error getting error stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateErrorId() {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function classifyErrorSeverity(error) {
  // Classify error severity based on type and content
  if (error.type === 'unhandled_promise_rejection') {
    return 'high';
  }
  
  if (error.message?.includes('Network Error') || error.message?.includes('fetch')) {
    return 'medium';
  }
  
  if (error.message?.includes('GitHub API') || error.message?.includes('rate limit')) {
    return 'high';
  }
  
  if (error.filename?.includes('node_modules')) {
    return 'low';
  }
  
  return 'medium';
}

function generateErrorFingerprint(error) {
  // Create a fingerprint to group similar errors
  const key = `${error.type}_${error.message}_${error.filename}_${error.lineno}`;
  return btoa(key).slice(0, 16);
}

async function processError(error) {
  // Store error in database
  if (process.env.DATABASE_URL) {
    await storeError(error);
  }

  // Send to error tracking service
  if (process.env.ERROR_TRACKING_DSN) {
    await sendToErrorTracker(error);
  }

  // Send alerts for high severity errors
  if (error.severity === 'high') {
    await sendErrorAlert(error);
  }

  // Update error statistics
  await updateErrorStats(error);
}

async function storeError(error) {
  try {
    // In production, store in database
    console.log('Would store error in database:', {
      id: error.id,
      type: error.type,
      severity: error.severity,
      fingerprint: error.fingerprint,
    });
  } catch (dbError) {
    console.warn('Failed to store error in database:', dbError);
  }
}

async function sendToErrorTracker(error) {
  try {
    // Send to Sentry, Bugsnag, or similar service
    if (process.env.SENTRY_DSN) {
      // Example Sentry integration
      await fetch(`${process.env.SENTRY_DSN}/api/store/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          level: error.severity,
          platform: 'javascript',
          exception: {
            values: [{
              type: error.type,
              value: error.message,
              stacktrace: error.stack ? { frames: parseStackTrace(error.stack) } : undefined,
            }]
          },
          extra: {
            url: error.url,
            userAgent: error.userAgent,
            timestamp: error.timestamp,
          },
        }),
      });
    }
  } catch (trackerError) {
    console.warn('Failed to send to error tracker:', trackerError);
  }
}

async function sendErrorAlert(error) {
  const alert = {
    type: 'application_error',
    severity: error.severity,
    error_id: error.id,
    message: error.message,
    url: error.url,
    fingerprint: error.fingerprint,
    timestamp: error.recorded_at,
  };

  // Send to alerting service
  if (process.env.ALERT_WEBHOOK_URL) {
    try {
      await fetch(process.env.ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      });
    } catch (alertError) {
      console.warn('Failed to send error alert:', alertError);
    }
  }
}

async function updateErrorStats(error) {
  // Update error statistics for monitoring dashboard
  try {
    console.log('Would update error stats for:', error.fingerprint);
  } catch (statsError) {
    console.warn('Failed to update error stats:', statsError);
  }
}

async function getErrorStats(timeframe, severity) {
  // In production, fetch from database
  // Return mock data for now
  return {
    timeframe,
    total_errors: 42,
    by_severity: {
      high: 5,
      medium: 25,
      low: 12,
    },
    by_type: {
      javascript_error: 30,
      unhandled_promise_rejection: 8,
      network_error: 4,
    },
    top_errors: [
      {
        fingerprint: 'abc123',
        message: 'GitHub API rate limit exceeded',
        count: 15,
        severity: 'high',
      },
      {
        fingerprint: 'def456',
        message: 'Network request failed',
        count: 8,
        severity: 'medium',
      },
    ],
  };
}

function parseStackTrace(stack) {
  // Simple stack trace parser
  return stack.split('\n').map((line, index) => ({
    filename: line.match(/\((.*?):\d+:\d+\)/)?.[1] || 'unknown',
    lineno: parseInt(line.match(/:(\d+):\d+/)?.[1]) || 0,
    colno: parseInt(line.match(/:(\d+)$/)?.[1]) || 0,
    function: line.match(/at\s+(.+?)\s+\(/)?.[1] || 'anonymous',
  }));
}