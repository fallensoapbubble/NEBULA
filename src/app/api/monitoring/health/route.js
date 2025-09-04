/**
 * Health Check API
 * Provides system health status for monitoring
 */

import monitoringService from '@/lib/monitoring-service.js';

export async function GET(request) {
  try {
    const healthStatus = await monitoringService.getHealthStatus();

    // Return appropriate HTTP status based on health
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;

    return Response.json(healthStatus, { status: statusCode });

  } catch (error) {
    console.error('Health check error:', error);
    
    // Track the error
    monitoringService.trackError(error, {
      endpoint: '/api/monitoring/health',
      method: 'GET'
    });

    return Response.json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}