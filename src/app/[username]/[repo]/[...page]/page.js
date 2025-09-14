/**
 * Dynamic Portfolio Page Route Handler
 * Handles multi-page portfolios with /[username]/[repo]/[page] structure
 * Supports automatic menu generation from repository file structure
 */

import { notFound } from "next/navigation";
import { PortfolioPageRenderer } from "../../../../../components/portfolio/PortfolioPageRenderer";
import { GitHubPortfolioService } from "../../../../../lib/github-portfolio-service";
import { PortfolioNavigationService } from "../../../../../lib/portfolio-navigation-service";

/**
 * Generate metadata for the portfolio page
 */
export async function generateMetadata({ params }) {
  const { username, repo, page } = params;
  const pagePath = Array.isArray(page) ? page.join("/") : page;

  try {
    const portfolioService = new GitHubPortfolioService();
    const navigationService = new PortfolioNavigationService();

    // Get portfolio data and navigation structure
    const [portfolioResult, navigationResult] = await Promise.all([
      portfolioService.getPortfolioData(username, repo),
      navigationService.getNavigationStructure(username, repo),
    ]);

    if (!portfolioResult.success) {
      return {
        title: `${username}/${repo}/${pagePath} - Page Not Found`,
        description: "Portfolio page not found or not accessible",
      };
    }

    const { data } = portfolioResult;
    const pageInfo = navigationResult.success
      ? navigationService.getPageInfo(pagePath, navigationResult.navigation)
      : null;

    const pageTitle = pageInfo?.title || pagePath || "Page";

    return {
      title: `${pageTitle} - ${data.name || username}'s Portfolio`,
      description:
        pageInfo?.description ||
        data.description ||
        `${pageTitle} page of ${data.name || username}'s portfolio`,
      openGraph: {
        title: `${pageTitle} - ${data.name || username}'s Portfolio`,
        description:
          pageInfo?.description ||
          data.description ||
          `${pageTitle} page of ${data.name || username}'s portfolio`,
        type: "website",
        url: `https://nebula-mu-henna.vercel.app/${username}/${repo}/${pagePath}`,
        images:
          data.avatar || data.image
            ? [
                {
                  url: data.avatar || data.image,
                  width: 400,
                  height: 400,
                  alt: `${data.name || username}'s avatar`,
                },
              ]
            : [],
      },
    };
  } catch (error) {
    console.error("Error generating page metadata:", error);
    return {
      title: `${username}/${repo}/${pagePath} - Portfolio Page`,
      description: `Portfolio page ${pagePath} for ${username}/${repo}`,
    };
  }
}

/**
 * Portfolio page component
 */
export default async function PortfolioPageRoute({ params }) {
  const { username, repo, page } = params;
  const pagePath = Array.isArray(page) ? page.join("/") : page;

  try {
    // Validate GitHub username and repository name format
    if (!isValidGitHubUsername(username) || !isValidRepositoryName(repo)) {
      notFound();
    }

    // Initialize services
    const portfolioService = new GitHubPortfolioService();
    const navigationService = new PortfolioNavigationService();

    // Get portfolio data and navigation structure
    const [portfolioResult, navigationResult] = await Promise.all([
      portfolioService.getEnhancedPortfolioData(username, repo),
      navigationService.getNavigationStructure(username, repo),
    ]);

    if (!portfolioResult.success) {
      return handlePortfolioError(portfolioResult, username, repo, pagePath);
    }

    if (!navigationResult.success) {
      // If navigation fails, redirect to main portfolio page
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md mx-auto text-center">
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-yellow-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Page Navigation Unavailable
            </h1>
            <p className="text-gray-600 mb-4">
              Unable to load page navigation for{" "}
              <span className="font-mono">
                {username}/{repo}
              </span>
            </p>
            <a
              href={`/${username}/${repo}`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Main Portfolio
            </a>
          </div>
        </div>
      );
    }

    // Check if the requested page exists
    const pageExists = navigationService.pageExists(
      pagePath,
      navigationResult.navigation
    );
    if (!pageExists) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md mx-auto text-center">
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Page Not Found
            </h1>
            <p className="text-gray-600 mb-4">
              The page <span className="font-mono">{pagePath}</span> does not
              exist in this portfolio.
            </p>
            <div className="space-y-2">
              <a
                href={`/${username}/${repo}`}
                className="block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Main Portfolio
              </a>
              {navigationResult.navigation.pages.length > 0 && (
                <details className="mt-4">
                  <summary className="text-sm text-gray-500 cursor-pointer">
                    Available Pages
                  </summary>
                  <ul className="mt-2 text-sm text-gray-600">
                    {navigationResult.navigation.pages.map((page, index) => (
                      <li key={index}>
                        <a
                          href={`/${username}/${repo}/${page.path}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {page.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Get page content
    const pageContent = await navigationService.getPageContent(
      username,
      repo,
      pagePath
    );

    // Render the portfolio page
    return (
      <PortfolioPageRenderer
        portfolioData={portfolioResult.data}
        repository={{ owner: username, name: repo }}
        navigation={navigationResult.navigation}
        currentPage={pagePath}
        pageContent={pageContent}
        suggestions={portfolioResult.suggestions}
      />
    );
  } catch (error) {
    console.error("Portfolio page error:", error);
  }
}

/**
 * Handle portfolio errors
 */
function handlePortfolioError(portfolioResult, username, repo, pagePath) {
  if (portfolioResult.error === "repository_not_found") {
    notFound();
  }

  if (portfolioResult.error === "repository_private") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Repository is Private
          </h1>
          <p className="text-gray-600 mb-4">
            The repository{" "}
            <span className="font-mono">
              {username}/{repo}
            </span>{" "}
            is private and cannot be accessed.
          </p>
        </div>
      </div>
    );
  }

  if (portfolioResult.error === "user_not_found") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            User Not Found
          </h1>
          <p className="text-gray-600 mb-4">
            The GitHub user <span className="font-mono">{username}</span> does
            not exist.
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
          <svg
            className="mx-auto h-12 w-12 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Portfolio Unavailable
        </h1>
        <p className="text-gray-600 mb-4">
          Unable to load portfolio page from{" "}
          <span className="font-mono">
            {username}/{repo}/{pagePath}
          </span>
        </p>
        <p className="text-sm text-gray-500">
          {portfolioResult.message ||
            "Please try again later or check if the repository exists and is public."}
        </p>
      </div>
    </div>
  );
}

/**
 * Validate GitHub username format
 * @param {string} username - GitHub username to validate
 * @returns {boolean} True if valid
 */
function isValidGitHubUsername(username) {
  const githubUsernameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
  return githubUsernameRegex.test(username);
}

/**
 * Validate GitHub repository name format
 * @param {string} repoName - Repository name to validate
 * @returns {boolean} True if valid
 */
function isValidRepositoryName(repoName) {
  const githubRepoRegex = /^[a-zA-Z0-9_][a-zA-Z0-9._-]{0,99}$/;
  return githubRepoRegex.test(repoName);
}
