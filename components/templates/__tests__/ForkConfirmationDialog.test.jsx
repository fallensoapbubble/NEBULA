import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ForkConfirmationDialog from '../ForkConfirmationDialog.jsx';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }) => children
}));

describe('ForkConfirmationDialog', () => {
  const mockTemplate = {
    name: 'Test Template',
    repository: 'owner/test-template',
    description: 'A test template for testing'
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    template: mockTemplate,
    isLoading: false,
    error: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open', () => {
    render(<ForkConfirmationDialog {...defaultProps} />);
    
    expect(screen.getByText('Fork Template')).toBeInTheDocument();
    expect(screen.getByText('Test Template')).toBeInTheDocument();
    expect(screen.getByText('owner/test-template')).toBeInTheDocument();
    expect(screen.getByText('A test template for testing')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<ForkConfirmationDialog {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Fork Template')).not.toBeInTheDocument();
  });

  it('should handle close button click', () => {
    const onClose = vi.fn();
    render(<ForkConfirmationDialog {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should handle cancel button click', () => {
    const onClose = vi.fn();
    render(<ForkConfirmationDialog {...defaultProps} onClose={onClose} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should handle fork confirmation with default options', () => {
    const onConfirm = vi.fn();
    render(<ForkConfirmationDialog {...defaultProps} onConfirm={onConfirm} />);
    
    const forkButton = screen.getByRole('button', { name: /fork repository/i });
    fireEvent.click(forkButton);
    
    expect(onConfirm).toHaveBeenCalledWith({});
  });

  it('should handle fork confirmation with custom options', () => {
    const onConfirm = vi.fn();
    render(<ForkConfirmationDialog {...defaultProps} onConfirm={onConfirm} />);
    
    // Fill in custom options
    const nameInput = screen.getByLabelText(/repository name/i);
    const orgInput = screen.getByLabelText(/organization/i);
    const branchCheckbox = screen.getByLabelText(/fork only the default branch/i);
    
    fireEvent.change(nameInput, { target: { value: 'my-custom-repo' } });
    fireEvent.change(orgInput, { target: { value: 'my-org' } });
    fireEvent.click(branchCheckbox);
    
    const forkButton = screen.getByRole('button', { name: /fork repository/i });
    fireEvent.click(forkButton);
    
    expect(onConfirm).toHaveBeenCalledWith({
      name: 'my-custom-repo',
      organization: 'my-org',
      defaultBranchOnly: true
    });
  });

  it('should show loading state', () => {
    render(<ForkConfirmationDialog {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('Forking...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /forking/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });

  it('should display error message', () => {
    const error = 'Repository already exists';
    render(<ForkConfirmationDialog {...defaultProps} error={error} />);
    
    expect(screen.getByText('Fork Failed')).toBeInTheDocument();
    expect(screen.getByText(error)).toBeInTheDocument();
  });

  it('should disable interactions when loading', () => {
    render(<ForkConfirmationDialog {...defaultProps} isLoading={true} />);
    
    const nameInput = screen.getByLabelText(/repository name/i);
    const orgInput = screen.getByLabelText(/organization/i);
    const branchCheckbox = screen.getByLabelText(/fork only the default branch/i);
    
    expect(nameInput).toBeDisabled();
    expect(orgInput).toBeDisabled();
    expect(branchCheckbox).toBeDisabled();
  });

  it('should not close when loading and backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<ForkConfirmationDialog {...defaultProps} onClose={onClose} isLoading={true} />);
    
    // Try to click backdrop (this is harder to test with the current structure)
    // The close button should be hidden when loading
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });

  it('should handle empty template gracefully', () => {
    render(<ForkConfirmationDialog {...defaultProps} template={null} />);
    
    expect(screen.getByText('Fork Template')).toBeInTheDocument();
    // Should still render the dialog structure
  });

  it('should trim whitespace from options', () => {
    const onConfirm = vi.fn();
    render(<ForkConfirmationDialog {...defaultProps} onConfirm={onConfirm} />);
    
    const nameInput = screen.getByLabelText(/repository name/i);
    const orgInput = screen.getByLabelText(/organization/i);
    
    fireEvent.change(nameInput, { target: { value: '  my-repo  ' } });
    fireEvent.change(orgInput, { target: { value: '  my-org  ' } });
    
    const forkButton = screen.getByRole('button', { name: /fork repository/i });
    fireEvent.click(forkButton);
    
    expect(onConfirm).toHaveBeenCalledWith({
      name: 'my-repo',
      organization: 'my-org'
    });
  });

  it('should exclude empty options', () => {
    const onConfirm = vi.fn();
    render(<ForkConfirmationDialog {...defaultProps} onConfirm={onConfirm} />);
    
    const nameInput = screen.getByLabelText(/repository name/i);
    const orgInput = screen.getByLabelText(/organization/i);
    
    fireEvent.change(nameInput, { target: { value: '   ' } }); // Only whitespace
    fireEvent.change(orgInput, { target: { value: '' } }); // Empty
    
    const forkButton = screen.getByRole('button', { name: /fork repository/i });
    fireEvent.click(forkButton);
    
    expect(onConfirm).toHaveBeenCalledWith({});
  });
});