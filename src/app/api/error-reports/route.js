/**
 * Error Reports API Endpoint
 * Handles error report submissions from the frontend
 */

import { NextResponse } from 'next/server';
import { ErrorHandler } from '@/lib/errors.js';
import { createLogger } from '@/lib/logger.js';

const errorReportLogger = createLogger('ErrorReports');

export async function POST(request) {
  try {
    const reportData = await request.json();
    
    // Validate report data
    if (!reportData.error || !reportData.error.message) {
      return NextResponse.json(
        { error: 'Invalid error report data' },
        { status: 400 }
      );
    }

    // Generate unique report ID
    const reportId = reportData.reportId || `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Log the error report
    errorReportLogger.error('User Error Report', {
      reportId,
      error: reportData.error,
      userDescription: reportData.userDescription,
      userEmail: reportData.userEmail,
      context: reportData.context,
      timestamp: new Date().toISOString()
    });

    // In a production environment, you might want to:
    // 1. Store the report in a database
    // 2. Send to an external error tracking service (Sentry, LogRocket, etc.)
    // 3. Send email notifications to the development team
    // 4. Create tickets in your issue tracking system

    // Example: Send to external service
    if (process.env.ERROR_REPORTING_WEBHOOK) {
      try {
        await fetch(process.env.ERROR_REPORTING_WEBHOOK, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reportId,
            ...reportData,
            source: 'nebula-platform'
          }),
        });
      } catch (webhookError) {
        errorReportLogger.warn('Failed to send error report to webhook', {
          reportId,
          webhookError: webhookError.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      reportId,
      message: 'Error report submitted successfully'
    });

  } catch (error) {
    const nebulaError = ErrorHandler.handleError(error, {
      source: 'error_reports_api',
      endpoint: '/api/error-reports'
    });

    return NextResponse.json(
      ErrorHandler.formatErrorResponse(nebulaError),
      { status: nebulaError.statusCode }
    );
  }
}

export async function GET(request) {
  // This endpoint could be used to retrieve error reports for admin users
  // For now, return method not allowed
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}