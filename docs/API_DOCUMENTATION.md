# API Documentation

This document provides comprehensive documentation for the Nebula Portfolio Platform API endpoints.

## Table of Contents

1. [Authentication](#authentication)
2. [Repository Management](#repository-management)
3. [Content Management](#content-management)
4. [Template System](#template-system)
5. [Monitoring](#monitoring)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)

## Authentication

### GitHub OAuth

#### Initiate OAuth Flow
```http
GET /api/auth/github
```

Redirects user to GitHub OAuth authorization page.

**Query Parameters:**
- `redirect_uri` (optional) - Custom redirect URI after authentication

**Response:**
Redirects to GitHub OAuth page

#### OAuth Callback
```http
GET /api/auth/github/callback
```

Handles GitHub OAuth callback and creates user session.

**Query Parameters:**
- `code` - Authorization code from GitHub
- `state` - State parameter for CSRF protection

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "github_user_id",
    "username": "github_username",
    "name": "User Name",
    "avatar_url": "https://avatars.githubusercontent.com/..."
  }
}
```

## Repository Management

### Fork Repository
```http
POST /api/repositories/fork
```

Forks a template repository to the authenticated user's GitHub account.

**Request Body:**
```json
{
  "templateOwner": "template-owner",
  "templateRepo": "portfolio-template",
  "newRepoName": "my-portfolio"
}
```

**Response:**
```json
{
  "success": true,
  "repository": {
    "owner": "username",
    "name": "my-portfolio",
    "full_name": "username/my-portfolio",
    "html_url": "https://github.com/username/my-portfolio",
    "clone_url": "https://github.com/username/my-portfolio.git"
  }
}
```

### Get Repository Information
```http
GET /api/repositories/[owner]/[repo]
```

Retrieves repository information and metadata.

**Response:**
```json
{
  "success": true,
  "repository": {
    "owner": "username",
    "name": "repo-name",
    "description": "Repository description",
    "private": false,
    "default_branch": "main",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "size": 1024,
    "language": "JavaScript"
  }
}
```

### Get Repository Structure
```http
GET /api/repositories/[owner]/[repo]/structure
```

Returns the file tree structure of the repository.

**Response:**
```json
{
  "success": true,
  "structure": [
    {
      "name": "data.json",
      "path": "data.json",
      "type": "file",
      "size": 1024,
      "sha": "abc123..."
    },
    {
      "name": "components",
      "path": "components",
      "type": "dir",
      "children": [...]
    }
  ]
}
```

### Get Sync Status
```http
GET /api/repositories/[owner]/[repo]/status
```

Checks synchronization status between local and remote repository.

**Response:**
```json
{
  "success": true,
  "status": {
    "ahead": 0,
    "behind": 2,
    "conflicts": false,
    "lastSync": "2024-01-01T00:00:00Z",
    "needsUpdate": true
  }
}
```

## Content Management

### Get File Content
```http
GET /api/content/[owner]/[repo]/[...path]
```

Retrieves content of a specific file.

**Response:**
```json
{
  "success": true,
  "file": {
    "name": "data.json",
    "path": "data.json",
    "content": "{ \"name\": \"John Doe\" }",
    "encoding": "base64",
    "sha": "abc123...",
    "size": 1024
  }
}
```

### Update File Content
```http
PUT /api/content/[owner]/[repo]/[...path]
```

Updates content of a specific file.

**Request Body:**
```json
{
  "content": "{ \"name\": \"Jane Doe\" }",
  "message": "Update personal information",
  "sha": "abc123..."
}
```

**Response:**
```json
{
  "success": true,
  "commit": {
    "sha": "def456...",
    "message": "Update personal information",
    "author": {
      "name": "Jane Doe",
      "email": "jane@example.com"
    },
    "date": "2024-01-01T00:00:00Z"
  }
}
```

### Batch Commit
```http
POST /api/content/[owner]/[repo]/commit
```

Commits multiple file changes in a single operation.

**Request Body:**
```json
{
  "message": "Update portfolio content",
  "files": [
    {
      "path": "data.json",
      "content": "{ \"name\": \"John Doe\" }",
      "sha": "abc123..."
    },
    {
      "path": "public/images/avatar.jpg",
      "content": "base64_encoded_image_data",
      "encoding": "base64"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "commit": {
    "sha": "ghi789...",
    "message": "Update portfolio content",
    "files_changed": 2,
    "date": "2024-01-01T00:00:00Z"
  }
}
```

### Get Commit History
```http
GET /api/content/[owner]/[repo]/history
```

Retrieves commit history for the repository.

**Query Parameters:**
- `limit` (optional) - Number of commits to return (default: 10)
- `page` (optional) - Page number for pagination

**Response:**
```json
{
  "success": true,
  "commits": [
    {
      "sha": "abc123...",
      "message": "Update portfolio content",
      "author": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "date": "2024-01-01T00:00:00Z",
      "stats": {
        "additions": 5,
        "deletions": 2,
        "total": 7
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "hasNext": true
  }
}
```

## Template System

### Get Template Gallery
```http
GET /api/templates
```

Retrieves list of available portfolio templates.

**Query Parameters:**
- `category` (optional) - Filter by template category
- `search` (optional) - Search templates by name or description
- `sort` (optional) - Sort order (popular, recent, name)

**Response:**
```json
{
  "success": true,
  "templates": [
    {
      "owner": "template-owner",
      "name": "modern-portfolio",
      "display_name": "Modern Portfolio",
      "description": "A sleek, modern portfolio template",
      "category": "developer",
      "tags": ["modern", "responsive", "dark-mode"],
      "preview_url": "https://raw.githubusercontent.com/.../preview.png",
      "stars": 150,
      "forks": 45,
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50
  }
}
```

### Validate Template
```http
GET /api/templates/[owner]/[repo]/validate
```

Validates template structure and configuration.

**Response:**
```json
{
  "success": true,
  "validation": {
    "valid": true,
    "errors": [],
    "warnings": [
      "Preview image could be higher resolution"
    ],
    "score": 95,
    "checks": {
      "structure": true,
      "config": true,
      "preview": true,
      "documentation": true
    }
  }
}
```

### Analyze Template
```http
POST /api/templates/[owner]/[repo]/analyze
```

Analyzes template structure and generates editing schema.

**Response:**
```json
{
  "success": true,
  "analysis": {
    "templateType": "json",
    "contentFiles": [
      {
        "path": "data.json",
        "type": "json",
        "editable": true,
        "schema": {...}
      }
    ],
    "assets": {
      "images": ["public/images/avatar.jpg"],
      "totalSize": "2.5MB"
    },
    "features": [
      "Dark mode support",
      "Responsive design",
      "SEO optimized"
    ]
  }
}
```

### Get Editing Schema
```http
GET /api/templates/[owner]/[repo]/schema
```

Returns the editing schema for a template.

**Response:**
```json
{
  "success": true,
  "schema": {
    "personalInfo": {
      "type": "object",
      "label": "Personal Information",
      "properties": {
        "name": {
          "type": "string",
          "label": "Full Name",
          "required": true
        }
      }
    }
  }
}
```

## Synchronization

### Check for Conflicts
```http
GET /api/sync/[owner]/[repo]/check
```

Checks for synchronization conflicts.

**Response:**
```json
{
  "success": true,
  "conflicts": {
    "hasConflicts": false,
    "conflictedFiles": [],
    "lastRemoteCommit": "abc123...",
    "lastLocalCommit": "def456..."
  }
}
```

### Resolve Conflicts
```http
POST /api/sync/[owner]/[repo]/resolve
```

Resolves synchronization conflicts.

**Request Body:**
```json
{
  "strategy": "keep_local", // or "keep_remote", "merge"
  "files": [
    {
      "path": "data.json",
      "resolution": "keep_local"
    }
  ]
}
```

### Get Diff
```http
GET /api/sync/[owner]/[repo]/diff
```

Returns differences between local and remote versions.

**Response:**
```json
{
  "success": true,
  "diff": {
    "files": [
      {
        "path": "data.json",
        "status": "modified",
        "additions": 5,
        "deletions": 2,
        "patch": "diff content..."
      }
    ]
  }
}
```

### Pull Remote Updates
```http
POST /api/sync/[owner]/[repo]/pull
```

Pulls updates from remote repository.

**Response:**
```json
{
  "success": true,
  "pull": {
    "updated": true,
    "filesChanged": 3,
    "commits": [
      {
        "sha": "abc123...",
        "message": "Update content"
      }
    ]
  }
}
```

## Monitoring

### Health Check
```http
GET /api/monitoring/health
```

Returns system health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "services": {
    "github": {
      "status": "healthy",
      "rateLimit": {
        "limit": 5000,
        "remaining": 4500,
        "reset": 1640995200
      }
    }
  }
}
```

### Dashboard Data
```http
GET /api/monitoring/dashboard
```

Returns monitoring dashboard data.

**Query Parameters:**
- `timeRange` (optional) - Time range for metrics (1h, 24h, 7d)

**Response:**
```json
{
  "success": true,
  "data": {
    "errors": {
      "total": 5,
      "rate": 0.1
    },
    "performance": {
      "averageResponseTime": 250,
      "p95ResponseTime": 500
    },
    "githubAPI": {
      "requestCount": 1000,
      "errorRate": 0.5,
      "rateLimitStatus": {
        "limit": 5000,
        "remaining": 4000
      }
    }
  }
}
```

### GitHub Usage
```http
GET /api/monitoring/github-usage
```

Returns GitHub API usage statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "usage": {
      "requestCount": 1000,
      "errorRate": 0.5
    },
    "currentRateLimit": {
      "limit": 5000,
      "remaining": 4000,
      "reset": 1640995200
    },
    "recommendations": [
      {
        "type": "warning",
        "message": "Rate limit running low",
        "action": "Implement caching"
      }
    ]
  }
}
```

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "GITHUB_API_ERROR",
    "message": "GitHub API request failed",
    "details": {
      "status": 404,
      "github_message": "Not Found"
    }
  }
}
```

### Common Error Codes

- `AUTHENTICATION_REQUIRED` - User not authenticated
- `INSUFFICIENT_PERMISSIONS` - Missing required GitHub permissions
- `REPOSITORY_NOT_FOUND` - Repository doesn't exist or is private
- `GITHUB_API_ERROR` - GitHub API request failed
- `VALIDATION_ERROR` - Request validation failed
- `RATE_LIMIT_EXCEEDED` - API rate limit exceeded
- `INTERNAL_SERVER_ERROR` - Unexpected server error

## Rate Limiting

The API implements rate limiting to ensure fair usage:

### Limits
- **Authenticated requests**: 1000 requests per hour
- **Unauthenticated requests**: 100 requests per hour
- **GitHub API proxy**: Subject to GitHub's rate limits

### Headers
Rate limit information is included in response headers:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

### Rate Limit Exceeded
When rate limit is exceeded:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 1000,
      "reset": 1640995200
    }
  }
}
```

---

*API Documentation Version: 1.0*
*Last Updated: [Current Date]*