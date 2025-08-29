/**
 * Repository Creation Dialog Component
 * Handles the repository creation workflow from template selection
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../lib/auth-hooks.js';

export default function RepositoryCreationDialog({ 
  template, 
  isOpen, 
  onClose, 
  onSuccess, 
  onError 
}) {
  const { user, isAuthenticated } = useAuth();
  const [step, setStep] = useState('configure'); // configure, creating, success, error
  const [formData, setFormData] = useState({
    repositoryName: '',
    description: '',
    isPrivate: false
  });
  const [errors, setErrors] = useState({});
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [createdRepository, setCreatedRepository] = useState(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('configure');
      setFormData({
        repositoryName: template?.name ? `${template.name.toLowerCase().replace(/\s+/g, '-')}-portfolio` : '',
        description: template?.description ? `Portfolio created from ${template.name} template` : '',
        isPrivate: false
      });
      setErrors({});
      setProgress(0);
      setStatusMessage('');
      setCreatedRepository(null);
    }
  }, [isOpen, template]);

  const validateForm = () => {
    const newErrors = {};

    // Repository name validation
    if (!formData.repositoryName.trim()) {
      newErrors.repositoryName = 'Repository name is required';
    } else if (!/^[a-zA-Z0-9._-]+$/.test(formData.repositoryName)) {
      newErrors.repositoryName = 'Repository name can only contain letters, numbers, dots, hyphens, and underscores';
    } else if (formData.repositoryName.length > 100) {
      newErrors.repositoryName = 'Repository name must be 100 characters or less';
    }

    // Description validation (optional)
    if (formData.description && formData.description.length > 350) {
      newErrors.description = 'Description must be 350 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleCreateRepository = async () => {
    if (!validateForm()) {
      return;
    }

    if (!isAuthenticated) {
      onError?.('Please sign in with GitHub to create a repository');
      return;
    }

    setStep('creating');
    setProgress(0);
    setStatusMessage('Preparing to fork template...');

    try {
      // Step 1: Validate template and check repository availability
      setProgress(20);
      setStatusMessage('Validating template and repository name...');

      const validateResponse = await fetch(`/api/repositories/fork?templateId=${encodeURIComponent(template.id)}&repositoryName=${encodeURIComponent(formData.repositoryName)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user?.accessToken || 'demo-token'}`,
          'Content-Type': 'application/json'
        }
      });

      const validateResult = await validateResponse.json();

      if (!validateResult.success) {
        throw new Error(validateResult.error?.message || 'Validation failed');
      }

      if (!validateResult.data.validation.repository_name_available) {
        throw new Error(`Repository '${formData.repositoryName}' already exists in your account`);
      }

      // Step 2: Create the fork
      setProgress(40);
      setStatusMessage('Forking template repository...');

      const forkResponse = await fetch('/api/repositories/fork', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.accessToken || 'demo-token'}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateId: template.id,
          repositoryName: formData.repositoryName,
          description: formData.description,
          isPrivate: formData.isPrivate
        })
      });

      const forkResult = await forkResponse.json();

      if (!forkResult.success) {
        throw new Error(forkResult.error?.message || 'Failed to fork repository');
      }

      // Step 3: Verify repository creation
      setProgress(80);
      setStatusMessage('Verifying repository setup...');

      // Wait a moment for GitHub to fully set up the repository
      await new Promise(resolve => setTimeout(resolve, 2000));

      setProgress(100);
      setStatusMessage('Repository created successfully!');
      setCreatedRepository(forkResult.data);
      setStep('success');

      // Notify parent component
      onSuccess?.(forkResult.data);

    } catch (error) {
      console.error('Repository creation failed:', error);
      setStep('error');
      setStatusMessage(error.message);
      onError?.(error.message);
    }
  };

  const handleRetry = () => {
    setStep('configure');
    setProgress(0);
    setStatusMessage('');
  };

  const handleClose = () => {
    if (step === 'creating') {
      // Don't allow closing during creation
      return;
    }
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={step !== 'creating' ? handleClose : undefined}
      >
        <motion.div
          className="glass-modal max-w-lg w-full"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {step === 'configure' && 'Create Repository'}
                  {step === 'creating' && 'Creating Repository'}
                  {step === 'success' && 'Repository Created!'}
                  {step === 'error' && 'Creation Failed'}
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  {template?.name && `From ${template.name} template`}
                </p>
              </div>
              {step !== 'creating' && (
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {step === 'configure' && (
              <ConfigureStep
                formData={formData}
                errors={errors}
                onInputChange={handleInputChange}
                template={template}
                user={user}
                isAuthenticated={isAuthenticated}
              />
            )}

            {step === 'creating' && (
              <CreatingStep
                progress={progress}
                statusMessage={statusMessage}
              />
            )}

            {step === 'success' && (
              <SuccessStep
                repository={createdRepository}
                template={template}
              />
            )}

            {step === 'error' && (
              <ErrorStep
                message={statusMessage}
                onRetry={handleRetry}
              />
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-700">
            {step === 'configure' && (
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-400">
                  {isAuthenticated ? (
                    `Creating as ${user?.login || 'user'}`
                  ) : (
                    'Sign in with GitHub to continue'
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleClose}
                    className="glass-button glass-button-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateRepository}
                    disabled={!isAuthenticated}
                    className="glass-button glass-button-primary"
                  >
                    Create Repository
                  </button>
                </div>
              </div>
            )}

            {step === 'creating' && (
              <div className="text-center">
                <p className="text-sm text-gray-400">
                  Please wait while we create your repository...
                </p>
              </div>
            )}

            {step === 'success' && (
              <div className="flex justify-between items-center">
                <div className="text-sm text-green-400">
                  Repository created successfully!
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleClose}
                    className="glass-button glass-button-secondary"
                  >
                    Close
                  </button>
                  <a
                    href={createdRepository?.next_steps?.editor_url}
                    className="glass-button glass-button-primary"
                  >
                    Open Editor
                  </a>
                </div>
              </div>
            )}

            {step === 'error' && (
              <div className="flex justify-between items-center">
                <div className="text-sm text-red-400">
                  Failed to create repository
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleClose}
                    className="glass-button glass-button-secondary"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleRetry}
                    className="glass-button glass-button-primary"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Configure Step Component
function ConfigureStep({ formData, errors, onInputChange, template, user, isAuthenticated }) {
  return (
    <div className="space-y-4">
      {/* Repository Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Repository Name *
        </label>
        <input
          type="text"
          value={formData.repositoryName}
          onChange={(e) => onInputChange('repositoryName', e.target.value)}
          placeholder="my-awesome-portfolio"
          className={`glass-input w-full ${errors.repositoryName ? 'border-red-500' : ''}`}
        />
        {errors.repositoryName && (
          <p className="text-red-400 text-sm mt-1">{errors.repositoryName}</p>
        )}
        {isAuthenticated && (
          <p className="text-gray-400 text-sm mt-1">
            Will be created as: {user?.login}/{formData.repositoryName}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => onInputChange('description', e.target.value)}
          placeholder="A brief description of your portfolio"
          rows={3}
          className={`glass-textarea w-full ${errors.description ? 'border-red-500' : ''}`}
        />
        {errors.description && (
          <p className="text-red-400 text-sm mt-1">{errors.description}</p>
        )}
        <p className="text-gray-400 text-sm mt-1">
          {formData.description.length}/350 characters
        </p>
      </div>

      {/* Privacy Setting */}
      <div>
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={formData.isPrivate}
            onChange={(e) => onInputChange('isPrivate', e.target.checked)}
            className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-300">
              Make repository private
            </span>
            <p className="text-xs text-gray-400">
              Private repositories are only visible to you and people you share them with
            </p>
          </div>
        </label>
      </div>

      {/* Template Info */}
      <div className="bg-glass-1 rounded-lg p-4 border border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Template Details</h4>
        <div className="space-y-1 text-sm text-gray-400">
          <div>Name: {template?.name}</div>
          <div>Author: {template?.metadata?.author}</div>
          <div>Version: {template?.metadata?.version}</div>
          <div>Stars: {template?.metadata?.stars}</div>
        </div>
      </div>

      {!isAuthenticated && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-yellow-400 text-sm font-medium">Authentication Required</p>
              <p className="text-yellow-300 text-sm">
                Please sign in with GitHub to create a repository
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Creating Step Component
function CreatingStep({ progress, statusMessage }) {
  return (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 mx-auto">
        <svg className="w-full h-full text-indigo-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Creating Your Repository</h3>
        <p className="text-gray-400">{statusMessage}</p>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-700 rounded-full h-2">
        <motion.div
          className="bg-indigo-500 h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <p className="text-sm text-gray-400">
        This may take a few moments...
      </p>
    </div>
  );
}

// Success Step Component
function SuccessStep({ repository, template }) {
  return (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Repository Created Successfully!</h3>
        <p className="text-gray-400">
          Your portfolio repository has been created from the {template?.name} template.
        </p>
      </div>

      {/* Repository Details */}
      <div className="bg-glass-1 rounded-lg p-4 border border-gray-700 text-left">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Repository Details</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Name:</span>
            <span className="text-white">{repository?.repository?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Full Name:</span>
            <span className="text-white">{repository?.repository?.full_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Visibility:</span>
            <span className="text-white">
              {repository?.repository?.private ? 'Private' : 'Public'}
            </span>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
        <h4 className="text-sm font-medium text-indigo-400 mb-2">Next Steps</h4>
        <div className="space-y-2 text-sm text-indigo-300">
          <div>• Open the web editor to customize your portfolio</div>
          <div>• View your live portfolio at the provided URL</div>
          <div>• Access the source code on GitHub</div>
        </div>
      </div>
    </div>
  );
}

// Error Step Component
function ErrorStep({ message, onRetry }) {
  return (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Creation Failed</h3>
        <p className="text-gray-400 mb-4">
          We encountered an error while creating your repository.
        </p>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400 text-sm">{message}</p>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Troubleshooting Tips</h4>
        <ul className="space-y-1 text-sm text-gray-400 text-left">
          <li>• Check if the repository name is already taken</li>
          <li>• Ensure you have permission to create repositories</li>
          <li>• Verify your GitHub authentication is valid</li>
          <li>• Try using a different repository name</li>
        </ul>
      </div>
    </div>
  );
}