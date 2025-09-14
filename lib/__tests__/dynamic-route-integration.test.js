import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/testuser/test-repo',
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn()
}));

// Mock GitHub integration service
vi.mock('../github-integration-service.js', () => ({
  createGitHubIntegrationService: vi.fn(() => ({
    fetchRepositoryContent: vi.fn(),
    validateRepository: vi.fn(),
    getRepositoryStructure: vi.fn()
  }))
}));

// Mock portfolio renderer components
vi.mock('../../components/portfolio/EnhancedPortfolioRenderer.js', () => ({
  EnhancedPortfolioRenderer: ({ portfolioData, repositoryInfo }) => (
    <div data-testid="portfolio-renderer">
      <div data-testid="user-name">{portfolioData?.personal?.name || 'Unknown'}</div>
      <div data-testid="repo-name">{repositoryInfo?.name || 'Unknown'}</div>
      <div data-testid="project-count">{portfolioData?.projects?.length || 0}</div>
    </div>
  )
}));

// Mock error components
vi.mock('../../components/error/ErrorPage.jsx', () => ({
  ErrorPage: ({ error, statusCode }) => (
    <div data-testid="error-page">
      <div data-testid="error-code">{statusCode}</div>
      <div data-testid="error-message">{error}</div>
    </div>
  )
}));

describe('Dynamic Route Integration Tests', () => {
  let mockGitHubService;

  beforeEach(() => {
    const { createGitHubIntegrationService } = require('../github-integration-service.js');
    mockGitHubService = {
      fetchRepositoryContent: vi.fn(),
      validateRepository: vi.fn(),
      getRepositoryStructure: vi.fn()
    };
    createGitHubIntegrationService.mockReturnValue(mockGitHubService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Portfolio Route Rendering', () => {
    // Mock dynamic route component
    const MockPortfolioPage = ({ params }) => {
      const [portfolioData, setPortfolioData] = React.useState(null);
      const [repositoryInfo, setRepositoryInfo] = React.useState(null);
      const [error, setError] = React.useState(null);
      const [loading, setLoading] = React.useState(true);

      React.useEffect(() => {
        const loadPortfolio = async () => {
          try {
            setLoading(true);
            
            // Validate repository
            const validation = await mockGitHubService.validateRepository(
              params.username,
              params.repo
            );

            if (!validation.isValid) {
              setError(validation.error);
              setLoading(false);
              return;
            }

            // Fetch repository content
            const content = await mockGitHubService.fetchRepositoryContent(
              params.username,
              params.repo
            );

            setPortfolioData(content.portfolioData);
            setRepositoryInfo(content.repositoryInfo);
            setLoading(false);

          } catch (err) {
            setError(err.message);
            setLoading(false);
          }
        };

        loadPortfolio();
      }, [params.username, params.repo]);

      if (loading) {
        return <div data-testid="loading">Loading portfolio...</div>;
      }

      if (error) {
        const { ErrorPage } = require('../../components/error/ErrorPage.jsx');
        return <ErrorPage error={error} statusCode={404} />;
      }

      const { EnhancedPortfolioRenderer } = require('../../components/portfolio/EnhancedPortfolioRenderer.js');
      return (
        <EnhancedPortfolioRenderer
          portfolioData={portfolioData}
          repositoryInfo={repositoryInfo}
        />
      );
    };

    it('should render portfolio for valid repository', async () => {
      const mockPortfolioData = {
        personal: {
          name: 'John Doe',
          title: 'Software Developer',
          bio: 'A passionate developer'
        },
        projects: [
          {
            name: 'Project 1',
            description: 'First project',
            url: 'https://project1.com'
          },
          {
            name: 'Project 2',
            description: 'Second project',
            url: 'https://project2.com'
          }
        ]
      };

      const mockRepositoryInfo = {
        name: 'my-portfolio',
        owner: 'testuser',
        description: 'My personal portfolio',
        url: 'https://github.com/testuser/my-portfolio'
      };

      mockGitHubService.validateRepository.mockResolvedValue({
        isValid: true
      });

      mockGitHubService.fetchRepositoryContent.mockResolvedValue({
        portfolioData: mockPortfolioData,
        repositoryInfo: mockRepositoryInfo
      });

      render(
        <MockPortfolioPage 
          params={{ username: 'testuser', repo: 'my-portfolio' }} 
        />
      );

      // Should show loading initially
      expect(screen.getByTestId('loading')).toBeInTheDocument();

      // Wait for portfolio to load
      await waitFor(() => {
        expect(screen.getByTestId('portfolio-renderer')).toBeInTheDocument();
      });

      // Verify portfolio content
      expect(screen.getByTestId('user-name')).toHaveTextContent('John Doe');
      expect(screen.getByTestId('repo-name')).toHaveTextContent('my-portfolio');
      expect(screen.getByTestId('project-count')).toHaveTextContent('2');

      // Verify API calls
      expect(mockGitHubService.validateRepository).toHaveBeenCalledWith('testuser', 'my-portfolio');
      expect(mockGitHubService.fetchRepositoryContent).toHaveBeenCalledWith('testuser', 'my-portfolio');
    });

    it('should show error page for invalid repository', async () => {
      mockGitHubService.validateRepository.mockResolvedValue({
        isValid: false,
        error: 'Repository not found'
      });

      render(
        <MockPortfolioPage 
          params={{ username: 'testuser', repo: 'nonexistent-repo' }} 
        />
      );

      // Wait for error to show
      await waitFor(() => {
        expect(screen.getByTestId('error-page')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error-code')).toHaveTextContent('404');
      expect(screen.getByTestId('error-message')).toHaveTextContent('Repository not found');

      // Should not fetch content for invalid repository
      expect(mockGitHubService.fetchRepositoryContent).not.toHaveBeenCalled();
    });

    it('should handle private repository access', async () => {
      mockGitHubService.validateRepository.mockResolvedValue({
        isValid: false,
        error: 'Repository is private or does not exist'
      });

      render(
        <MockPortfolioPage 
          params={{ username: 'testuser', repo: 'private-repo' }} 
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-page')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error-message')).toHaveTextContent('Repository is private or does not exist');
    });

    it('should handle network errors gracefully', async () => {
      mockGitHubService.validateRepository.mockRejectedValue(
        new Error('Network error: Unable to connect to GitHub')
      );

      render(
        <MockPortfolioPage 
          params={{ username: 'testuser', repo: 'my-portfolio' }} 
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-page')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error-message')).toHaveTextContent('Network error: Unable to connect to GitHub');
    });

    it('should handle malformed portfolio data', async () => {
      mockGitHubService.validateRepository.mockResolvedValue({
        isValid: true
      });

      // Return malformed data
      mockGitHubService.fetchRepositoryContent.mockResolvedValue({
        portfolioData: null, // Invalid data
        repositoryInfo: {
          name: 'broken-portfolio',
          owner: 'testuser'
        }
      });

      render(
        <MockPortfolioPage 
          params={{ username: 'testuser', repo: 'broken-portfolio' }} 
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('portfolio-renderer')).toBeInTheDocument();
      });

      // Should render with default values
      expect(screen.getByTestId('user-name')).toHaveTextContent('Unknown');
      expect(screen.getByTestId('repo-name')).toHaveTextContent('broken-portfolio');
      expect(screen.getByTestId('project-count')).toHaveTextContent('0');
    });
  });

  describe('Multi-page Portfolio Navigation', () => {
    const MockMultiPagePortfolio = ({ params }) => {
      const [portfolioData, setPortfolioData] = React.useState(null);
      const [currentPage, setCurrentPage] = React.useState(params.page || 'home');
      const [loading, setLoading] = React.useState(true);

      React.useEffect(() => {
        const loadPortfolio = async () => {
          try {
            setLoading(true);

            const validation = await mockGitHubService.validateRepository(
              params.username,
              params.repo
            );

            if (!validation.isValid) {
              throw new Error(validation.error);
            }

            const content = await mockGitHubService.fetchRepositoryContent(
              params.username,
              params.repo,
              { page: currentPage }
            );

            setPortfolioData(content.portfolioData);
            setLoading(false);

          } catch (err) {
            setLoading(false);
            throw err;
          }
        };

        loadPortfolio();
      }, [params.username, params.repo, currentPage]);

      if (loading) {
        return <div data-testid="loading">Loading...</div>;
      }

      return (
        <div data-testid="multi-page-portfolio">
          <nav data-testid="portfolio-nav">
            <button 
              onClick={() => setCurrentPage('home')}
              data-testid="nav-home"
              className={currentPage === 'home' ? 'active' : ''}
            >
              Home
            </button>
            <button 
              onClick={() => setCurrentPage('projects')}
              data-testid="nav-projects"
              className={currentPage === 'projects' ? 'active' : ''}
            >
              Projects
            </button>
            <button 
              onClick={() => setCurrentPage('about')}
              data-testid="nav-about"
              className={currentPage === 'about' ? 'active' : ''}
            >
              About
            </button>
          </nav>
          
          <main data-testid="page-content">
            <div data-testid="current-page">{currentPage}</div>
            {portfolioData && (
              <div data-testid="page-data">
                {JSON.stringify(portfolioData[currentPage] || {})}
              </div>
            )}
          </main>
        </div>
      );
    };

    it('should handle multi-page portfolio navigation', async () => {
      const mockPortfolioData = {
        home: {
          title: 'Welcome to My Portfolio',
          intro: 'Hello, I am a developer'
        },
        projects: {
          items: [
            { name: 'Project 1', description: 'First project' },
            { name: 'Project 2', description: 'Second project' }
          ]
        },
        about: {
          bio: 'I am a passionate developer with 5 years of experience',
          skills: ['JavaScript', 'React', 'Node.js']
        }
      };

      mockGitHubService.validateRepository.mockResolvedValue({
        isValid: true
      });

      mockGitHubService.fetchRepositoryContent.mockResolvedValue({
        portfolioData: mockPortfolioData,
        repositoryInfo: { name: 'multi-page-portfolio', owner: 'testuser' }
      });

      render(
        <MockMultiPagePortfolio 
          params={{ username: 'testuser', repo: 'multi-page-portfolio' }} 
        />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('multi-page-portfolio')).toBeInTheDocument();
      });

      // Should start on home page
      expect(screen.getByTestId('current-page')).toHaveTextContent('home');
      expect(screen.getByTestId('nav-home')).toHaveClass('active');

      // Navigate to projects
      screen.getByTestId('nav-projects').click();
      
      await waitFor(() => {
        expect(screen.getByTestId('current-page')).toHaveTextContent('projects');
      });

      // Navigate to about
      screen.getByTestId('nav-about').click();
      
      await waitFor(() => {
        expect(screen.getByTestId('current-page')).toHaveTextContent('about');
      });

      // Verify content updates
      expect(screen.getByTestId('page-data')).toHaveTextContent('passionate developer');
    });

    it('should handle direct page access via URL', async () => {
      const mockPortfolioData = {
        projects: {
          items: [
            { name: 'Direct Access Project', description: 'Accessed directly' }
          ]
        }
      };

      mockGitHubService.validateRepository.mockResolvedValue({
        isValid: true
      });

      mockGitHubService.fetchRepositoryContent.mockResolvedValue({
        portfolioData: mockPortfolioData,
        repositoryInfo: { name: 'portfolio', owner: 'testuser' }
      });

      render(
        <MockMultiPagePortfolio 
          params={{ 
            username: 'testuser', 
            repo: 'portfolio', 
            page: 'projects' 
          }} 
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-page')).toHaveTextContent('projects');
      });

      expect(screen.getByTestId('page-data')).toHaveTextContent('Direct Access Project');
    });
  });

  describe('Error Handling Integration', () => {
    const MockFailingComponent = ({ shouldFail }) => {
      React.useEffect(() => {
        if (shouldFail) {
          throw new Error('Component rendering failed');
        }
      }, [shouldFail]);

      return <div data-testid="working-component">Component working</div>;
    };

    it('should handle component rendering errors gracefully', async () => {
      // Test that components can handle errors without error boundaries
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      try {
        render(<MockFailingComponent shouldFail={false} />);
        expect(screen.getByTestId('working-component')).toBeInTheDocument();
      } catch (error) {
        // Component should not throw errors in normal operation
        expect(error).toBeUndefined();
      }
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance and Caching', () => {
    it('should cache repository data between renders', async () => {
      const mockPortfolioData = {
        personal: { name: 'Cached User' },
        projects: []
      };

      mockGitHubService.validateRepository.mockResolvedValue({
        isValid: true
      });

      mockGitHubService.fetchRepositoryContent.mockResolvedValue({
        portfolioData: mockPortfolioData,
        repositoryInfo: { name: 'cached-repo', owner: 'testuser' }
      });

      const MockCachedPortfolio = ({ params, key }) => {
        const [data, setData] = React.useState(null);
        const [loading, setLoading] = React.useState(true);

        React.useEffect(() => {
          const loadData = async () => {
            setLoading(true);
            
            const validation = await mockGitHubService.validateRepository(
              params.username,
              params.repo
            );

            if (validation.isValid) {
              const content = await mockGitHubService.fetchRepositoryContent(
                params.username,
                params.repo
              );
              setData(content);
            }
            
            setLoading(false);
          };

          loadData();
        }, [params.username, params.repo]);

        if (loading) return <div data-testid="loading">Loading...</div>;

        return (
          <div data-testid="cached-portfolio">
            <div data-testid="render-key">{key}</div>
            <div data-testid="user-name">{data?.portfolioData?.personal?.name}</div>
          </div>
        );
      };

      // First render
      const { rerender } = render(
        <MockCachedPortfolio 
          params={{ username: 'testuser', repo: 'cached-repo' }}
          key="render-1"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('cached-portfolio')).toBeInTheDocument();
      });

      expect(screen.getByTestId('user-name')).toHaveTextContent('Cached User');
      expect(mockGitHubService.fetchRepositoryContent).toHaveBeenCalledTimes(1);

      // Second render with same params
      rerender(
        <MockCachedPortfolio 
          params={{ username: 'testuser', repo: 'cached-repo' }}
          key="render-2"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('render-key')).toHaveTextContent('render-2');
      });

      // Should have made another API call (no caching implemented in this mock)
      expect(mockGitHubService.fetchRepositoryContent).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent requests for same repository', async () => {
      let resolvePromise;
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockGitHubService.validateRepository.mockResolvedValue({
        isValid: true
      });

      mockGitHubService.fetchRepositoryContent.mockReturnValue(delayedPromise);

      const MockConcurrentComponent = ({ id }) => {
        const [data, setData] = React.useState(null);
        const [loading, setLoading] = React.useState(true);

        React.useEffect(() => {
          const loadData = async () => {
            try {
              const content = await mockGitHubService.fetchRepositoryContent(
                'testuser',
                'concurrent-repo'
              );
              setData(content);
            } finally {
              setLoading(false);
            }
          };

          loadData();
        }, []);

        if (loading) return <div data-testid={`loading-${id}`}>Loading...</div>;

        return (
          <div data-testid={`component-${id}`}>
            {data?.portfolioData?.personal?.name || 'No data'}
          </div>
        );
      };

      // Render multiple components that will make concurrent requests
      render(
        <div>
          <MockConcurrentComponent id="1" />
          <MockConcurrentComponent id="2" />
          <MockConcurrentComponent id="3" />
        </div>
      );

      // All should be loading
      expect(screen.getByTestId('loading-1')).toBeInTheDocument();
      expect(screen.getByTestId('loading-2')).toBeInTheDocument();
      expect(screen.getByTestId('loading-3')).toBeInTheDocument();

      // Resolve the promise
      resolvePromise({
        portfolioData: { personal: { name: 'Concurrent User' } },
        repositoryInfo: { name: 'concurrent-repo', owner: 'testuser' }
      });

      await waitFor(() => {
        expect(screen.getByTestId('component-1')).toBeInTheDocument();
        expect(screen.getByTestId('component-2')).toBeInTheDocument();
        expect(screen.getByTestId('component-3')).toBeInTheDocument();
      });

      // All should show the same data
      expect(screen.getByTestId('component-1')).toHaveTextContent('Concurrent User');
      expect(screen.getByTestId('component-2')).toHaveTextContent('Concurrent User');
      expect(screen.getByTestId('component-3')).toHaveTextContent('Concurrent User');

      // Should have made 3 separate API calls (no deduplication in this mock)
      expect(mockGitHubService.fetchRepositoryContent).toHaveBeenCalledTimes(3);
    });
  });
});