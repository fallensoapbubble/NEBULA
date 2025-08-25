import { useForkWorkflow } from '../../lib/hooks/useForkWorkflow.js';
import ForkConfirmationDialog from './ForkConfirmationDialog.jsx';
import ForkStatusTracker from './ForkStatusTracker.jsx';

/**
 * Complete Fork Workflow Component
 * Manages the entire fork process from confirmation to completion
 */
export default function ForkWorkflow({ 
  template,
  onForkComplete,
  onForkError,
  redirectToEditor = true 
}) {
  const {
    isConfirmationOpen,
    isForking,
    forkResult,
    forkError,
    showStatusTracker,
    handleForkConfirm,
    cancelFork,
    handleStatusComplete,
    handleStatusError
  } = useForkWorkflow();

  const handleConfirm = async (options) => {
    if (!template?.repository) {
      console.error('Template repository information is missing');
      return;
    }

    // Parse repository information
    const [templateOwner, templateRepo] = template.repository.split('/');
    
    if (!templateOwner || !templateRepo) {
      console.error('Invalid template repository format:', template.repository);
      return;
    }

    try {
      await handleForkConfirm(templateOwner, templateRepo, options);
    } catch (error) {
      // Error handling is managed by the hook
    }
  };

  const handleStatusCompleteWrapper = (result) => {
    handleStatusComplete(result);
    
    if (onForkComplete) {
      onForkComplete(result);
    }
  };

  const handleStatusErrorWrapper = (error) => {
    handleStatusError(error);
    
    if (onForkError) {
      onForkError(error);
    }
  };

  return (
    <>
      {/* Fork Confirmation Dialog */}
      <ForkConfirmationDialog
        isOpen={isConfirmationOpen}
        onClose={cancelFork}
        onConfirm={handleConfirm}
        template={template}
        isLoading={isForking}
        error={forkError}
      />

      {/* Fork Status Tracker */}
      {showStatusTracker && (
        <ForkStatusTracker
          forkResult={forkResult}
          onComplete={handleStatusCompleteWrapper}
          onError={handleStatusErrorWrapper}
          redirectToEditor={redirectToEditor}
        />
      )}
    </>
  );
}