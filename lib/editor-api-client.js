/**
 * Editor API Client
 * Client-side service for interacting with content editor APIs
 */

/**
 * Editor API Client class
 */
export class EditorApiClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || '/api/editor';
    this.timeout = options.timeout || 30000; // 30 seconds
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  /**
   * Save portfolio content to repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Object} portfolioData - Portfolio data to save
   * @param {Object} options - Save options
   * @returns {Promise<SaveResult>}
   */
  async savePortfolioContent(owner, repo, portfolioData, options = {}) {
    const requestBody = {
      owner,
      repo,
      portfolioData,
      options: {
        commitMessage: options.commitMessage,
        branch: options.branch,
        validateBeforeSave: options.validateBeforeSave,
        createBackup: options.createBackup,
        ...options
      }
    };

    try {
      const response = await this.makeRequest('POST', '/save', requestBody);
      
      if (!response.success) {
        throw new Error(response.error || 'Save operation failed');
      }

      return {
        success: true,
        commitSha: response.commitSha,
        filesChanged: response.filesChanged,
        changedFiles: response.changedFiles,
        message: response.message,
        commit: response.commit
      };

    } catch (error) {
      console.error('Save portfolio content failed:', error);
      
      return {
        success: false,
        error: error.message,
        retryable: error.retryable || false,
        details: error.details
      };
    }
  }

  /**
   * Save specific content files
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Array} fileChanges - Array of file changes
   * @param {string} commitMessage - Commit message
   * @param {Object} options - Save options
   * @returns {Promise<SaveResult>}
   */
  async saveContentFiles(owner, repo, fileChanges, commitMessage, options = {}) {
    const requestBody = {
      owner,
      repo,
      fileChanges,
      commitMessage,
      options
    };

    try {
      const response = await this.makeRequest('PUT', '/save', requestBody);
      
      if (!response.success) {
        throw new Error(response.error || 'File save operation failed');
      }

      return {
        success: true,
        commitSha: response.commitSha,
        filesChanged: response.filesChanged,
        message: response.message,
        commit: response.commit
      };

    } catch (error) {
      console.error('Save content files failed:', error);
      
      return {
        success: false,
        error: error.message,
        retryable: error.retryable || false,
        details: error.details
      };
    }
  }

  /**
   * Check for conflicts before saving
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Array} localChanges - Local file changes
   * @param {string} lastKnownCommitSha - Last known commit SHA
   * @param {Object} options - Check options
   * @returns {Promise<ConflictCheckResult>}
   */
  async checkForConflicts(owner, repo, localChanges, lastKnownCommitSha, options = {}) {
    const requestBody = {
      owner,
      repo,
      localChanges,
      lastKnownCommitSha,
      options
    };

    try {
      const response = await this.makeRequest('POST', '/conflicts', requestBody);
      
      return {
        success: response.success || true,
        hasConflicts: response.hasConflicts || false,
        conflicts: response.conflicts || [],
        remoteCommits: response.remoteCommits || []
      };

    } catch (error) {
      console.error('Conflict check failed:', error);
      
      return {
        success: false,
        hasConflicts: false,
        conflicts: [],
        error: error.message
      };
    }
  }

  /**
   * Get repository synchronization status
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} lastKnownCommitSha - Last known commit SHA
   * @param {Object} options - Status options
   * @returns {Promise<SyncStatusResult>}
   */
  async getSyncStatus(owner, repo, lastKnownCommitSha, options = {}) {
    const params = new URLSearchParams({
      owner,
      repo,
      lastKnownCommitSha
    });

    if (options.branch) {
      params.append('branch', options.branch);
    }

    try {
      const response = await this.makeRequest('GET', `/conflicts/sync-status?${params}`);
      
      return {
        success: response.success || true,
        status: response.status
      };

    } catch (error) {
      console.error('Sync status check failed:', error);
      
      return {
        success: false,
        status: null,
        error: error.message
      };
    }
  }

  /**
   * Make HTTP request with retry logic
   * @private
   */
  async makeRequest(method, endpoint, body = null, attempt = 1) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const requestOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(this.timeout)
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      requestOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.retryable = errorData.retryable || this.isRetryableStatus(response.status);
        error.details = errorData.details;
        throw error;
      }

      return await response.json();

    } catch (error) {
      console.error(`Request failed (attempt ${attempt}/${this.retryAttempts}):`, error);

      // Retry logic for retryable errors
      if (attempt < this.retryAttempts && this.shouldRetry(error)) {
        console.log(`Retrying request in ${this.retryDelay * attempt}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        return this.makeRequest(method, endpoint, body, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Check if HTTP status is retryable
   * @private
   */
  isRetryableStatus(status) {
    return [408, 429, 500, 502, 503, 504].includes(status);
  }

  /**
   * Check if error should be retried
   * @private
   */
  shouldRetry(error) {
    // Retry on network errors, timeouts, and retryable HTTP statuses
    return (
      error.name === 'AbortError' ||
      error.name === 'TypeError' ||
      error.retryable ||
      this.isRetryableStatus(error.status)
    );
  }
}

/**
 * React hook for editor API client
 */
export function useEditorApi(options = {}) {
  const [client] = React.useState(() => new EditorApiClient(options));
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const savePortfolioContent = React.useCallback(async (owner, repo, portfolioData, saveOptions = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await client.savePortfolioContent(owner, repo, portfolioData, saveOptions);
      
      if (!result.success) {
        setError(result.error);
      }
      
      return result;
    } catch (err) {
      setError(err.message);
      return {
        success: false,
        error: err.message,
        retryable: err.retryable || false
      };
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const saveContentFiles = React.useCallback(async (owner, repo, fileChanges, commitMessage, saveOptions = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await client.saveContentFiles(owner, repo, fileChanges, commitMessage, saveOptions);
      
      if (!result.success) {
        setError(result.error);
      }
      
      return result;
    } catch (err) {
      setError(err.message);
      return {
        success: false,
        error: err.message,
        retryable: err.retryable || false
      };
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const checkForConflicts = React.useCallback(async (owner, repo, localChanges, lastKnownCommitSha, checkOptions = {}) => {
    try {
      return await client.checkForConflicts(owner, repo, localChanges, lastKnownCommitSha, checkOptions);
    } catch (err) {
      console.error('Conflict check failed:', err);
      return {
        success: false,
        hasConflicts: false,
        conflicts: [],
        error: err.message
      };
    }
  }, [client]);

  const getSyncStatus = React.useCallback(async (owner, repo, lastKnownCommitSha, statusOptions = {}) => {
    try {
      return await client.getSyncStatus(owner, repo, lastKnownCommitSha, statusOptions);
    } catch (err) {
      console.error('Sync status check failed:', err);
      return {
        success: false,
        status: null,
        error: err.message
      };
    }
  }, [client]);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return {
    savePortfolioContent,
    saveContentFiles,
    checkForConflicts,
    getSyncStatus,
    clearError,
    isLoading,
    error,
    client
  };
}

/**
 * Create editor API client instance
 * @param {Object} options - Client options
 * @returns {EditorApiClient}
 */
export function createEditorApiClient(options = {}) {
  return new EditorApiClient(options);
}

export default EditorApiClient;