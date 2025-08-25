/**
 * Service Factory
 * Creates authenticated service instances with integrated GitHub tokens
 */

import { TemplateService } from './template-service.js';
import { RepositoryService } from './repository-service.js';
import { createContentPersistenceService } from './content-persistence-service.js';
import { createForkService } from './fork-service.js';
import { createGitHubIntegrationService } from './github-integration-service.js';
import { createRepositorySyncService } from './repository-sync-service.js';
import { logger } from './logger.js';

/**
 * Service Factory for creating authenticated service instances
 */
export class ServiceFactory {
  constructor(accessToken, options = {}) {
    this.accessToken = accessToken;
    this.options = {
      userAgent: 'Nebula-Portfolio-Platform',
      baseUrl: process.env.GITHUB_API_URL || 'https://api.github.com',
      ...options
    };
    this.logger = logger.child({ service: 'service-factory' });
    this.serviceCache = new Map();
  }

  /**
   * Create or get cached template service
   * @param {object} options - Service options
   * @returns {TemplateService} Template service instance
   */
  getTemplateService(options = {}) {
    const cacheKey = 'template-service';
    
    if (this.serviceCache.has(cacheKey)) {
      return this.serviceCache.get(cacheKey);
    }

    const service = new TemplateService(this.accessToken, {
      ...this.options,
      ...options
    });

    this.serviceCache.set(cacheKey, service);
    return service;
  }

  /**
   * Create or get cached repository service
   * @param {object} options - Service options
   * @returns {RepositoryService} Repository service instance
   */
  getRepositoryService(options = {}) {
    const cacheKey = 'repository-service';
    
    if (this.serviceCache.has(cacheKey)) {
      return this.serviceCache.get(cacheKey);
    }

    const service = new RepositoryService(this.accessToken, {
      ...this.options,
      ...options
    });

    this.serviceCache.set(cacheKey, service);
    return service;
  }

  /**
   * Create or get cached content persistence service
   * @param {object} options - Service options
   * @returns {ContentPersistenceService} Content persistence service instance
   */
  getContentPersistenceService(options = {}) {
    const cacheKey = 'content-persistence-service';
    
    if (this.serviceCache.has(cacheKey)) {
      return this.serviceCache.get(cacheKey);
    }

    const service = createContentPersistenceService(this.accessToken, {
      ...this.options,
      ...options
    });

    this.serviceCache.set(cacheKey, service);
    return service;
  }

  /**
   * Create or get cached fork service
   * @param {object} options - Service options
   * @returns {ForkService} Fork service instance
   */
  getForkService(options = {}) {
    const cacheKey = 'fork-service';
    
    if (this.serviceCache.has(cacheKey)) {
      return this.serviceCache.get(cacheKey);
    }

    const service = createForkService(this.accessToken, {
      ...this.options,
      ...options
    });

    this.serviceCache.set(cacheKey, service);
    return service;
  }

  /**
   * Create or get cached GitHub integration service
   * @param {object} options - Service options
   * @returns {GitHubIntegrationService} GitHub integration service instance
   */
  getGitHubIntegrationService(options = {}) {
    const cacheKey = 'github-integration-service';
    
    if (this.serviceCache.has(cacheKey)) {
      return this.serviceCache.get(cacheKey);
    }

    const service = createGitHubIntegrationService(this.accessToken, {
      ...this.options,
      ...options
    });

    this.serviceCache.set(cacheKey, service);
    return service;
  }

  /**
   * Create or get cached repository sync service
   * @param {object} options - Service options
   * @returns {RepositorySyncService} Repository sync service instance
   */
  getRepositorySyncService(options = {}) {
    const cacheKey = 'repository-sync-service';
    
    if (this.serviceCache.has(cacheKey)) {
      return this.serviceCache.get(cacheKey);
    }

    const service = createRepositorySyncService(this.accessToken, {
      ...this.options,
      ...options
    });

    this.serviceCache.set(cacheKey, service);
    return service;
  }

  /**
   * Create all services for a complete workflow
   * @param {object} options - Service options
   * @returns {object} Object containing all service instances
   */
  getAllServices(options = {}) {
    return {
      templates: this.getTemplateService(options),
      repositories: this.getRepositoryService(options),
      contentPersistence: this.getContentPersistenceService(options),
      fork: this.getForkService(options),
      githubIntegration: this.getGitHubIntegrationService(options),
      repositorySync: this.getRepositorySyncService(options)
    };
  }

  /**
   * Clear service cache
   */
  clearCache() {
    this.serviceCache.clear();
    this.logger.info('Service cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.serviceCache.size,
      services: Array.from(this.serviceCache.keys())
    };
  }

  /**
   * Check service health
   * @returns {Promise<object>} Health status of all services
   */
  async checkHealth() {
    const health = {
      healthy: true,
      services: {},
      timestamp: new Date().toISOString()
    };

    try {
      // Check repository service health (this validates the token)
      const repoService = this.getRepositoryService();
      const repoHealth = await repoService.checkServiceHealth();
      
      health.services.repository = repoHealth;
      
      if (!repoHealth.healthy) {
        health.healthy = false;
      }

      // Check template service
      try {
        const templateService = this.getTemplateService();
        const templates = await templateService.getTemplates({ useCache: true });
        
        health.services.template = {
          healthy: true,
          templatesAvailable: templates.length
        };
      } catch (error) {
        health.services.template = {
          healthy: false,
          error: error.message
        };
        health.healthy = false;
      }

      return health;

    } catch (error) {
      this.logger.error('Service health check failed', { error: error.message });
      
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

/**
 * Create service factory instance
 * @param {string} accessToken - GitHub access token
 * @param {object} options - Factory options
 * @returns {ServiceFactory} Service factory instance
 */
export function createServiceFactory(accessToken, options = {}) {
  if (!accessToken) {
    throw new Error('GitHub access token is required for service factory');
  }

  return new ServiceFactory(accessToken, options);
}

/**
 * Create services for authenticated user session
 * @param {object} session - User session with access token
 * @param {object} options - Service options
 * @returns {ServiceFactory} Service factory instance
 */
export function createServicesForSession(session, options = {}) {
  if (!session?.accessToken) {
    throw new Error('Valid session with access token is required');
  }

  return createServiceFactory(session.accessToken, {
    ...options,
    userId: session.user?.id,
    userLogin: session.user?.login
  });
}

/**
 * Service factory for anonymous operations (limited functionality)
 * @param {object} options - Service options
 * @returns {object} Limited service instances
 */
export function createAnonymousServices(options = {}) {
  return {
    templates: new TemplateService(null, {
      ...options,
      anonymous: true
    })
  };
}