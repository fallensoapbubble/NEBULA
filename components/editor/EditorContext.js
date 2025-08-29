/**
 * Editor Context - Manages editor state and provides context to all editor components
 */

'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';

// Initial editor state
const initialState = {
  // Repository information
  repository: {
    owner: null,
    name: null,
    structure: null,
    lastCommitSha: null,
    isLoading: false,
    error: null
  },
  
  // Content state
  content: {
    files: {},
    currentFile: null,
    unsavedChanges: {},
    isLoading: false,
    error: null
  },
  
  // Sync state
  sync: {
    lastSync: null,
    hasConflicts: false,
    remoteChanges: null,
    isChecking: false,
    error: null
  },
  
  // Navigation state
  navigation: {
    sidebarCollapsed: false,
    currentPath: '/editor',
    breadcrumbs: [],
    activeSecondaryTab: 'edit',
    recentFiles: []
  },
  
  // UI state
  ui: {
    activeTab: 'editor',
    previewMode: false,
    loading: false,
    saving: false,
    error: null
  }
};

// Action types
const ActionTypes = {
  // Repository actions
  SET_REPOSITORY: 'SET_REPOSITORY',
  SET_REPOSITORY_LOADING: 'SET_REPOSITORY_LOADING',
  SET_REPOSITORY_ERROR: 'SET_REPOSITORY_ERROR',
  
  // Content actions
  SET_CONTENT_FILES: 'SET_CONTENT_FILES',
  SET_CURRENT_FILE: 'SET_CURRENT_FILE',
  UPDATE_FILE_CONTENT: 'UPDATE_FILE_CONTENT',
  SET_UNSAVED_CHANGES: 'SET_UNSAVED_CHANGES',
  CLEAR_UNSAVED_CHANGES: 'CLEAR_UNSAVED_CHANGES',
  SET_CONTENT_LOADING: 'SET_CONTENT_LOADING',
  SET_CONTENT_ERROR: 'SET_CONTENT_ERROR',
  
  // Sync actions
  SET_SYNC_STATUS: 'SET_SYNC_STATUS',
  SET_CONFLICTS: 'SET_CONFLICTS',
  CLEAR_CONFLICTS: 'CLEAR_CONFLICTS',
  SET_SYNC_CHECKING: 'SET_SYNC_CHECKING',
  SET_SYNC_ERROR: 'SET_SYNC_ERROR',
  
  // Navigation actions
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
  SET_CURRENT_PATH: 'SET_CURRENT_PATH',
  SET_BREADCRUMBS: 'SET_BREADCRUMBS',
  SET_ACTIVE_SECONDARY_TAB: 'SET_ACTIVE_SECONDARY_TAB',
  ADD_RECENT_FILE: 'ADD_RECENT_FILE',
  
  // UI actions
  SET_ACTIVE_TAB: 'SET_ACTIVE_TAB',
  SET_PREVIEW_MODE: 'SET_PREVIEW_MODE',
  SET_LOADING: 'SET_LOADING',
  SET_SAVING: 'SET_SAVING',
  SET_UI_ERROR: 'SET_UI_ERROR',
  CLEAR_UI_ERROR: 'CLEAR_UI_ERROR'
};

// Reducer function
function editorReducer(state, action) {
  switch (action.type) {
    // Repository actions
    case ActionTypes.SET_REPOSITORY:
      return {
        ...state,
        repository: {
          ...state.repository,
          ...action.payload,
          isLoading: false,
          error: null
        }
      };
      
    case ActionTypes.SET_REPOSITORY_LOADING:
      return {
        ...state,
        repository: {
          ...state.repository,
          isLoading: action.payload
        }
      };
      
    case ActionTypes.SET_REPOSITORY_ERROR:
      return {
        ...state,
        repository: {
          ...state.repository,
          error: action.payload,
          isLoading: false
        }
      };
      
    // Content actions
    case ActionTypes.SET_CONTENT_FILES:
      return {
        ...state,
        content: {
          ...state.content,
          files: action.payload,
          isLoading: false,
          error: null
        }
      };
      
    case ActionTypes.SET_CURRENT_FILE:
      return {
        ...state,
        content: {
          ...state.content,
          currentFile: action.payload
        },
        navigation: {
          ...state.navigation,
          recentFiles: [
            action.payload,
            ...state.navigation.recentFiles.filter(f => f !== action.payload)
          ].slice(0, 10)
        }
      };
      
    case ActionTypes.UPDATE_FILE_CONTENT:
      return {
        ...state,
        content: {
          ...state.content,
          files: {
            ...state.content.files,
            [action.payload.path]: {
              ...state.content.files[action.payload.path],
              content: action.payload.content
            }
          }
        }
      };
      
    case ActionTypes.SET_UNSAVED_CHANGES:
      return {
        ...state,
        content: {
          ...state.content,
          unsavedChanges: {
            ...state.content.unsavedChanges,
            [action.payload.path]: action.payload.changes
          }
        }
      };
      
    case ActionTypes.CLEAR_UNSAVED_CHANGES:
      const { [action.payload]: removed, ...remainingChanges } = state.content.unsavedChanges;
      return {
        ...state,
        content: {
          ...state.content,
          unsavedChanges: remainingChanges
        }
      };
      
    case ActionTypes.SET_CONTENT_LOADING:
      return {
        ...state,
        content: {
          ...state.content,
          isLoading: action.payload
        }
      };
      
    case ActionTypes.SET_CONTENT_ERROR:
      return {
        ...state,
        content: {
          ...state.content,
          error: action.payload,
          isLoading: false
        }
      };
      
    // Sync actions
    case ActionTypes.SET_SYNC_STATUS:
      return {
        ...state,
        sync: {
          ...state.sync,
          lastSync: action.payload.lastSync || state.sync.lastSync,
          remoteChanges: action.payload.remoteChanges || null,
          isChecking: false,
          error: null
        }
      };
      
    case ActionTypes.SET_CONFLICTS:
      return {
        ...state,
        sync: {
          ...state.sync,
          hasConflicts: action.payload.length > 0,
          remoteChanges: action.payload
        }
      };
      
    case ActionTypes.CLEAR_CONFLICTS:
      return {
        ...state,
        sync: {
          ...state.sync,
          hasConflicts: false,
          remoteChanges: null
        }
      };
      
    case ActionTypes.SET_SYNC_CHECKING:
      return {
        ...state,
        sync: {
          ...state.sync,
          isChecking: action.payload
        }
      };
      
    case ActionTypes.SET_SYNC_ERROR:
      return {
        ...state,
        sync: {
          ...state.sync,
          error: action.payload,
          isChecking: false
        }
      };
      
    // Navigation actions
    case ActionTypes.TOGGLE_SIDEBAR:
      return {
        ...state,
        navigation: {
          ...state.navigation,
          sidebarCollapsed: !state.navigation.sidebarCollapsed
        }
      };
      
    case ActionTypes.SET_CURRENT_PATH:
      return {
        ...state,
        navigation: {
          ...state.navigation,
          currentPath: action.payload
        }
      };
      
    case ActionTypes.SET_BREADCRUMBS:
      return {
        ...state,
        navigation: {
          ...state.navigation,
          breadcrumbs: action.payload
        }
      };
      
    case ActionTypes.SET_ACTIVE_SECONDARY_TAB:
      return {
        ...state,
        navigation: {
          ...state.navigation,
          activeSecondaryTab: action.payload
        }
      };
      
    case ActionTypes.ADD_RECENT_FILE:
      return {
        ...state,
        navigation: {
          ...state.navigation,
          recentFiles: [
            action.payload,
            ...state.navigation.recentFiles.filter(f => f !== action.payload)
          ].slice(0, 10)
        }
      };
      
    // UI actions
    case ActionTypes.SET_ACTIVE_TAB:
      return {
        ...state,
        ui: {
          ...state.ui,
          activeTab: action.payload
        }
      };
      
    case ActionTypes.SET_PREVIEW_MODE:
      return {
        ...state,
        ui: {
          ...state.ui,
          previewMode: action.payload
        }
      };
      
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        ui: {
          ...state.ui,
          loading: action.payload
        }
      };
      
    case ActionTypes.SET_SAVING:
      return {
        ...state,
        ui: {
          ...state.ui,
          saving: action.payload
        }
      };
      
    case ActionTypes.SET_UI_ERROR:
      return {
        ...state,
        ui: {
          ...state.ui,
          error: action.payload
        }
      };
      
    case ActionTypes.CLEAR_UI_ERROR:
      return {
        ...state,
        ui: {
          ...state.ui,
          error: null
        }
      };
      
    default:
      return state;
  }
}

// Create contexts
const EditorStateContext = createContext();
const EditorDispatchContext = createContext();

// Provider component
export function EditorProvider({ children, owner, repo }) {
  const [state, dispatch] = useReducer(editorReducer, {
    ...initialState,
    repository: {
      ...initialState.repository,
      owner,
      name: repo
    }
  });

  // Initialize breadcrumbs based on owner/repo
  useEffect(() => {
    if (owner && repo) {
      const breadcrumbs = [
        { label: 'Home', href: '/', icon: '🏠' },
        { label: owner, href: `/user/${owner}`, icon: '👤' },
        { label: repo, href: `/editor/${owner}/${repo}`, icon: '📁', active: true }
      ];
      
      dispatch({
        type: ActionTypes.SET_BREADCRUMBS,
        payload: breadcrumbs
      });
    }
  }, [owner, repo]);

  return (
    <EditorStateContext.Provider value={state}>
      <EditorDispatchContext.Provider value={dispatch}>
        {children}
      </EditorDispatchContext.Provider>
    </EditorStateContext.Provider>
  );
}

// Custom hooks for using the context
export function useEditorState() {
  const context = useContext(EditorStateContext);
  if (context === undefined) {
    throw new Error('useEditorState must be used within an EditorProvider');
  }
  return context;
}

export function useEditorDispatch() {
  const context = useContext(EditorDispatchContext);
  if (context === undefined) {
    throw new Error('useEditorDispatch must be used within an EditorProvider');
  }
  return context;
}

// Combined hook for convenience
export function useEditor() {
  return {
    state: useEditorState(),
    dispatch: useEditorDispatch()
  };
}

// Action creators
export const editorActions = {
  // Repository actions
  setRepository: (repository) => ({
    type: ActionTypes.SET_REPOSITORY,
    payload: repository
  }),
  
  setRepositoryLoading: (loading) => ({
    type: ActionTypes.SET_REPOSITORY_LOADING,
    payload: loading
  }),
  
  setRepositoryError: (error) => ({
    type: ActionTypes.SET_REPOSITORY_ERROR,
    payload: error
  }),
  
  // Content actions
  setContentFiles: (files) => ({
    type: ActionTypes.SET_CONTENT_FILES,
    payload: files
  }),
  
  setCurrentFile: (filePath) => ({
    type: ActionTypes.SET_CURRENT_FILE,
    payload: filePath
  }),
  
  updateFileContent: (path, content) => ({
    type: ActionTypes.UPDATE_FILE_CONTENT,
    payload: { path, content }
  }),
  
  setUnsavedChanges: (path, changes) => ({
    type: ActionTypes.SET_UNSAVED_CHANGES,
    payload: { path, changes }
  }),
  
  clearUnsavedChanges: (path) => ({
    type: ActionTypes.CLEAR_UNSAVED_CHANGES,
    payload: path
  }),
  
  setContentLoading: (loading) => ({
    type: ActionTypes.SET_CONTENT_LOADING,
    payload: loading
  }),
  
  setContentError: (error) => ({
    type: ActionTypes.SET_CONTENT_ERROR,
    payload: error
  }),
  
  // Sync actions
  setSyncStatus: (status) => ({
    type: ActionTypes.SET_SYNC_STATUS,
    payload: status
  }),
  
  setConflicts: (conflicts) => ({
    type: ActionTypes.SET_CONFLICTS,
    payload: conflicts
  }),
  
  clearConflicts: () => ({
    type: ActionTypes.CLEAR_CONFLICTS
  }),
  
  setSyncChecking: (checking) => ({
    type: ActionTypes.SET_SYNC_CHECKING,
    payload: checking
  }),
  
  setSyncError: (error) => ({
    type: ActionTypes.SET_SYNC_ERROR,
    payload: error
  }),
  
  // Navigation actions
  toggleSidebar: () => ({
    type: ActionTypes.TOGGLE_SIDEBAR
  }),
  
  setCurrentPath: (path) => ({
    type: ActionTypes.SET_CURRENT_PATH,
    payload: path
  }),
  
  setBreadcrumbs: (breadcrumbs) => ({
    type: ActionTypes.SET_BREADCRUMBS,
    payload: breadcrumbs
  }),
  
  setActiveSecondaryTab: (tab) => ({
    type: ActionTypes.SET_ACTIVE_SECONDARY_TAB,
    payload: tab
  }),
  
  addRecentFile: (filePath) => ({
    type: ActionTypes.ADD_RECENT_FILE,
    payload: filePath
  }),
  
  // UI actions
  setActiveTab: (tab) => ({
    type: ActionTypes.SET_ACTIVE_TAB,
    payload: tab
  }),
  
  setPreviewMode: (enabled) => ({
    type: ActionTypes.SET_PREVIEW_MODE,
    payload: enabled
  }),
  
  setLoading: (loading) => ({
    type: ActionTypes.SET_LOADING,
    payload: loading
  }),
  
  setSaving: (saving) => ({
    type: ActionTypes.SET_SAVING,
    payload: saving
  }),
  
  setUIError: (error) => ({
    type: ActionTypes.SET_UI_ERROR,
    payload: error
  }),
  
  clearUIError: () => ({
    type: ActionTypes.CLEAR_UI_ERROR
  })
};

export { ActionTypes };