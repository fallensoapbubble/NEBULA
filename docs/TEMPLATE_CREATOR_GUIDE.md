# Template Creator Guide

This comprehensive guide will help you create high-quality portfolio templates for the Nebula Portfolio Platform.

## Table of Contents

1. [Overview](#overview)
2. [Template Structure](#template-structure)
3. [Configuration System](#configuration-system)
4. [Content Schema Design](#content-schema-design)
5. [Component Development](#component-development)
6. [Dark/Light Mode Support](#darklight-mode-support)
7. [Testing and Validation](#testing-and-validation)
8. [Publishing Guidelines](#publishing-guidelines)

## Overview

### What Makes a Great Template

A successful portfolio template should:

- **Be Visually Appealing**: Professional design that stands out
- **Be Highly Customizable**: Allow users to personalize content easily
- **Support Multiple Content Types**: Accommodate various portfolio needs
- **Be Responsive**: Work perfectly on all device sizes
- **Be Accessible**: Follow web accessibility guidelines
- **Be Performance-Optimized**: Load quickly and efficiently

### Template Types

The platform supports several template categories:

- **Minimal Portfolio**: Clean, content-focused designs
- **Creative Portfolio**: Visually rich templates for designers
- **Developer Portfolio**: Technical templates with code showcases
- **Business Portfolio**: Professional templates for consultants
- **Blog Portfolio**: Content-heavy templates with article support

## Template Structure

### Required Directory Structure

Every template must follow this exact structure:

```
template-repository/
├── .nebula/
│   ├── config.json         # REQUIRED: Template configuration
│   ├── preview.png         # REQUIRED: Template preview image
│   └── README.md          # Template documentation
├── components/
│   └── TemplateComponent.js # Main React component
├── data.json              # Default content
├── public/
│   └── images/            # Default template images
├── package.json           # Dependencies and metadata
└── README.md              # User-facing documentation
```
##
 Configuration System

### Template Configuration (.nebula/config.json)

The configuration file defines how users can customize your template:

```json
{
  "version": "1.0",
  "name": "Modern Developer Portfolio",
  "description": "A sleek, modern portfolio template for developers",
  "author": "Your Name",
  "templateType": "json",
  "category": "developer",
  "contentFiles": [
    {
      "path": "data.json",
      "type": "json",
      "schema": {
        "personalInfo": {
          "type": "object",
          "label": "Personal Information",
          "properties": {
            "name": {
              "type": "string",
              "label": "Full Name",
              "required": true
            },
            "title": {
              "type": "string",
              "label": "Professional Title"
            },
            "email": {
              "type": "string",
              "label": "Email Address",
              "pattern": "email"
            },
            "avatar": {
              "type": "image",
              "label": "Profile Photo"
            }
          }
        },
        "about": {
          "type": "markdown",
          "label": "About Me",
          "required": true
        },
        "projects": {
          "type": "array",
          "label": "Projects",
          "items": {
            "type": "object",
            "properties": {
              "title": {
                "type": "string",
                "required": true
              },
              "description": {
                "type": "text",
                "maxLength": 300
              },
              "image": {
                "type": "image"
              },
              "technologies": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              }
            }
          }
        }
      }
    }
  ],
  "assets": {
    "allowedTypes": ["image/jpeg", "image/png", "image/webp"],
    "maxSize": "5MB",
    "paths": ["public/images"]
  }
}
```

### Schema Field Types

The platform supports these field types:

- `string` - Single line text input
- `text` - Multi-line text area
- `markdown` - Rich text editor with Markdown support
- `number` - Numeric input with validation
- `boolean` - Checkbox for true/false values
- `array` - List of items
- `object` - Nested object with properties
- `image` - Image upload with preview

## Component Development

### Main Template Component

Your main component should be a React functional component:

```jsx
// components/TemplateComponent.js
import React, { useState } from 'react';

export default function TemplateComponent({ data, theme = 'light' }) {
  const [currentTheme, setCurrentTheme] = useState(theme);

  const toggleTheme = () => {
    setCurrentTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <div className={`portfolio-template ${currentTheme}`}>
      <header>
        <h1>{data.personalInfo?.name || 'Your Name'}</h1>
        <p>{data.personalInfo?.title || 'Your Title'}</p>
        <button onClick={toggleTheme}>
          Toggle {currentTheme === 'light' ? 'Dark' : 'Light'} Mode
        </button>
      </header>
      
      <main>
        <section>
          <h2>About</h2>
          <div dangerouslySetInnerHTML={{ __html: data.about }} />
        </section>
        
        <section>
          <h2>Projects</h2>
          {data.projects?.map((project, index) => (
            <div key={index} className="project-card">
              <h3>{project.title}</h3>
              <p>{project.description}</p>
              {project.image && (
                <img src={project.image} alt={project.title} />
              )}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
```

## Dark/Light Mode Support

Every template must support both light and dark modes using CSS custom properties:

```css
/* styles/globals.css */
:root {
  --color-background: #ffffff;
  --color-text: #1e293b;
  --color-accent: #3b82f6;
}

[data-theme="dark"] {
  --color-background: #0f172a;
  --color-text: #f1f5f9;
  --color-accent: #60a5fa;
}

.portfolio-template {
  background-color: var(--color-background);
  color: var(--color-text);
}
```

## Testing and Validation

Before publishing, test your template thoroughly:

### Required Tests
- Configuration validation
- Content with minimal data
- Content with maximum data
- Cross-browser compatibility
- Mobile responsiveness
- Accessibility compliance
- Performance optimization

### Validation Commands
```bash
npm run validate:template
npm run test:a11y
npm run test:performance
```

## Publishing Guidelines

### Repository Setup
1. Create repository with descriptive name
2. Add relevant topics/tags
3. Choose appropriate license (MIT recommended)
4. Include comprehensive README

### Submission Process
1. Complete quality review
2. Run all validation tests
3. Create high-quality preview images
4. Submit to template gallery

## Best Practices

### Design Principles
- Use clear visual hierarchy
- Implement consistent spacing
- Choose professional color schemes
- Optimize for readability

### Code Quality
- Use functional components
- Follow React best practices
- Implement proper error handling
- Optimize for performance

### Content Strategy
- Provide realistic example content
- Include clear customization instructions
- Demonstrate all template features
- Guide users on best practices

---

*Template Creator Guide Version: 1.0*