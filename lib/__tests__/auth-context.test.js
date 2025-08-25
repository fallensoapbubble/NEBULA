import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth, useAuthGuard, withAuth } from '../auth-context.js';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }) => children,
  useSession: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn()
}));

describe('Authentication Context', () => {
  let mockUseSession, mockSignIn, mockSignOut;

  beforeEach(() => {
    const { useSession, signIn, signOut } = require('next-auth/react');
    mockUseSession = useSession;
    mockSignIn = signIn;
    mockSignOut = signOut;
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AuthProvider', () => {
    it('should render children', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated'
      });

      render(
        <AuthProvider>
          <div data-testid="child">Test Child</div>
        </AuthProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });
  });

  describe('useAuth hook', () => {
    const TestComponent = () => {
      const auth = useAuth();
      return (
        <div>
          <div data-testid="loading">{auth.isLoading.toString()}</div>
          <div data-testid="authenticated">{auth.isAuthenticated.toString()}</div>
          <div data-testid="ready">{auth.isReady.toString()}</div>
          {auth.user && <div data-testid="username">{auth.user.login}</div>}
          {auth.error && <div data-testid="error">{auth.error}</div>}
        </div>
      );
    };

    it('should show loading state initially', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading'
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('true');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('ready')).toHaveTextContent('false');
    });

    it('should show authenticated state with user data', () => {
      const mockSession = {
        user: {
          id: '12345',
          login: 'testuser',
          name: 'Test User',
          email: 'test@example.com',
          image: 'https://github.com/avatar.jpg',
          html_url: 'https://github.com/testuser'
        },
        accessToken: 'access-token'
      };

      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('ready')).toHaveTextContent('true');
      expect(screen.getByTestId('username')).toHaveTextContent('testuser');
    });

    it('should show unauthenticated state', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated'
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('ready')).toHaveTextContent('true');
    });

    it('should handle token refresh error', () => {
      const mockSession = {
        user: { id: '12345', login: 'testuser' },
        error: 'RefreshAccessTokenError'
      };

      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('error')).toHaveTextContent('Token refresh failed. Please sign in again.');
    });

    it('should throw error when used outside AuthProvider', () => {
      const TestComponentOutside = () => {
        useAuth();
        return <div>Test</div>;
      };

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponentOutside />);
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Authentication actions', () => {
    const TestComponent = () => {
      const auth = useAuth();
      return (
        <div>
          <button onClick={() => auth.login('/dashboard')} data-testid="login">
            Login
          </button>
          <button onClick={() => auth.logout('/home')} data-testid="logout">
            Logout
          </button>
          <button onClick={auth.clearError} data-testid="clear-error">
            Clear Error
          </button>
          {auth.error && <div data-testid="error">{auth.error}</div>}
        </div>
      );
    };

    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '12345', login: 'testuser' },
          accessToken: 'token'
        },
        status: 'authenticated'
      });
    });

    it('should call signIn with correct parameters', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByTestId('login').click();
      });

      expect(mockSignIn).toHaveBeenCalledWith('github', { callbackUrl: '/dashboard' });
    });

    it('should call signOut with correct parameters', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByTestId('logout').click();
      });

      expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/home' });
    });

    it('should handle login error', async () => {
      mockSignIn.mockRejectedValue(new Error('Login failed'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByTestId('login').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Failed to initiate login');
      });
    });

    it('should handle logout error', async () => {
      mockSignOut.mockRejectedValue(new Error('Logout failed'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByTestId('logout').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Failed to logout');
      });
    });

    it('should clear error', async () => {
      // First trigger an error
      mockSignIn.mockRejectedValue(new Error('Login failed'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByTestId('login').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
      });

      // Then clear it
      await act(async () => {
        screen.getByTestId('clear-error').click();
      });

      expect(screen.queryByTestId('error')).not.toBeInTheDocument();
    });
  });

  describe('Permission checking', () => {
    const TestComponent = () => {
      const auth = useAuth();
      return (
        <div>
          <div data-testid="has-public">{auth.hasPermission(['public_repo']).toString()}</div>
          <div data-testid="has-private">{auth.hasPermission(['repo']).toString()}</div>
          <div data-testid="can-access-public">{auth.canAccessPublicRepos.toString()}</div>
          <div data-testid="can-access-private">{auth.canAccessPrivateRepos.toString()}</div>
        </div>
      );
    };

    it('should check permissions correctly with public_repo scope', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '12345', login: 'testuser' },
          accessToken: 'token'
        },
        status: 'authenticated'
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('has-public')).toHaveTextContent('true');
      expect(screen.getByTestId('has-private')).toHaveTextContent('true'); // repo scope includes public_repo
      expect(screen.getByTestId('can-access-public')).toHaveTextContent('true');
      expect(screen.getByTestId('can-access-private')).toHaveTextContent('true');
    });

    it('should return false for permissions when not authenticated', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated'
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('has-public')).toHaveTextContent('false');
      expect(screen.getByTestId('has-private')).toHaveTextContent('false');
      expect(screen.getByTestId('can-access-public')).toHaveTextContent('false');
      expect(screen.getByTestId('can-access-private')).toHaveTextContent('false');
    });
  });

  describe('useAuthGuard hook', () => {
    const TestComponent = ({ requiredScopes }) => {
      const guard = useAuthGuard(requiredScopes);
      return (
        <div>
          <div data-testid="guard-authenticated">{guard.isAuthenticated.toString()}</div>
          <div data-testid="guard-loading">{guard.isLoading.toString()}</div>
          <div data-testid="guard-permissions">{guard.hasRequiredPermissions.toString()}</div>
        </div>
      );
    };

    it('should redirect to login when not authenticated', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated'
      });

      render(
        <AuthProvider>
          <TestComponent requiredScopes={['public_repo']} />
        </AuthProvider>
      );

      expect(mockSignIn).toHaveBeenCalledWith('github', { callbackUrl: '/' });
    });

    it('should not redirect when authenticated', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '12345', login: 'testuser' },
          accessToken: 'token'
        },
        status: 'authenticated'
      });

      render(
        <AuthProvider>
          <TestComponent requiredScopes={['public_repo']} />
        </AuthProvider>
      );

      expect(mockSignIn).not.toHaveBeenCalled();
      expect(screen.getByTestId('guard-authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('guard-permissions')).toHaveTextContent('true');
    });
  });

  describe('withAuth HOC', () => {
    const MockComponent = ({ testProp }) => (
      <div data-testid="protected-component">Protected: {testProp}</div>
    );

    it('should show loading state', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading'
      });

      const ProtectedComponent = withAuth(MockComponent);

      render(
        <AuthProvider>
          <ProtectedComponent testProp="test" />
        </AuthProvider>
      );

      expect(screen.getByText('Checking authentication...')).toBeInTheDocument();
    });

    it('should render protected component when authenticated', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '12345', login: 'testuser' },
          accessToken: 'token'
        },
        status: 'authenticated'
      });

      const ProtectedComponent = withAuth(MockComponent);

      render(
        <AuthProvider>
          <ProtectedComponent testProp="test" />
        </AuthProvider>
      );

      expect(screen.getByTestId('protected-component')).toHaveTextContent('Protected: test');
    });

    it('should show authentication required when not authenticated', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated'
      });

      const ProtectedComponent = withAuth(MockComponent);

      render(
        <AuthProvider>
          <ProtectedComponent testProp="test" />
        </AuthProvider>
      );

      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(screen.getByText('Login with GitHub')).toBeInTheDocument();
    });

    it('should show insufficient permissions error', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '12345', login: 'testuser' },
          accessToken: 'token'
        },
        status: 'authenticated'
      });

      // Mock hasPermission to return false for required scopes
      const ProtectedComponent = withAuth(MockComponent, ['admin']);

      render(
        <AuthProvider>
          <ProtectedComponent testProp="test" />
        </AuthProvider>
      );

      expect(screen.getByText('Insufficient Permissions')).toBeInTheDocument();
      expect(screen.getByText(/This page requires additional GitHub permissions: admin/)).toBeInTheDocument();
    });
  });
});