# Design Document

## Overview

The decentralized portfolio platform is built on Next.js 15 with a focus on GitHub integration, template management, and decentralized hosting. The system leverages GitHub as both the authentication provider and content storage backend, enabling users to own their portfolio data completely while providing a seamless editing experience.

The platform follows a serverless architecture deployed on Vercel, with dynamic routing that maps URLs directly to GitHub repositories, creating a truly decentralized hosting solution.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    User[User] --> WebApp[Next.js Web Application]
    WebApp --> GitHub[GitHub API]
    WebApp --> Templates[Template Repository]
    
    subgraph "Core Components"
        Auth[Authentication Service]
        Editor[Web Editor]
        Renderer[Portfolio Renderer]
        Sync[Repository Sync]
    end
    
    subgraph "GitHub Integration"
        OAuth[OAuth Flow]
        RepoAPI[Repository API]
        ContentAPI[Content API]
    end
    
    WebApp --> Auth
    Auth --> OAuth
    Editor --> RepoAPI
    Renderer --> ContentAPI
    Sync --> RepoAPI
    
    subgraph "Decentralized URLs"
        DynamicRoute[/[username]/[repo]]
        StaticAssets[Static Assets]
    end
    
    Renderer --> DynamicRoute
    DynamicRoute --> GitHub
```

### System Flow

1. **Authentication Flow**: Users authenticate via GitHub OAuth with repo permissions
2. **Template Selection**: Users browse and select from available portfolio templates
3. **Repository Forking**: Selected templates are forked to user's GitHub account
4. **Content Editing**: Web-based editor modifies repository content via GitHub API
5. **Live Hosting**: Dynamic routes serve portfolios directly from GitHub repositories

## Components and Interfaces

### 1. Authentication Service

**Purpose**: Manages GitHub OAuth flow and session management

**Key Components**:
- OAuth initiation (`/api/auth/github`)
- OAuth callback handler (`/api/auth/github/callback`)
- Session management with NextAuth.js
- Token storage and refresh

**Interfaces**:
```javascript
// Authentication API
POST /api/auth/github
GET /api/auth/github/callback
GET /api/auth/session
POST /api/auth/signout

// Session Data Structure
{
  user: {
    id: string,
    login: string,
    name: string,
    avatar_url: string
  },
  accessToken: string,
  refreshToken?: string,
  expires: Date
}
```

### 2. Template Management Service

**Purpose**: Manages portfolio template discovery, preview, and forking

**Key Components**:
- Template registry and metadata
- Template preview generation
- Fork operation management
- Template validation

**Interfaces**:
```javascript
// Template API
GET /api/templates
GET /api/templates/by-id/[templateId]
POST /api/templates/[owner]/[repo]/fork

// Template Data Structure
{
  id: string,
  name: string,
  description: string,
  repository: string,
  preview_url: string,
  tags: string[],
  structure: {
    content_files: string[],
    config_files: string[],
    required_fields: string[]
  }
}
```

### 3. Repository Management Service

**Purpose**: Handles GitHub repository operations and content synchronization

**Key Components**:
- Repository forking and creation
- Content file management
- Commit and push operations
- Conflict resolution

**Interfaces**:
```javascript
// Repository API
GET /api/repositories
POST /api/repositories/fork
GET /api/repositories/[owner]/[repo]
PUT /api/repositories/[owner]/[repo]/content
GET /api/repositories/[owner]/[repo]/sync

// Repository Content Structure
{
  path: string,
  content: string,
  sha: string,
  encoding: 'base64' | 'utf-8',
  type: 'file' | 'dir'
}
```

### 4. Web Editor Service

**Purpose**: Provides web-based content editing interface

**Key Components**:
- Repository structure analysis
- Content form generation
- Real-time validation
- Auto-save functionality

**Interfaces**:
```javascript
// Editor API
GET /api/editor/[owner]/[repo]
PUT /api/editor/[owner]/[repo]/save
POST /api/editor/[owner]/[repo]/validate

// Editor Content Structure
{
  repository: string,
  structure: TemplateStructure,
  content: {
    [filePath: string]: {
      type: 'json' | 'markdown' | 'yaml',
      data: any,
      schema?: JSONSchema
    }
  }
}
```

### 5. Portfolio Renderer Service

**Purpose**: Dynamically renders portfolios from GitHub repositories

**Key Components**:
- Dynamic route handler (`/[username]/[repo]`)
- Content fetching and caching
- Template rendering engine
- Error page generation

**Interfaces**:
```javascript
// Dynamic Route Handler
GET /[username]/[repo]
GET /[username]/[repo]/[...path]

// Portfolio Data Structure
{
  repository: {
    owner: string,
    name: string,
    url: string
  },
  template: TemplateStructure,
  content: PortfolioContent,
  metadata: {
    last_updated: Date,
    commit_sha: string
  }
}
```

## Data Models

### User Model
```javascript
{
  id: string,
  github_id: number,
  login: string,
  name: string,
  email: string,
  avatar_url: string,
  access_token: string,
  refresh_token?: string,
  created_at: Date,
  updated_at: Date
}
```

### Template Model
```javascript
{
  id: string,
  name: string,
  description: string,
  repository_url: string,
  preview_url: string,
  tags: string[],
  structure: {
    content_files: string[],
    config_files: string[],
    required_fields: FieldDefinition[]
  },
  metadata: {
    version: string,
    author: string,
    created_at: Date,
    updated_at: Date
  }
}
```

### Portfolio Model
```javascript
{
  repository: {
    owner: string,
    name: string,
    full_name: string,
    url: string,
    private: boolean
  },
  template: {
    id: string,
    version: string
  },
  content: {
    [filePath: string]: any
  },
  metadata: {
    last_commit: string,
    last_updated: Date,
    build_status: 'success' | 'error' | 'pending'
  }
}
```

## Error Handling

### Error Categories

1. **Authentication Errors**
   - OAuth configuration missing
   - Invalid or expired tokens
   - Insufficient permissions

2. **GitHub API Errors**
   - Rate limit exceeded
   - Repository not found
   - Access denied

3. **Template Errors**
   - Invalid template structure
   - Missing required files
   - Incompatible template version

4. **Content Errors**
   - Invalid content format
   - Validation failures
   - Merge conflicts

### Error Response Format
```javascript
{
  error: {
    code: string,
    message: string,
    details?: any,
    suggestions?: string[]
  },
  timestamp: Date,
  request_id: string
}
```

### Error Handling Strategies

- **Graceful Degradation**: Show cached content when GitHub API is unavailable
- **Retry Logic**: Implement exponential backoff for transient failures
- **User Guidance**: Provide clear error messages with actionable steps
- **Fallback Options**: Offer alternative actions when primary operations fail

## Testing Strategy

### Unit Testing
- Component-level testing with Vitest
- API endpoint testing with mock GitHub responses
- Utility function testing for data transformation
- Authentication flow testing with mocked OAuth

### Integration Testing
- End-to-end GitHub API integration
- Template forking and content editing workflows
- Dynamic route rendering with real repositories
- Error handling across service boundaries

### Performance Testing
- GitHub API rate limit handling
- Large repository content loading
- Concurrent user editing scenarios
- Dynamic route response times

### Security Testing
- OAuth flow security validation
- Token storage and transmission security
- Repository access permission verification
- CSRF protection testing

## Implementation Considerations

### GitHub API Rate Limits
- Implement request caching for frequently accessed data
- Use conditional requests with ETags where possible
- Implement user-aware rate limiting
- Provide clear feedback when limits are approached

### Content Caching Strategy
- Cache repository content with appropriate TTL
- Implement cache invalidation on content updates
- Use CDN for static assets and template previews
- Consider browser caching for portfolio assets

### Security Measures
- Secure token storage with encryption
- Implement CSRF protection for state parameters
- Validate all user inputs and repository content
- Use HTTPS for all external communications

### Scalability Considerations
- Stateless architecture for horizontal scaling
- Database-free design using GitHub as storage
- Efficient content fetching with minimal API calls
- Optimized bundle sizes for fast loading