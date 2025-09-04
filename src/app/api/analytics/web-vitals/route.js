/**
 * API endpoint for collecting Core Web Vitals metrics
 */

import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const metric = await request.json();
    
    // Validate metric data
    if (!metric.name || typeof metric.value !== 'number') {
      return NextResponse.json(
        { error: 'Invalid metric data' },
        { status: 400 }
      );
    }

    // In production, you would send this to your analytics service
    // For now, we'll log it and store in memory/database
    
    console.log('📊 Web Vital:', {
      name: metric.name,
      value: metric.value,
      url: metric.url,
      timestamp: new Date(metric.timestamp).toISOString(),
      connection: metric.connection,
    });

    // Here you could:
    // 1. Send to Google Analytics 4
    // 2. Send to DataDog, New Relic, etc.
    // 3. Store in your database
    // 4. Send to custom analytics service

    // Example: Send to Google Analytics 4
    if (process.env.GA_MEASUREMENT_ID) {
      await sendToGA4(metric);
    }

    // Example: Store in database
    if (process.env.DATABASE_URL) {
      await storeMetric(metric);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing web vitals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function sendToGA4(metric) {
  try {
    const response = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${process.env.GA_MEASUREMENT_ID}&api_secret=${process.env.GA_API_SECRET}`, {
      method: 'POST',
      body: JSON.stringify({
        client_id: 'anonymous', // In production, use actual client ID
        events: [{
          name: 'web_vitals',
          params: {
            metric_name: metric.name,
            metric_value: metric.value,
            page_location: metric.url,
            custom_parameters: metric.metadata,
          }
        }]
      })
    });

    if (!response.ok) {
      console.warn('Failed to send to GA4:', response.status);
    }
  } catch (error) {
    console.warn('GA4 send error:', error);
  }
}

async function storeMetric(metric) {
  // Example database storage
  // In production, implement your preferred database solution
  try {
    // Store metric in database
    console.log('Would store metric in database:', metric);
  } catch (error) {
    console.warn('Database storage error:', error);
  }
}