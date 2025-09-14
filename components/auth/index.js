// Authentication Components
export { default as LoginButton } from './LoginButton.js';
export { default as UserMenu } from './UserMenu.js';
export { default as AuthGuard, RequireAuth } from './AuthGuard.js';
export { default as AuthStatus } from './AuthStatus.js';

// Authentication Context and Hooks
export { 
  AuthProvider, 
  useAuth, 
  useAuthGuard, 
  withAuth 
} from '../../lib/auth-context.js';

export {
  useAuthState,
  useGitHubAPI,
  useUserProfile,
  usePermissions,
  useAuthError,
  useRateLimit
} from '../../lib/auth-hooks.js';

// Authentication Utilities
export {
  validateGitHubToken,
  refreshGitHubToken,
  getUserSession,
  isSessionValid,
  hasRequiredPermissions,
  createGitHubClient,
  clearUserSession
} from '../../lib/github-auth.js';