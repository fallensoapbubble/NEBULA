/**
 * Alert Manager
 * Handles alert configuration, thresholds, and notifications
 */

class AlertManager {
  constructor() {
    this.alertRules = this.loadAlertRules();
    this.notificationChannels = this.loadNotificationChannels();
    this.activeAlerts = new Map();
  }

  /**
   * Load alert rules configuration
   */
  loadAlertRules() {
    return {
      // GitHub API Rate Limiting
      github_rate_limit_warning: {
        threshold: 100,
        comparison: 'less_than',
        severity: 'warning',
        description: 'GitHub API rate limit is running low',
        cooldown: 300000, // 5 minutes
        enabled: true
      },
      github_rate_limit_critical: {
        threshold: 10,
        comparison: 'less_than',
        severity: 'critical',
        description: 'GitHub API rate limit critically low',
        cooldown: 60000, // 1 minute
        enabled: true
      },

      // Error Rate Monitoring
      high_error_rate: {
        threshold: 5,
        comparison: 'greater_than',
        severity: 'warning',
        description: 'High error rate detected',
        cooldown: 600000, // 10 minutes
        enabled: true
      },
      critical_error_rate: {
        threshold: 10,
        comparison: 'greater_than',
        severity: 'critical',
        description: 'Critical error rate detected',
        cooldown: 300000, // 5 minutes
        enabled: true
      },

      // Response Time Monitoring
      slow_response_time: {
        threshold: 3000,
        comparison: 'greater_than',
        severity: 'warning',
        description: 'Slow response times detected',
        cooldown: 600000, // 10 minutes
        enabled: true
      },
      very_slow_response_time: {
        threshold: 10000,
        comparison: 'greater_than',
        severity: 'critical',
        description: 'Very slow response times detected',
        cooldown: 300000, // 5 minutes
        enabled: true
      },

      // Authentication Failures
      auth_failure_rate: {
        threshold: 10,
        comparison: 'greater_than',
        severity: 'warning',
        description: 'High authentication failure rate',
        cooldown: 900000, // 15 minutes
        enabled: true
      },

      // Repository Access Issues
      repo_access_failure_rate: {
        threshold: 20,
        comparison: 'greater_than',
        severity: 'warning',
        description: 'High repository access failure rate',
        cooldown: 600000, // 10 minutes
        enabled: true
      }
    };
  }

  /**
   * Load notification channels configuration
   */
  loadNotificationChannels() {
    return {
      console: {
        enabled: true,
        severities: ['info', 'warning', 'critical']
      },
      email: {
        enabled: !!process.env.ALERT_EMAIL_RECIPIENT,
        severities: ['warning', 'critical'],
        recipient: process.env.ALERT_EMAIL_RECIPIENT,
        smtp: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          user: process.env.SMTP_USER,
          password: process.env.SMTP_PASSWORD
        }
      },
      slack: {
        enabled: !!process.env.SLACK_WEBHOOK_URL,
        severities: ['warning', 'critical'],
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: process.env.SLACK_CHANNEL || '#alerts'
      },
      webhook: {
        enabled: !!process.env.ALERT_WEBHOOK_URL,
        severities: ['critical'],
        url: process.env.ALERT_WEBHOOK_URL,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': process.env.ALERT_WEBHOOK_TOKEN ? `Bearer ${process.env.ALERT_WEBHOOK_TOKEN}` : undefined
        }
      }
    };
  }

  /**
   * Evaluate alert condition
   */
  evaluateAlert(alertType, value, context = {}) {
    const rule = this.alertRules[alertType];
    if (!rule || !rule.enabled) {
      return false;
    }

    // Check if alert is in cooldown
    const alertKey = `${alertType}:${JSON.stringify(context)}`;
    const existingAlert = this.activeAlerts.get(alertKey);
    if (existingAlert && Date.now() - existingAlert.lastTriggered < rule.cooldown) {
      return false;
    }

    // Evaluate condition
    let shouldAlert = false;
    switch (rule.comparison) {
      case 'greater_than':
        shouldAlert = value > rule.threshold;
        break;
      case 'less_than':
        shouldAlert = value < rule.threshold;
        break;
      case 'equals':
        shouldAlert = value === rule.threshold;
        break;
      case 'not_equals':
        shouldAlert = value !== rule.threshold;
        break;
      default:
        console.warn(`Unknown comparison operator: ${rule.comparison}`);
        return false;
    }

    if (shouldAlert) {
      this.triggerAlert(alertType, value, context, rule);
      return true;
    }

    return false;
  }

  /**
   * Trigger an alert
   */
  async triggerAlert(alertType, value, context, rule) {
    const alertKey = `${alertType}:${JSON.stringify(context)}`;
    const alert = {
      type: alertType,
      value,
      context,
      rule,
      timestamp: new Date().toISOString(),
      lastTriggered: Date.now(),
      id: this.generateAlertId()
    };

    // Store active alert
    this.activeAlerts.set(alertKey, alert);

    // Send notifications
    await this.sendNotifications(alert);

    // Log alert
    console.log(`Alert triggered: ${alertType}`, alert);
  }

  /**
   * Send notifications through configured channels
   */
  async sendNotifications(alert) {
    const promises = [];

    // Console notification
    if (this.notificationChannels.console.enabled && 
        this.notificationChannels.console.severities.includes(alert.rule.severity)) {
      promises.push(this.sendConsoleNotification(alert));
    }

    // Email notification
    if (this.notificationChannels.email.enabled && 
        this.notificationChannels.email.severities.includes(alert.rule.severity)) {
      promises.push(this.sendEmailNotification(alert));
    }

    // Slack notification
    if (this.notificationChannels.slack.enabled && 
        this.notificationChannels.slack.severities.includes(alert.rule.severity)) {
      promises.push(this.sendSlackNotification(alert));
    }

    // Webhook notification
    if (this.notificationChannels.webhook.enabled && 
        this.notificationChannels.webhook.severities.includes(alert.rule.severity)) {
      promises.push(this.sendWebhookNotification(alert));
    }

    // Wait for all notifications to complete
    await Promise.allSettled(promises);
  }

  /**
   * Send console notification
   */
  async sendConsoleNotification(alert) {
    const logLevel = alert.rule.severity === 'critical' ? 'error' : 'warn';
    console[logLevel](`🚨 ALERT [${alert.rule.severity.toUpperCase()}]: ${alert.rule.description}`);
    console[logLevel](`   Type: ${alert.type}`);
    console[logLevel](`   Value: ${alert.value}`);
    console[logLevel](`   Threshold: ${alert.rule.threshold}`);
    console[logLevel](`   Time: ${alert.timestamp}`);
    if (Object.keys(alert.context).length > 0) {
      console[logLevel](`   Context:`, alert.context);
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(alert) {
    try {
      const subject = `🚨 Nebula Alert: ${alert.rule.description}`;
      const body = this.formatEmailBody(alert);

      // In a real implementation, you would use a mail service like nodemailer
      console.log('Email notification would be sent:', {
        to: this.notificationChannels.email.recipient,
        subject,
        body
      });
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  /**
   * Send Slack notification
   */
  async sendSlackNotification(alert) {
    try {
      const payload = {
        channel: this.notificationChannels.slack.channel,
        username: 'Nebula Monitoring',
        icon_emoji: alert.rule.severity === 'critical' ? ':rotating_light:' : ':warning:',
        attachments: [{
          color: alert.rule.severity === 'critical' ? 'danger' : 'warning',
          title: `Alert: ${alert.rule.description}`,
          fields: [
            { title: 'Type', value: alert.type, short: true },
            { title: 'Severity', value: alert.rule.severity.toUpperCase(), short: true },
            { title: 'Value', value: alert.value.toString(), short: true },
            { title: 'Threshold', value: alert.rule.threshold.toString(), short: true },
            { title: 'Time', value: alert.timestamp, short: false }
          ]
        }]
      };

      const response = await fetch(this.notificationChannels.slack.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
    }
  }

  /**
   * Send webhook notification
   */
  async sendWebhookNotification(alert) {
    try {
      const payload = {
        alert: {
          id: alert.id,
          type: alert.type,
          severity: alert.rule.severity,
          description: alert.rule.description,
          value: alert.value,
          threshold: alert.rule.threshold,
          timestamp: alert.timestamp,
          context: alert.context
        },
        service: 'nebula-portfolio-platform',
        environment: process.env.NODE_ENV
      };

      const response = await fetch(this.notificationChannels.webhook.url, {
        method: 'POST',
        headers: this.notificationChannels.webhook.headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send webhook notification:', error);
    }
  }

  /**
   * Format email body
   */
  formatEmailBody(alert) {
    return `
Alert Details:
==============

Type: ${alert.type}
Severity: ${alert.rule.severity.toUpperCase()}
Description: ${alert.rule.description}

Metrics:
--------
Current Value: ${alert.value}
Threshold: ${alert.rule.threshold}
Comparison: ${alert.rule.comparison}

Context:
--------
${JSON.stringify(alert.context, null, 2)}

Timestamp: ${alert.timestamp}
Alert ID: ${alert.id}

---
Nebula Portfolio Platform Monitoring
    `;
  }

  /**
   * Generate unique alert ID
   */
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertType, context = {}) {
    const alertKey = `${alertType}:${JSON.stringify(context)}`;
    const alert = this.activeAlerts.get(alertKey);
    
    if (alert) {
      this.activeAlerts.delete(alertKey);
      console.log(`Alert resolved: ${alertType}`, { id: alert.id, resolvedAt: new Date().toISOString() });
      return true;
    }
    
    return false;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts() {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert configuration
   */
  getAlertConfiguration() {
    return {
      rules: this.alertRules,
      channels: this.notificationChannels,
      activeAlerts: this.getActiveAlerts().length
    };
  }

  /**
   * Update alert rule
   */
  updateAlertRule(alertType, updates) {
    if (this.alertRules[alertType]) {
      this.alertRules[alertType] = { ...this.alertRules[alertType], ...updates };
      return true;
    }
    return false;
  }

  /**
   * Test notification channels
   */
  async testNotifications() {
    const testAlert = {
      type: 'test_alert',
      value: 'test',
      context: { test: true },
      rule: {
        severity: 'info',
        description: 'Test notification from Nebula monitoring system',
        threshold: 'N/A'
      },
      timestamp: new Date().toISOString(),
      id: 'test_' + Date.now()
    };

    await this.sendNotifications(testAlert);
    return testAlert;
  }
}

// Create singleton instance
const alertManager = new AlertManager();

export default alertManager;