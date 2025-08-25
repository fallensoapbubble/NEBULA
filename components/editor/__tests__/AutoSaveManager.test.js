import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AutoSaveManager, useAutoSave, AutoSaveStatus } from '../AutoSaveManager.js';

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

describe('AutoSaveManager', () => {
  let autoSaveManager;
  let mockSaveFunction;
  let mockConflictCheckFunction;

  beforeEach(() => {
    vi.useFakeTimers();
    
    mockSaveFunction = vi.fn();
    mockConflictCheckFunction = vi.fn();
    
    autoSaveManager = new AutoSaveManager({
      saveInterval: 1000,
      maxRetries: 2,
      retryDelay: 500,
      conflictCheckInterval: 5000
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    autoSaveManager.destroy();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const manager = new AutoSaveManager();
      
      expect(manager.options.saveInterval).toBe(2000);
      expect(manager.options.maxRetries).toBe(3);
      expect(manager.options.retryDelay).toBe(1000);
      expect(manager.options.conflictCheckInterval).toBe(30000);
      expect(manager.options.enableConflictDetection).toBe(true);
    });

    it('should accept custom options', () => {
      expect(autoSaveManager.options.saveInterval).toBe(1000);
      expect(autoSaveManager.options.maxRetries).toBe(2);
      expect(autoSaveManager.options.retryDelay).toBe(500);
    });

    it('should setup network listeners', () => {
      expect(autoSaveManager.isOnline).toBe(true);
    });
  });

  describe('initialize', () => {
    it('should set configuration', () => {
      const config = {
        owner: 'testowner',
        repo: 'testrepo',
        saveFunction: mockSaveFunction,
        conflictCheckFunction: mockConflictCheckFunction,
        initialCommitSha: 'abc123'
      };

      autoSaveManager.initialize(config);

      expect(autoSaveManager.config).toBe(config);
      expect(autoSaveManager.lastKnownCommitSha).toBe('abc123');
    });

    it('should start conflict detection when enabled', () => {
      const startSpy = vi.spyOn(autoSaveManager, 'startConflictDetection');
      
      autoSaveManager.initialize({
        owner: 'testowner',
        repo: 'testrepo',
        saveFunction: mockSaveFunction,
        conflictCheckFunction: mockConflictCheckFunction
      });

      expect(startSpy).toHaveBeenCalled();
    });
  });

  describe('scheduleSave', () => {
    beforeEach(() => {
      autoSaveManager.initialize({
        owner: 'testowner',
        repo: 'testrepo',
        saveFunction: mockSaveFunction,
        conflictCheckFunction: mockConflictCheckFunction
      });
    });

    it('should schedule save after interval', async () => {
      const testData = { name: 'Test Data' };
      const statusListener = vi.fn();
      autoSaveManager.on('statusChange', statusListener);

      autoSaveManager.scheduleSave(testData);

      expect(statusListener).toHaveBeenCalledWith({
        status: 'pending',
        data: testData
      });

      // Fast-forward time to trigger save
      vi.advanceTimersByTime(1000);

      expect(statusListener).toHaveBeenCalledWith({
        status: 'saving',
        data: testData
      });
    });

    it('should save immediately when requested', async () => {
      const testData = { name: 'Test Data' };
      mockSaveFunction.mockResolvedValue({ success: true, commitSha: 'new-sha' });

      autoSaveManager.scheduleSave(testData, true);

      // Should save immediately without waiting
      await vi.runAllTimersAsync();

      expect(mockSaveFunction).toHaveBeenCalledWith(testData);
    });

    it('should not schedule save for unchanged data', () => {
      const testData = { name: 'Test Data' };
      autoSaveManager.lastSavedData = testData;

      const performSaveSpy = vi.spyOn(autoSaveManager, 'performSave');
      
      autoSaveManager.scheduleSave(testData);
      vi.advanceTimersByTime(1000);

      expect(performSaveSpy).not.toHaveBeenCalled();
    });

    it('should cancel previous save when new save is scheduled', () => {
      const testData1 = { name: 'Test Data 1' };
      const testData2 = { name: 'Test Data 2' };

      autoSaveManager.scheduleSave(testData1);
      autoSaveManager.scheduleSave(testData2);

      vi.advanceTimersByTime(1000);

      // Should only save the latest data
      expect(mockSaveFunction).toHaveBeenCalledTimes(1);
      expect(mockSaveFunction).toHaveBeenCalledWith(testData2);
    });
  });

  describe('performSave', () => {
    beforeEach(() => {
      autoSaveManager.initialize({
        owner: 'testowner',
        repo: 'testrepo',
        saveFunction: mockSaveFunction,
        conflictCheckFunction: mockConflictCheckFunction
      });
    });

    it('should perform successful save', async () => {
      const testData = { name: 'Test Data' };
      const saveListener = vi.fn();
      const statusListener = vi.fn();

      autoSaveManager.on('save', saveListener);
      autoSaveManager.on('statusChange', statusListener);

      mockSaveFunction.mockResolvedValue({
        success: true,
        commitSha: 'new-commit-sha'
      });

      await autoSaveManager.performSave(testData);

      expect(mockSaveFunction).toHaveBeenCalledWith(testData);
      expect(autoSaveManager.lastSavedData).toBe(testData);
      expect(autoSaveManager.lastKnownCommitSha).toBe('new-commit-sha');
      expect(autoSaveManager.retryCount).toBe(0);

      expect(saveListener).toHaveBeenCalledWith({
        success: true,
        data: testData,
        result: { success: true, commitSha: 'new-commit-sha' },
        timestamp: expect.any(String)
      });

      expect(statusListener).toHaveBeenCalledWith({
        status: 'saved',
        data: testData,
        timestamp: expect.any(Date)
      });
    });

    it('should handle save failure with retry', async () => {
      const testData = { name: 'Test Data' };
      const statusListener = vi.fn();

      autoSaveManager.on('statusChange', statusListener);

      mockSaveFunction.mockRejectedValue(new Error('Save failed'));

      const performSavePromise = autoSaveManager.performSave(testData);

      // Wait for initial save attempt
      await vi.runAllTimersAsync();

      expect(statusListener).toHaveBeenCalledWith({
        status: 'retrying',
        data: testData,
        attempt: 1,
        maxRetries: 2
      });

      expect(autoSaveManager.retryCount).toBe(1);
    });

    it('should handle max retries exceeded', async () => {
      const testData = { name: 'Test Data' };
      const errorListener = vi.fn();
      const statusListener = vi.fn();

      autoSaveManager.on('error', errorListener);
      autoSaveManager.on('statusChange', statusListener);

      mockSaveFunction.mockRejectedValue(new Error('Save failed'));

      // Simulate max retries
      autoSaveManager.retryCount = 2;

      await autoSaveManager.performSave(testData);

      expect(errorListener).toHaveBeenCalledWith({
        type: 'save_failed',
        message: 'Save failed',
        data: testData,
        retryCount: 2
      });

      expect(statusListener).toHaveBeenCalledWith({
        status: 'error',
        data: testData,
        error: 'Save failed'
      });

      expect(autoSaveManager.retryCount).toBe(0); // Reset after max retries
    });

    it('should not save when offline', async () => {
      const testData = { name: 'Test Data' };
      const errorListener = vi.fn();

      autoSaveManager.on('error', errorListener);
      autoSaveManager.isOnline = false;

      await autoSaveManager.performSave(testData);

      expect(mockSaveFunction).not.toHaveBeenCalled();
      expect(errorListener).toHaveBeenCalledWith({
        type: 'offline',
        message: 'Cannot save while offline. Changes will be saved when connection is restored.'
      });
    });

    it('should check for conflicts before saving', async () => {
      const testData = { name: 'Test Data' };
      const conflictListener = vi.fn();

      autoSaveManager.on('conflict', conflictListener);

      mockConflictCheckFunction.mockResolvedValue({
        hasConflicts: true,
        conflicts: [{ path: 'data.json', type: 'content_conflict' }],
        remoteCommits: [{ sha: 'remote-sha', message: 'Remote change' }]
      });

      await autoSaveManager.performSave(testData);

      expect(mockConflictCheckFunction).toHaveBeenCalled();
      expect(mockSaveFunction).not.toHaveBeenCalled();
      expect(conflictListener).toHaveBeenCalledWith({
        conflicts: [{ path: 'data.json', type: 'content_conflict' }],
        data: testData,
        remoteCommits: [{ sha: 'remote-sha', message: 'Remote change' }]
      });
    });

    it('should proceed with save when no conflicts', async () => {
      const testData = { name: 'Test Data' };

      mockConflictCheckFunction.mockResolvedValue({
        hasConflicts: false,
        conflicts: []
      });

      mockSaveFunction.mockResolvedValue({ success: true });

      await autoSaveManager.performSave(testData);

      expect(mockConflictCheckFunction).toHaveBeenCalled();
      expect(mockSaveFunction).toHaveBeenCalledWith(testData);
    });
  });

  describe('network status handling', () => {
    it('should handle going offline', () => {
      const statusListener = vi.fn();
      autoSaveManager.on('statusChange', statusListener);

      // Simulate going offline
      autoSaveManager.isOnline = false;
      window.dispatchEvent(new Event('offline'));

      expect(statusListener).toHaveBeenCalledWith({ status: 'offline' });
    });

    it('should handle coming back online', () => {
      const statusListener = vi.fn();
      autoSaveManager.on('statusChange', statusListener);

      autoSaveManager.lastSavedData = { name: 'Test Data' };
      const scheduleSaveSpy = vi.spyOn(autoSaveManager, 'scheduleSave');

      // Simulate coming back online
      autoSaveManager.isOnline = true;
      window.dispatchEvent(new Event('online'));

      expect(statusListener).toHaveBeenCalledWith({ status: 'online' });
      expect(scheduleSaveSpy).toHaveBeenCalledWith({ name: 'Test Data' }, true);
    });
  });

  describe('conflict detection', () => {
    beforeEach(() => {
      autoSaveManager.initialize({
        owner: 'testowner',
        repo: 'testrepo',
        saveFunction: mockSaveFunction,
        conflictCheckFunction: mockConflictCheckFunction
      });
    });

    it('should start periodic conflict detection', () => {
      expect(autoSaveManager.conflictTimer).toBeTruthy();
    });

    it('should stop conflict detection', () => {
      autoSaveManager.stopConflictDetection();
      expect(autoSaveManager.conflictTimer).toBeNull();
    });

    it('should detect conflicts in background', async () => {
      const conflictListener = vi.fn();
      autoSaveManager.on('conflict', conflictListener);

      autoSaveManager.lastSavedData = { name: 'Test Data' };

      mockConflictCheckFunction.mockResolvedValue({
        hasConflicts: true,
        conflicts: [{ path: 'data.json', type: 'content_conflict' }],
        remoteCommits: [{ sha: 'remote-sha' }]
      });

      // Trigger conflict check
      vi.advanceTimersByTime(5000);
      await vi.runAllTimersAsync();

      expect(conflictListener).toHaveBeenCalledWith({
        conflicts: [{ path: 'data.json', type: 'content_conflict' }],
        data: { name: 'Test Data' },
        remoteCommits: [{ sha: 'remote-sha' }],
        type: 'background_check'
      });
    });
  });

  describe('utility methods', () => {
    it('should force save immediately', async () => {
      autoSaveManager.initialize({
        owner: 'testowner',
        repo: 'testrepo',
        saveFunction: mockSaveFunction
      });

      const testData = { name: 'Test Data' };
      mockSaveFunction.mockResolvedValue({ success: true });

      await autoSaveManager.forceSave(testData);

      expect(mockSaveFunction).toHaveBeenCalledWith(testData);
    });

    it('should cancel pending save', () => {
      const statusListener = vi.fn();
      autoSaveManager.on('statusChange', statusListener);

      autoSaveManager.scheduleSave({ name: 'Test Data' });
      autoSaveManager.cancelSave();

      expect(statusListener).toHaveBeenCalledWith({ status: 'cancelled' });
      expect(autoSaveManager.saveTimer).toBeNull();
    });

    it('should get current status', () => {
      autoSaveManager.lastSavedData = { name: 'Test Data' };
      autoSaveManager.lastKnownCommitSha = 'abc123';

      const status = autoSaveManager.getStatus();

      expect(status.isOnline).toBe(true);
      expect(status.hasPendingSave).toBe(false);
      expect(status.lastSavedData).toEqual({ name: 'Test Data' });
      expect(status.lastKnownCommitSha).toBe('abc123');
      expect(status.retryCount).toBe(0);
      expect(status.conflictDetectionEnabled).toBe(true);
    });
  });

  describe('event handling', () => {
    it('should add and remove event listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      autoSaveManager.on('save', listener1);
      autoSaveManager.on('save', listener2);

      autoSaveManager.emit('save', { test: 'data' });

      expect(listener1).toHaveBeenCalledWith({ test: 'data' });
      expect(listener2).toHaveBeenCalledWith({ test: 'data' });

      autoSaveManager.off('save', listener1);
      autoSaveManager.emit('save', { test: 'data2' });

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(2);
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = vi.fn();

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      autoSaveManager.on('save', errorListener);
      autoSaveManager.on('save', goodListener);

      autoSaveManager.emit('save', { test: 'data' });

      expect(consoleSpy).toHaveBeenCalled();
      expect(goodListener).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources on destroy', () => {
      autoSaveManager.scheduleSave({ name: 'Test Data' });
      autoSaveManager.startConflictDetection();

      expect(autoSaveManager.saveTimer).toBeTruthy();
      expect(autoSaveManager.conflictTimer).toBeTruthy();

      autoSaveManager.destroy();

      expect(autoSaveManager.saveTimer).toBeNull();
      expect(autoSaveManager.conflictTimer).toBeNull();
      expect(autoSaveManager.listeners.save).toHaveLength(0);
    });
  });
});

describe('useAutoSave hook', () => {
  const TestComponent = ({ config, data, immediate }) => {
    const {
      scheduleSave,
      forceSave,
      cancelSave,
      resolveConflicts,
      clearError,
      saveStatus,
      lastSaved,
      conflicts,
      error,
      isOnline
    } = useAutoSave(config);

    React.useEffect(() => {
      if (data) {
        scheduleSave(data, immediate);
      }
    }, [data, immediate, scheduleSave]);

    return (
      <div>
        <div data-testid="save-status">{saveStatus}</div>
        <div data-testid="last-saved">{lastSaved || 'never'}</div>
        <div data-testid="conflicts">{conflicts.length}</div>
        <div data-testid="error">{error?.message || 'none'}</div>
        <div data-testid="online">{isOnline.toString()}</div>
        <button onClick={() => forceSave(data)} data-testid="force-save">Force Save</button>
        <button onClick={cancelSave} data-testid="cancel-save">Cancel Save</button>
        <button onClick={() => resolveConflicts({ data })} data-testid="resolve-conflicts">Resolve Conflicts</button>
        <button onClick={clearError} data-testid="clear-error">Clear Error</button>
      </div>
    );
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with config', () => {
    const config = {
      owner: 'testowner',
      repo: 'testrepo',
      saveFunction: vi.fn(),
      conflictCheckFunction: vi.fn()
    };

    render(<TestComponent config={config} />);

    expect(screen.getByTestId('save-status')).toHaveTextContent('idle');
    expect(screen.getByTestId('online')).toHaveTextContent('true');
  });

  it('should schedule save when data changes', () => {
    const mockSave = vi.fn().mockResolvedValue({ success: true });
    const config = {
      owner: 'testowner',
      repo: 'testrepo',
      saveFunction: mockSave
    };

    render(<TestComponent config={config} data={{ name: 'Test' }} />);

    expect(screen.getByTestId('save-status')).toHaveTextContent('pending');
  });

  it('should handle force save', async () => {
    const mockSave = vi.fn().mockResolvedValue({ success: true });
    const config = {
      owner: 'testowner',
      repo: 'testrepo',
      saveFunction: mockSave
    };

    render(<TestComponent config={config} data={{ name: 'Test' }} />);

    act(() => {
      screen.getByTestId('force-save').click();
    });

    await vi.runAllTimersAsync();

    expect(mockSave).toHaveBeenCalled();
  });

  it('should handle conflict resolution', () => {
    const config = {
      owner: 'testowner',
      repo: 'testrepo',
      saveFunction: vi.fn()
    };

    const { rerender } = render(<TestComponent config={config} />);

    // Simulate conflicts
    act(() => {
      screen.getByTestId('resolve-conflicts').click();
    });

    expect(screen.getByTestId('save-status')).toHaveTextContent('idle');
    expect(screen.getByTestId('conflicts')).toHaveTextContent('0');
  });

  it('should handle error clearing', () => {
    const config = {
      owner: 'testowner',
      repo: 'testrepo',
      saveFunction: vi.fn()
    };

    render(<TestComponent config={config} />);

    act(() => {
      screen.getByTestId('clear-error').click();
    });

    expect(screen.getByTestId('error')).toHaveTextContent('none');
    expect(screen.getByTestId('save-status')).toHaveTextContent('idle');
  });
});

describe('AutoSaveStatus component', () => {
  it('should display pending status', () => {
    render(<AutoSaveStatus saveStatus="pending" />);
    
    expect(screen.getByText('Changes pending...')).toBeInTheDocument();
    expect(screen.getByText('⏳')).toBeInTheDocument();
  });

  it('should display saving status', () => {
    render(<AutoSaveStatus saveStatus="saving" />);
    
    expect(screen.getByText('Saving changes...')).toBeInTheDocument();
    expect(screen.getByText('💾')).toBeInTheDocument();
  });

  it('should display saved status with timestamp', () => {
    const lastSaved = new Date(Date.now() - 60000); // 1 minute ago
    
    render(<AutoSaveStatus saveStatus="saved" lastSaved={lastSaved} />);
    
    expect(screen.getByText(/Saved \d+m ago/)).toBeInTheDocument();
    expect(screen.getByText('✅')).toBeInTheDocument();
  });

  it('should display conflict status with resolve button', () => {
    const conflicts = [{ path: 'data.json', type: 'content_conflict' }];
    const onResolve = vi.fn();
    
    render(
      <AutoSaveStatus 
        saveStatus="conflict" 
        conflicts={conflicts} 
        onResolveConflicts={onResolve} 
      />
    );
    
    expect(screen.getByText('1 conflict(s) detected')).toBeInTheDocument();
    expect(screen.getByText('⚠️')).toBeInTheDocument();
    
    const resolveButton = screen.getByText('Resolve');
    expect(resolveButton).toBeInTheDocument();
    
    resolveButton.click();
    expect(onResolve).toHaveBeenCalled();
  });

  it('should display error status with retry button', () => {
    const error = { message: 'Save failed' };
    const onRetry = vi.fn();
    
    render(
      <AutoSaveStatus 
        saveStatus="error" 
        error={error} 
        onRetry={onRetry} 
      />
    );
    
    expect(screen.getByText('Save failed')).toBeInTheDocument();
    expect(screen.getByText('❌')).toBeInTheDocument();
    
    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();
    
    retryButton.click();
    expect(onRetry).toHaveBeenCalled();
  });

  it('should display offline status', () => {
    render(<AutoSaveStatus saveStatus="offline" />);
    
    expect(screen.getByText('Offline - changes will save when online')).toBeInTheDocument();
    expect(screen.getByText('📡')).toBeInTheDocument();
  });

  it('should display ready status', () => {
    render(<AutoSaveStatus saveStatus="idle" />);
    
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('💤')).toBeInTheDocument();
  });
});