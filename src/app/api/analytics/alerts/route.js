/**
 * API endpoint for system alerts and notifications
 */

import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const alert = await request.json();
    
    // Validate alert data
    if (!alert.type || !alert.data) {
      return NextResponse.json(
        { error: 'Invalid alert data' },
        { status: 400 }
      );
    }

    // Enrich alert
    const enrichedAlert = {
      ...alert,
      id: generateAlertId(),
      severity: determineAlertSeverity(alert),
      created_at: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    };

    // Process alert
    await processAlert(enrichedAlert);

    return NextResponse.json({ 
      success: true,
      alert_id: enrichedAlert.id,
      severity: enrichedAlert.severity,
    });
  } catch (error) {
    console.error('Error processing alert:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const limit = parseInt(searchParams.get('limit')) || 50;
    
    // Get recent alerts
    const alerts = await getRecentAlerts(severity, limit);
    
    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Error getting alerts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateAlertId() {
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function determineAlertSeverity(alert) {
  switch (alert.type) {
    case 'rate_limit_critical':
      return 'critical';
    case 'rate_limit_warning':
      return 'warning';
    case 'application_error':
      return alert.data.severity || 'medium';
    case 'performance_degradation':
      return 'warning';
    case 'system_health':
      return 'info';
    default:
      return 'info';
  }
}

async function processAlert(alert) {
  // Log alert
  const logLevel = getLogLevel(alert.severity);
  console[logLevel](`🚨 Alert [${alert.severity.toUpperCase()}]:`, {
    id: alert.id,
    type: alert.type,
    message: getAlertMessage(alert),
    data: alert.data,
  });

  // Store alert
  if (process.env.DATABASE_URL) {
    await storeAlert(alert);
  }

  // Send notifications based on severity
  if (alert.severity === 'critical') {
    await sendCriticalAlert(alert);
  } else if (alert.severity === 'warning') {
    await sendWarningAlert(alert);
  }

  // Update alert metrics
  await updateAlertMetrics(alert);
}

function getLogLevel(severity) {
  switch (severity) {
    case 'critical':
      return 'error';
    case 'warning':
      return 'warn';
    case 'info':
      return 'info';
    default:
      return 'log';
  }
}

function getAlertMessage(alert) {
  switch (alert.type) {
    case 'rate_limit_critical':
      return `GitHub API rate limit critical: ${alert.data.usage}% used for ${alert.data.resource}`;
    case 'rate_limit_warning':
      return `GitHub API rate limit warning: ${alert.data.usage}% used for ${alert.data.resource}`;
    case 'application_error':
      return `Application error: ${alert.data.message}`;
    case 'performance_degradation':
      return `Performance degradation detected: ${alert.data.metric} = ${alert.data.value}`;
    default:
      return `System alert: ${alert.type}`;
  }
}

async function storeAlert(alert) {
  try {
    // In production, store in database
    console.log('Would store alert in database:', {
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      created_at: alert.created_at,
    });
  } catch (error) {
    console.warn('Failed to store alert:', error);
  }
}

async function sendCriticalAlert(alert) {
  // Send immediate notifications for critical alerts
  const notifications = [];

  // Email notification
  if (process.env.ALERT_EMAIL) {
    notifications.push(sendEmailAlert(alert));
  }

  // Slack notification
  if (process.env.SLACK_WEBHOOK_URL) {
    notifications.push(sendSlackAlert(alert));
  }

  // Discord notification
  if (process.env.DISCORD_WEBHOOK_URL) {
    notifications.push(sendDiscordAlert(alert));
  }

  // PagerDuty integration
  if (process.env.PAGERDUTY_INTEGRATION_KEY) {
    notifications.push(sendPagerDutyAlert(alert));
  }

  await Promise.allSettled(notifications);
}

async function sendWarningAlert(alert) {
  // Send less urgent notifications for warnings
  if (process.env.SLACK_WEBHOOK_URL) {
    await sendSlackAlert(alert);
  }
}

async function sendEmailAlert(alert) {
  try {
    // Example email service integration
    const emailData = {
      to: process.env.ALERT_EMAIL,
      subject: `🚨 Critical Alert: ${alert.type}`,
      html: `
        <h2>Critical System Alert</h2>
        <p><strong>Alert ID:</strong> ${alert.id}</p>
        <p><strong>Type:</strong> ${alert.type}</p>
        <p><strong>Severity:</strong> ${alert.severity}</p>
        <p><strong>Time:</strong> ${alert.created_at}</p>
        <p><strong>Message:</strong> ${getAlertMessage(alert)}</p>
        <p><strong>Data:</strong></p>
        <pre>${JSON.stringify(alert.data, null, 2)}</pre>
      `,
    };

    // Send via email service (SendGrid, AWS SES, etc.)
    console.log('Would send email alert:', emailData);
  } catch (error) {
    console.warn('Failed to send email alert:', error);
  }
}

async function sendSlackAlert(alert) {
  try {
    const color = {
      critical: 'danger',
      warning: 'warning',
      info: 'good',
    }[alert.severity] || 'good';

    const slackMessage = {
      attachments: [{
        color,
        title: `🚨 ${alert.severity.toUpperCase()} Alert`,
        fields: [
          { title: 'Type', value: alert.type, short: true },
          { title: 'Severity', value: alert.severity, short: true },
          { title: 'Time', value: alert.created_at, short: true },
          { title: 'Environment', value: alert.environment, short: true },
          { title: 'Message', value: getAlertMessage(alert), short: false },
        ],
        footer: 'Nebula Monitoring',
        ts: Math.floor(Date.now() / 1000),
      }],
    };

    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage),
    });
  } catch (error) {
    console.warn('Failed to send Slack alert:', error);
  }
}

async function sendDiscordAlert(alert) {
  try {
    const color = {
      critical: 0xff0000, // Red
      warning: 0xffa500,  // Orange
      info: 0x00ff00,     // Green
    }[alert.severity] || 0x00ff00;

    const discordMessage = {
      embeds: [{
        title: `🚨 ${alert.severity.toUpperCase()} Alert`,
        description: getAlertMessage(alert),
        color,
        fields: [
          { name: 'Type', value: alert.type, inline: true },
          { name: 'Severity', value: alert.severity, inline: true },
          { name: 'Environment', value: alert.environment, inline: true },
        ],
        timestamp: alert.created_at,
        footer: { text: 'Nebula Monitoring' },
      }],
    };

    await fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordMessage),
    });
  } catch (error) {
    console.warn('Failed to send Discord alert:', error);
  }
}

async function sendPagerDutyAlert(alert) {
  try {
    const pagerDutyEvent = {
      routing_key: process.env.PAGERDUTY_INTEGRATION_KEY,
      event_action: 'trigger',
      payload: {
        summary: getAlertMessage(alert),
        severity: alert.severity,
        source: 'nebula-platform',
        component: alert.type,
        group: 'system-alerts',
        class: alert.severity,
        custom_details: alert.data,
      },
    };

    await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pagerDutyEvent),
    });
  } catch (error) {
    console.warn('Failed to send PagerDuty alert:', error);
  }
}

async function updateAlertMetrics(alert) {
  try {
    // Update alert metrics for dashboard
    console.log('Would update alert metrics for:', alert.type, alert.severity);
  } catch (error) {
    console.warn('Failed to update alert metrics:', error);
  }
}

async function getRecentAlerts(severity, limit) {
  // In production, fetch from database
  // Return mock data for now
  return {
    alerts: [
      {
        id: 'alert_123',
        type: 'rate_limit_warning',
        severity: 'warning',
        message: 'GitHub API rate limit warning: 85% used for core',
        created_at: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
      },
      {
        id: 'alert_124',
        type: 'application_error',
        severity: 'medium',
        message: 'Application error: Network request failed',
        created_at: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
      },
    ],
    total: 2,
    severity_filter: severity,
    limit,
  };
}