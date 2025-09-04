# Comprehensive Testing Suite

This directory contains a comprehensive testing suite for the Nebula Portfolio Platform, implementing the requirements from task 11.3.

## Test Categories

### 1. Unit Tests (`test:unit`)
Tests individual functions, classes, and modules in isolation.

**Coverage:**
- Service classes (RepositoryService, TemplateService, etc.)
- Utility functions (GitHub auth, error handling, etc.)
- Data validation and transformation logic
- Configuration and setup functions

**Key Files:**
- `repository-service-unit.test.js` - Repository operations
- `template-service-unit.test.js` - Template management
- `github-auth.test.js` - Authentication utilities
- `auth-config.test.js` - Configuration validation
- `errors.test.js` - Error handling
- `network-manager.test.js` - Network utilities
- `rate-limit-manager.test.js` - Rate limiting

### 2. Integration Tests (`test:integration`)
Tests the interaction between different components and external services.

**Coverage:**
- API route handlers with service integration
- GitHub API integration workflows
- Database/storage integration
- Authentication flow integration
- Template analysis and validation workflows

**Key Files:**
- `api-integration.test.js` - API routes with services
- `github-oauth-integration.test.js` - OAuth workflows
- `portfolio-analyzer-integration.test.js` - Content analysis
- `content-persistence-integration.test.js` - Data persistence
- `dynamic-route-integration.test.js` - Next.js routing

### 3. End-to-End Tests (`test:e2e`)
Tests complete user workflows from start to finish.

**Coverage:**
- Template selection → Fork → Edit → Publish workflow
- User authentication and authorization
- Repository creation and management
- Content editing and synchronization
- Error recovery and resilience

**Key Files:**
- `e2e-workflow.test.js` - Complete user workflows
- Concurrent operation handling
- Data integrity validation
- Performance under load

### 4. Performance Tests (`test:performance`)
Tests system performance, scalability, and resource usage.

**Coverage:**
- ISR (Incremental Static Regeneration) performance
- API response times and throughput
- Memory usage and leak detection
- Concurrent request handling
- GitHub API rate limit management

**Key Files:**
- `isr-performance.test.js` - Static generation performance
- `performance-optimizer.test.js` - Optimization utilities
- `portfolio-performance-service.test.js` - Service performance

## Test Infrastructure

### Test Utilities (`test-utils.js`)
Shared utilities for all test types:
- Mock GitHub API responses
- Mock Next.js request/response objects
- Performance measurement utilities
- Integration test helpers
- Environment setup functions

### Test Configuration (`test-config.js`)
Centralized configuration for:
- Performance thresholds
- Mock service settings
- Test environment variables
- Category-specific configurations

### Test Runner (`test-runner.js`)
Orchestrates test execution:
- Runs tests by category
- Generates comprehensive reports
- Handles test failures and retries
- Provides CLI interface

## Running Tests

### Individual Categories
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# End-to-end tests only
npm run test:e2e

# Performance tests only
npm run test:performance
```

### Comprehensive Testing
```bash
# Run all test categories with reporting
npm run test:comprehensive
```

### Legacy Test Scripts
```bash
# Original integration tests (still available)
npm run test:legacy:integration
npm run test:legacy:e2e
```

## Test Results and Reporting

### Console Output
The test runner provides real-time feedback:
- Progress indicators for each category
- Pass/fail counts
- Execution times
- Success rates

### Detailed Reports
- `test-results.json` - Machine-readable results
- Console summary with performance metrics
- Coverage reports (when enabled)

### Example Output
```
📊 Test Results Summary
========================
UNIT         |  45 passed |   2 failed |  95.7% |   3.45s
INTEGRATION  |  23 passed |   1 failed |  95.8% |  12.34s
E2E          |  12 passed |   0 failed | 100.0% |  45.67s
PERFORMANCE  |   8 passed |   0 failed | 100.0% |  23.45s
------------------------
TOTAL        |  88 passed |   3 failed |  96.7% |  84.91s
```

## Performance Benchmarks

### ISR Performance
- Static generation: < 2 seconds
- Revalidation: < 1 second
- Memory usage: < 50MB per generation
- Concurrent handling: 20+ simultaneous requests

### API Performance
- Response time: < 1 second (95th percentile < 500ms)
- Throughput: > 100 requests/second
- Concurrent requests: 20+ simultaneous
- Error rate: < 1%

### Service Performance
- Repository fork: < 5 seconds
- Content operations: < 2 seconds
- Synchronization: < 3 seconds
- Template validation: < 1 second

## Test Data Management

### Mock Data
- Consistent GitHub API responses
- Realistic portfolio content
- Template configurations
- User authentication data

### Test Isolation
- Each test runs in isolation
- Clean state between tests
- No shared mutable state
- Proper cleanup after tests

## Continuous Integration

### GitHub Actions Integration
The test suite is designed to work with CI/CD:
- Parallel test execution
- Artifact generation
- Performance regression detection
- Coverage reporting

### Local Development
- Fast feedback loop
- Selective test running
- Watch mode support
- Debug-friendly output

## Troubleshooting

### Common Issues

1. **Memory Issues**
   - Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096`
   - Run tests sequentially: Use integration/e2e categories

2. **GitHub API Rate Limits**
   - Tests use mocked responses by default
   - Real API calls only in integration tests
   - Rate limit simulation for resilience testing

3. **Timeout Issues**
   - Adjust timeout in test-config.js
   - Check for hanging promises
   - Verify proper cleanup

### Debug Mode
```bash
# Run with debug output
DEBUG=test:* npm run test:comprehensive

# Run specific test file
npm run test:run lib/__tests__/e2e-workflow.test.js
```

## Contributing

### Adding New Tests
1. Choose appropriate category (unit/integration/e2e/performance)
2. Use test utilities for consistency
3. Follow naming conventions
4. Add performance benchmarks where relevant
5. Update this documentation

### Test Standards
- Descriptive test names
- Proper setup/teardown
- Error case coverage
- Performance considerations
- Documentation of complex scenarios

## Architecture Decisions

### Why Vitest?
- Fast execution with native ESM support
- Built-in mocking capabilities
- TypeScript support
- Compatible with existing Jest tests

### Why Separate Categories?
- Different performance requirements
- Different execution environments
- Selective test running
- Clear separation of concerns

### Why Custom Test Runner?
- Comprehensive reporting
- Category-specific configuration
- Performance tracking
- CI/CD integration