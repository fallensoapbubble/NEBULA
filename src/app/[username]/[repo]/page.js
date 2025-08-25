/**
 * Dynamic Portfolio Route Handler
 * Renders portfolios directly from GitHub repositories at /[username]/[repo]
 */

import { notFound } from 'next/navigation';
import { PortfolioRenderer } from '../../../../components/portfolio/PortfolioRenderer';
import { GitHubPortfolioService } from '../../../../lib/github-portfolio-service';

/**
 * Generate metadata for the portfolio page
 */
export async function generateMetadata({ params }) {
  const { username, repo } = params;
  
  try {
    const portfolioService = new GitHubPortfolioService();
    const portfolioData = await portfolioService.getPortfolioData(username, repo);
    
    if (!portfolioData.success) {
      return {
        title: `${username}/${repo} - Portfolio Not Found`,
        description: 'Portfolio repository not found or not accessible'
      };
    }

    const { data } = portfolioData;
    
    return {
      title: data.title || `${data.name || username}'s Portfolio`,
      description: data.description || `Portfolio of ${data.name || username}`,
      openGraph: {
        title: data.title || `${data.name || username}'s Portfolio`,
        description: data.description || `Portfolio of ${data.name || username}`,
        type: 'website',
        url: `https://nebula-mu-henna.vercel.app/${username}/${repo}`,
        images: data.avatar || data.image ? [{
          url: data.avatar || data.image,
          width: 400,
          height: 400,
          alt: `${data.name || username}'s avatar`
        }] : []
      },
      twitter: {
        card: 'summary',
        title: data.title || `${data.name || username}'s Portfolio`,
        description: data.description || `Portfolio of ${data.name || username}`,
        images: data.avatar || data.image ? [data.avatar || data.image] : []
      }
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: `${username}/${repo} - Portfolio`,
      description: `Portfolio repository ${username}/${repo}`
    };
  }
}

/**
 * Portfolio page component
 */
export default async function PortfolioPage({ params }) {
  const { username, repo } = params;
  
  try {
    // Validate GitHub username and repository name format
    if (!isValidGitHubUsername(username) || !isValidRepositoryName(repo)) {
      notFound();
    }

    // Initialize services
    const portfolioService = new GitHubPortfolioService();
    const { PortfolioNavigationService } = await import('@/lib/portfolio-navigation-service');
    const navigationService = new PortfolioNavigationService();
    
    // Fetch portfolio data and navigation structure
    const [portfolioResult, navigationResult] = await Promise.all([
      portfolioService.getEnhancedPortfolioData(username, repo),
      navigationService.getNavigationStructure(username, repo)
    ]);
    
    if (!portfolioResult.success) {
      // Handle different error types
      if (portfolioResult.error === 'repository_not_found') {
        notFound();
      }
      
      if (portfolioResult.error === 'repository_private') {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md mx-auto text-center">
              <div className="mb-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">Repository is Private</h1>
              <p className="text-gray-600 mb-4">
                The repository <span className="font-mono">{username}/{repo}</span> is private and cannot be accessed.
              </p>
              <p className="text-sm text-gray-500">
                Make the repository public to display it as a portfolio.
              </p>
            </div>
          </div>
        );
      }
      
      if (portfolioResult.error === 'user_not_found') {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md mx-auto text-center">
              <div className="mb-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">User Not Found</h1>
              <p className="text-gray-600 mb-4">
                The GitHub user <span className="font-mono">{username}</span> does not exist.
              </p>
              <p className="text-sm text-gray-500">
                Please check the username and try again.
              </p>
            </div>
          </div>
        );
      }
      
      // Generic error fallback
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md mx-auto text-center">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Portfolio Unavailable</h1>
            <p className="text-gray-600 mb-4">
              Unable to load portfolio from <span className="font-mono">{username}/{repo}</span>
            </p>
            <p className="text-sm text-gray-500">
              {portfolioResult.message || 'Please try again later or check if the repository exists and is public.'}
            </p>
          </div>
        </div>
      );
    }

    // Render the portfolio with fetched data
    return (
      <PortfolioRenderer 
        portfolioData={portfolioResult.data}
        repository={{ owner: username, name: repo, url: `https://github.com/${username}/${repo}` }}
        navigation={navigationResult.success ? navigationResult.navigation : null}
      />
    );
    
  } catch (error) {
    console.error('Portfolio page error:', error);
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Something Went Wrong</h1>
            <p className="text-gray-600 mb-4">
              An unexpected error occurred while loading the portfolio.
            </p>
            <p className="text-sm text-gray-500">
              Please try refreshing the page or contact support if the problem persists.
            </p>
          </div>
        </div>
      );
    }
}

/**
 * Validate GitHub username format
 * @param {string} username - GitHub username to validate
 * @returns {boolean} True if valid
 */
function isValidGitHubUsername(username) {
  // GitHub username rules:
  // - May only contain alphanumeric characters or single hyphens
  // - Cannot begin or end with a hyphen
  // - Maximum 39 characters
  const githubUsernameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
  return githubUsernameRegex.test(username);
}

/**
 * Validate GitHub repository name format
 * @param {string} repoName - Repository name to validate
 * @returns {boolean} True if valid
 */
function isValidRepositoryName(repoName) {
  // GitHub repository name rules:
  // - Can contain alphanumeric characters, hyphens, underscores, and periods
  // - Cannot start with a period or hyphen
  // - Maximum 100 characters
  const githubRepoRegex = /^[a-zA-Z0-9_][a-zA-Z0-9._-]{0,99}$/;
  return githubRepoRegex.test(repoName);
}