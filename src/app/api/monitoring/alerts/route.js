/**
 * Alert Management API
 * Handles alert configuration and active alerts
 */

import alertManager from '@/lib/alert-manager.js';
import monitoringService from '@/lib/monitoring-service.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'active':
        return Response.json({
          success: true,
          data: {
            alerts: alertManager.getActiveAlerts(),
            count: alertManager.getActiveAlerts().length
          }
        });

      case 'config':
        return Response.json({
          success: true,
          data: alertManager.getAlertConfiguration()
        });

      case 'test':
        const testAlert = await alertManager.testNotifications();
        return Response.json({
          success: true,
          message: 'Test notifications sent',
          data: testAlert
        });

      default:
        return Response.json({
          success: true,
          data: {
            alerts: alertManager.getActiveAlerts(),
            configuration: alertManager.getAlertConfiguration()
          }
        });
    }

  } catch (error) {
    console.error('Alert management API error:', error);
    
    monitoringService.trackError(error, {
      endpoint: '/api/monitoring/alerts',
      method: 'GET'
    });

    return Response.json({
      success: false,
      error: 'Failed to fetch alert data'
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, alertType, context } = body;

    switch (action) {
      case 'resolve':
        const resolved = alertManager.resolveAlert(alertType, context);
        return Response.json({
          success: true,
          message: resolved ? 'Alert resolved' : 'Alert not found',
          resolved
        });

      case 'trigger':
        // Manual alert triggering for testing
        const { value, ruleOverrides } = body;
        if (ruleOverrides) {
          alertManager.updateAlertRule(alertType, ruleOverrides);
        }
        const triggered = alertManager.evaluateAlert(alertType, value, context);
        return Response.json({
          success: true,
          message: triggered ? 'Alert triggered' : 'Alert condition not met',
          triggered
        });

      default:
        return Response.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Alert management API error:', error);
    
    monitoringService.trackError(error, {
      endpoint: '/api/monitoring/alerts',
      method: 'POST'
    });

    return Response.json({
      success: false,
      error: 'Failed to process alert action'
    }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { alertType, updates } = body;

    const updated = alertManager.updateAlertRule(alertType, updates);
    
    if (updated) {
      return Response.json({
        success: true,
        message: 'Alert rule updated',
        alertType,
        updates
      });
    } else {
      return Response.json({
        success: false,
        error: 'Alert rule not found'
      }, { status: 404 });
    }

  } catch (error) {
    console.error('Alert rule update error:', error);
    
    monitoringService.trackError(error, {
      endpoint: '/api/monitoring/alerts',
      method: 'PUT'
    });

    return Response.json({
      success: false,
      error: 'Failed to update alert rule'
    }, { status: 500 });
  }
}