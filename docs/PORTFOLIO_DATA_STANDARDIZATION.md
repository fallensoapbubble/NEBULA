# Portfolio Data Standardization

## Overview

The Portfolio Data Standardization system provides a unified schema and transformation layer that converts various repository file formats into a consistent structure that templates can reliably use.

## Implementation Summary

### Core Components

1. **Standard Portfolio Schema** (`STANDARD_PORTFOLIO_SCHEMA`)
   - Defines unified structure for all portfolio data
   - Includes personal info, contact, experience, projects, skills, education, certifications
   - Supports flexible field types and validation rules

2. **PortfolioDataStandardizer Class**
   - Transforms parsed content from various formats to standard schema
   - Handles multiple data sources (JSON, YAML, Markdown)
   - Provides comprehensive validation and completeness scoring
   - Supports both strict and lenient validation modes

3. **Data Transformation Engine**
   - Maps alternative field names to standard fields
   - Handles different data structures and formats
   - Preserves data integrity while normalizing structure
   - Removes duplicates and sorts data appropriately

### Key Features

#### Multi-Format Support
- **JSON**: Direct object mapping with field name alternatives
- **YAML**: Same as JSON with YAML parsing
- **Markdown**: Frontmatter extraction + body content processing

#### Field Name Flexibility
The system recognizes multiple field name variations:
- `name` / `fullName` / `full_name` / `displayName`
- `title` / `jobTitle` / `job_title` / `position` / `role`
- `description` / `summary` / `intro` / `about`
- And many more...

#### Data Validation
- **Completeness Scoring**: 0-100% based on data presence
- **Required Field Validation**: Ensures critical data exists
- **Format Validation**: Validates data types and structures
- **Warning System**: Provides recommendations for improvement

#### Smart Data Processing
- **Duplicate Removal**: Intelligent deduplication (e.g., skills)
- **Data Sorting**: Chronological sorting for experience/education
- **Priority Handling**: Featured projects, recent experience first
- **Social Media Processing**: URL parsing and username extraction

### Usage Examples

#### Basic Standardization
```javascript
import { createPortfolioDataStandardizer } from './lib/portfolio-data-standardizer.js';

const standardizer = createPortfolioDataStandardizer();
const result = await standardizer.standardizePortfolioData(parsedContent);

if (result.success) {
  console.log('Standardized data:', result.data);
  console.log('Completeness:', result.validation.completeness + '%');
}
```

#### With Configuration
```javascript
const standardizer = createPortfolioDataStandardizer({
  strictValidation: true,
  allowUnknownFields: false,
  schemaVersion: '1.0.0'
});
```

#### Validation Only
```javascript
import { validatePortfolioData } from './lib/portfolio-data-standardizer.js';

const validation = await validatePortfolioData(portfolioData);
console.log('Valid:', validation.isValid);
console.log('Completeness:', validation.completeness + '%');
```

### Schema Structure

```javascript
{
  personal: {
    name: string (required),
    title: string,
    description: string,
    bio: string,
    location: string,
    avatar: string,
    website: string
  },
  contact: {
    email: string,
    phone: string,
    social: [{ platform, url, username }]
  },
  experience: [{ title, company, location, startDate, endDate, description, highlights, technologies }],
  projects: [{ name, description, url, repository, image, technologies, status, featured }],
  skills: [{ name, category, level, years }],
  education: [{ institution, degree, field, startDate, endDate, gpa, honors }],
  certifications: [{ name, issuer, date, expiryDate, credentialId, url }],
  metadata: { lastUpdated, version, template, theme }
}
```

### Integration with Content Analyzer

The standardizer is designed to work seamlessly with the `PortfolioContentAnalyzer`:

```javascript
// 1. Analyze repository content
const analyzer = createPortfolioContentAnalyzer(accessToken);
const analysis = await analyzer.analyzeRepository(owner, repo);

// 2. Standardize the parsed content
const standardizer = createPortfolioDataStandardizer();
const standardized = await standardizer.standardizePortfolioData(analysis.analysis.parsedContent);

// 3. Use standardized data in templates
const portfolioData = standardized.data;
```

### Validation and Quality Scoring

The system provides comprehensive quality assessment:

- **Completeness Score**: 0-100% based on data presence
  - Personal info: 30 points (name=15, title=5, description/bio=10)
  - Contact info: 20 points (email=10, social=10)
  - Experience: 20 points
  - Projects: 20 points
  - Skills: 10 points

- **Validation Levels**:
  - **Errors**: Critical issues that prevent proper rendering
  - **Warnings**: Missing recommended data that affects completeness
  - **Suggestions**: Optimization recommendations

### Error Handling

- **Graceful Degradation**: Continues processing even with some invalid data
- **Detailed Error Reporting**: Specific error messages with context
- **Flexible Validation**: Strict mode for development, lenient for production
- **Recovery Suggestions**: Actionable recommendations for fixing issues

### Testing

Comprehensive test suite covering:
- ✅ Schema definition and structure
- ✅ Data transformation from all supported formats
- ✅ Field name mapping and alternatives
- ✅ Validation and scoring algorithms
- ✅ Error handling and edge cases
- ✅ Integration with content analyzer
- ✅ Backward compatibility with legacy formats

### Files Created/Modified

1. **lib/portfolio-data-standardizer.js** - Main implementation
2. **lib/__tests__/portfolio-data-standardizer.test.js** - Unit tests
3. **lib/__tests__/portfolio-integration.test.js** - Integration tests
4. **lib/examples/portfolio-standardization-example.js** - Usage examples
5. **docs/PORTFOLIO_DATA_STANDARDIZATION.md** - This documentation

## Requirements Fulfilled

✅ **4.3**: Create standard portfolio data schema that templates can use
- Implemented comprehensive `STANDARD_PORTFOLIO_SCHEMA`
- Covers all major portfolio data types with flexible validation

✅ **8.3**: Add data transformation from various repository file formats to standard schema  
- Supports JSON, YAML, and Markdown formats
- Handles alternative field names and data structures
- Intelligent data mapping and normalization

✅ **8.4**: Implement validation for portfolio data completeness and format
- Comprehensive validation system with scoring
- Error and warning reporting
- Configurable validation strictness
- Quality assessment and recommendations

The implementation provides a robust foundation for consistent portfolio data handling across all templates and ensures reliable data transformation from any supported repository format.