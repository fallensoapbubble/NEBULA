/**
 * Monitoring Dashboard Component
 * Displays system health, performance metrics, and alerts
 */

'use client';

import { useState, useEffect } from 'react';

export default function MonitoringDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [githubUsage, setGithubUsage] = useState(null);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [healthStatus, setHealthStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  useEffect(() => {
    fetchDashboardData();
    
    const interval = setInterval(fetchDashboardData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all monitoring data in parallel
      const [dashboardRes, githubRes, alertsRes, healthRes] = await Promise.all([
        fetch('/api/monitoring/dashboard'),
        fetch('/api/monitoring/github-usage'),
        fetch('/api/monitoring/alerts?action=active'),
        fetch('/api/monitoring/health')
      ]);

      const [dashboard, github, alerts, health] = await Promise.all([
        dashboardRes.json(),
        githubRes.json(),
        alertsRes.json(),
        healthRes.json()
      ]);

      setDashboardData(dashboard.data);
      setGithubUsage(github.data);
      setActiveAlerts(alerts.data?.alerts || []);
      setHealthStatus(health);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (alertType, context) => {
    try {
      const response = await fetch('/api/monitoring/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve',
          alertType,
          context
        })
      });

      if (response.ok) {
        fetchDashboardData(); // Refresh data
      }
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  const testNotifications = async () => {
    try {
      const response = await fetch('/api/monitoring/alerts?action=test');
      const result = await response.json();
      
      if (result.success) {
        alert('Test notifications sent successfully!');
      }
    } catch (err) {
      console.error('Failed to test notifications:', err);
      alert('Failed to send test notifications');
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="glass-card p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary mx-auto"></div>
          <p className="text-center mt-4 text-text-secondary">Loading monitoring dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="glass-card p-8 border-error">
          <h2 className="text-xl font-bold text-error mb-4">Dashboard Error</h2>
          <p className="text-text-secondary mb-4">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="glass-button px-4 py-2"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-primary p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Monitoring Dashboard</h1>
            <p className="text-text-secondary">System health and performance metrics</p>
          </div>
          <div className="flex gap-4">
            <select 
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="glass-input px-3 py-2"
            >
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
              <option value={60000}>1m</option>
              <option value={300000}>5m</option>
            </select>
            <button 
              onClick={fetchDashboardData}
              className="glass-button px-4 py-2"
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button 
              onClick={testNotifications}
              className="glass-button px-4 py-2 border-accent-secondary"
            >
              Test Alerts
            </button>
          </div>
        </div>

        {/* System Health Status */}
        {healthStatus && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className={`glass-card p-6 ${
              healthStatus.status === 'healthy' ? 'border-success' : 
              healthStatus.status === 'degraded' ? 'border-warning' : 'border-error'
            }`}>
              <h3 className="text-lg font-semibold mb-2">System Status</h3>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  healthStatus.status === 'healthy' ? 'bg-success' : 
                  healthStatus.status === 'degraded' ? 'bg-warning' : 'bg-error'
                }`}></div>
                <span className="capitalize font-medium">{healthStatus.status}</span>
              </div>
              <p className="text-sm text-text-secondary mt-2">
                Last checked: {new Date(healthStatus.timestamp).toLocaleTimeString()}
              </p>
            </div>

            {Object.entries(healthStatus.services || {}).map(([service, status]) => (
              <div key={service} className={`glass-card p-6 ${
                status.status === 'healthy' ? 'border-success' : 'border-error'
              }`}>
                <h3 className="text-lg font-semibold mb-2 capitalize">{service}</h3>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    status.status === 'healthy' ? 'bg-success' : 'bg-error'
                  }`}></div>
                  <span className="capitalize">{status.status}</span>
                </div>
                {status.error && (
                  <p className="text-sm text-error mt-2">{status.error}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Active Alerts */}
        {activeAlerts.length > 0 && (
          <div className="glass-card p-6 mb-8 border-warning">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-warning">⚠️</span>
              Active Alerts ({activeAlerts.length})
            </h2>
            <div className="space-y-4">
              {activeAlerts.map((alert) => (
                <div key={alert.id} className={`p-4 rounded-lg border ${
                  alert.rule.severity === 'critical' ? 'border-error bg-error/10' : 'border-warning bg-warning/10'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{alert.rule.description}</h3>
                      <p className="text-sm text-text-secondary">
                        Type: {alert.type} | Value: {alert.value} | Threshold: {alert.rule.threshold}
                      </p>
                      <p className="text-sm text-text-secondary">
                        Triggered: {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => resolveAlert(alert.type, alert.context)}
                      className="glass-button px-3 py-1 text-sm"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Error Metrics */}
          {dashboardData?.errors && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4">Error Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Total Errors:</span>
                  <span className="font-mono">{dashboardData.errors.total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Error Rate:</span>
                  <span className="font-mono">{dashboardData.errors.rate}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Performance Metrics */}
          {dashboardData?.performance && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4">Performance</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Avg Response:</span>
                  <span className="font-mono">{dashboardData.performance.averageResponseTime}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>P95 Response:</span>
                  <span className="font-mono">{dashboardData.performance.p95ResponseTime}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Throughput:</span>
                  <span className="font-mono">{dashboardData.performance.throughput} req/min</span>
                </div>
              </div>
            </div>
          )}

          {/* GitHub API Usage */}
          {githubUsage?.usage && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4">GitHub API</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Requests:</span>
                  <span className="font-mono">{githubUsage.usage.requestCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Error Rate:</span>
                  <span className="font-mono">{githubUsage.usage.errorRate}%</span>
                </div>
                {githubUsage.currentRateLimit && (
                  <div className="flex justify-between">
                    <span>Rate Limit:</span>
                    <span className="font-mono">
                      {githubUsage.currentRateLimit.remaining}/{githubUsage.currentRateLimit.limit}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* GitHub Rate Limit Details */}
        {githubUsage?.currentRateLimit && (
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4">GitHub Rate Limit Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-text-secondary">Remaining</p>
                <p className="text-2xl font-bold">{githubUsage.currentRateLimit.remaining}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Limit</p>
                <p className="text-2xl font-bold">{githubUsage.currentRateLimit.limit}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Resets At</p>
                <p className="text-lg">
                  {new Date(githubUsage.currentRateLimit.reset * 1000).toLocaleTimeString()}
                </p>
              </div>
            </div>
            
            {/* Rate limit progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Usage</span>
                <span>
                  {((githubUsage.currentRateLimit.limit - githubUsage.currentRateLimit.remaining) / githubUsage.currentRateLimit.limit * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-glass-secondary rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    githubUsage.currentRateLimit.remaining < 100 ? 'bg-error' :
                    githubUsage.currentRateLimit.remaining < 500 ? 'bg-warning' : 'bg-success'
                  }`}
                  style={{
                    width: `${((githubUsage.currentRateLimit.limit - githubUsage.currentRateLimit.remaining) / githubUsage.currentRateLimit.limit * 100)}%`
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {githubUsage?.recommendations && githubUsage.recommendations.length > 0 && (
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
            <div className="space-y-4">
              {githubUsage.recommendations.map((rec, index) => (
                <div key={index} className={`p-4 rounded-lg border ${
                  rec.type === 'error' ? 'border-error bg-error/10' : 'border-warning bg-warning/10'
                }`}>
                  <p className="font-medium">{rec.message}</p>
                  <p className="text-sm text-text-secondary mt-1">{rec.action}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}