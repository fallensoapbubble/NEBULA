import { useState, useCallback } from 'react';

/**
 * Custom hook for managing the fork workflow
 * Handles fork confirmation, execution, and status tracking
 */
export function useForkWorkflow() {
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isForking, setIsForking] = useState(false);
  const [forkResult, setForkResult] = useState(null);
  const [forkError, setForkError] = useState(null);
  const [showStatusTracker, setShowStatusTracker] = useState(false);

  /**
   * Start the fork workflow by showing confirmation dialog
   * @param {Object} template - Template to fork
   */
  const startFork = useCallback((template) => {
    setForkError(null);
    setForkResult(null);
    setIsConfirmationOpen(true);
  }, []);

  /**
   * Execute the fork operation
   * @param {string} templateOwner - Template repository owner
   * @param {string} templateRepo - Template repository name
   * @param {Object} options - Fork options
   */
  const executeFork = useCallback(async (templateOwner, templateRepo, options = {}) => {
    setIsForking(true);
    setForkError(null);

    try {
      const response = await fetch('/api/repositories/fork', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateOwner,
          templateRepo,
          options
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fork operation failed');
      }

      if (!data.success) {
        throw new Error(data.error || 'Fork operation was not successful');
      }

      // Fork successful
      setForkResult(data);
      setIsConfirmationOpen(false);
      setShowStatusTracker(true);

      return data;

    } catch (error) {
      console.error('Fork execution error:', error);
      setForkError(error.message);
      throw error;
    } finally {
      setIsForking(false);
    }
  }, []);

  /**
   * Handle fork confirmation
   * @param {string} templateOwner - Template repository owner
   * @param {string} templateRepo - Template repository name
   * @param {Object} options - Fork options from confirmation dialog
   */
  const handleForkConfirm = useCallback(async (templateOwner, templateRepo, options) => {
    try {
      await executeFork(templateOwner, templateRepo, options);
    } catch (error) {
      // Error is already handled in executeFork
      // Keep confirmation dialog open to show error
    }
  }, [executeFork]);

  /**
   * Cancel fork confirmation
   */
  const cancelFork = useCallback(() => {
    setIsConfirmationOpen(false);
    setForkError(null);
  }, []);

  /**
   * Handle fork status tracking completion
   * @param {Object} result - Fork result data
   */
  const handleStatusComplete = useCallback((result) => {
    setShowStatusTracker(false);
    // Additional completion logic can be added here
  }, []);

  /**
   * Handle fork status tracking error
   * @param {Error} error - Status tracking error
   */
  const handleStatusError = useCallback((error) => {
    console.error('Fork status tracking error:', error);
    // Keep status tracker open to show error
  }, []);

  /**
   * Reset the fork workflow state
   */
  const resetForkWorkflow = useCallback(() => {
    setIsConfirmationOpen(false);
    setIsForking(false);
    setForkResult(null);
    setForkError(null);
    setShowStatusTracker(false);
  }, []);

  /**
   * Check if a repository is already forked
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<Object>} Fork status information
   */
  const checkForkStatus = useCallback(async (owner, repo) => {
    try {
      const response = await fetch(`/api/repositories/${owner}/${repo}/fork-status`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check fork status');
      }

      return data.status;
    } catch (error) {
      console.error('Fork status check error:', error);
      throw error;
    }
  }, []);

  /**
   * Verify that a fork was created successfully
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} expectedParent - Expected parent repository full name
   * @returns {Promise<Object>} Verification result
   */
  const verifyFork = useCallback(async (owner, repo, expectedParent) => {
    try {
      const response = await fetch(`/api/repositories/${owner}/${repo}/verify-fork`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ expectedParent })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fork verification failed');
      }

      return data;
    } catch (error) {
      console.error('Fork verification error:', error);
      throw error;
    }
  }, []);

  return {
    // State
    isConfirmationOpen,
    isForking,
    forkResult,
    forkError,
    showStatusTracker,

    // Actions
    startFork,
    executeFork,
    handleForkConfirm,
    cancelFork,
    handleStatusComplete,
    handleStatusError,
    resetForkWorkflow,

    // Utilities
    checkForkStatus,
    verifyFork
  };
}