/**
 * Monitoring Dashboard API
 * Provides monitoring data for admin dashboard
 */

import monitoringService from '@/lib/monitoring-service.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h';
    const metric = searchParams.get('metric');

    // Get dashboard data
    const dashboardData = await monitoringService.getDashboardData(timeRange);

    // If specific metric requested, return only that metric
    if (metric && dashboardData[metric]) {
      return Response.json({
        success: true,
        data: {
          [metric]: dashboardData[metric],
          timeRange
        }
      });
    }

    return Response.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Dashboard API error:', error);
    
    // Track the error
    monitoringService.trackError(error, {
      endpoint: '/api/monitoring/dashboard',
      method: 'GET'
    });

    return Response.json({
      success: false,
      error: 'Failed to fetch dashboard data'
    }, { status: 500 });
  }
}