/**
 * Templates API Route
 * Provides template gallery data with mock templates for development
 */

import { NextResponse } from 'next/server';

// Mock template data for development
const MOCK_TEMPLATES = [
  {
    id: 'portfolio-templates/minimal-portfolio',
    name: 'Minimal Portfolio',
    description: 'A clean, minimal portfolio template perfect for developers and designers. Features a modern glassmorphic design with smooth animations.',
    repository: {
      owner: 'portfolio-templates',
      name: 'minimal-portfolio',
      full_name: 'portfolio-templates/minimal-portfolio',
      url: 'https://github.com/portfolio-templates/minimal-portfolio',
      clone_url: 'https://github.com/portfolio-templates/minimal-portfolio.git',
      private: false
    },
    preview_url: '/api/placeholder/600/400?text=Minimal+Portfolio',
    tags: ['minimal', 'developer', 'glassmorphic', 'dark-mode'],
    structure: {
      content_files: ['data.json', 'content/about.md'],
      config_files: ['.nebula/config.json', 'package.json'],
      required_fields: ['name', 'title', 'about', 'projects']
    },
    metadata: {
      version: '1.0.0',
      author: 'portfolio-templates',
      created_at: new Date('2024-01-15'),
      updated_at: new Date('2024-02-20'),
      stars: 245,
      forks: 67
    },
    validation: {
      isValid: true,
      errors: [],
      warnings: []
    }
  },
  {
    id: 'portfolio-templates/creative-portfolio',
    name: 'Creative Portfolio',
    description: 'A vibrant, creative portfolio template with bold animations and interactive elements. Perfect for artists, designers, and creative professionals.',
    repository: {
      owner: 'portfolio-templates',
      name: 'creative-portfolio',
      full_name: 'portfolio-templates/creative-portfolio',
      url: 'https://github.com/portfolio-templates/creative-portfolio',
      clone_url: 'https://github.com/portfolio-templates/creative-portfolio.git',
      private: false
    },
    preview_url: '/api/placeholder/600/400?text=Creative+Portfolio',
    tags: ['creative', 'artist', 'colorful', 'interactive'],
    structure: {
      content_files: ['data.json', 'content/gallery.json'],
      config_files: ['.nebula/config.json', 'package.json'],
      required_fields: ['name', 'bio', 'gallery', 'contact']
    },
    metadata: {
      version: '1.2.0',
      author: 'portfolio-templates',
      created_at: new Date('2024-01-10'),
      updated_at: new Date('2024-02-25'),
      stars: 189,
      forks: 43
    },
    validation: {
      isValid: true,
      errors: [],
      warnings: ['Missing preview.png in .nebula directory']
    }
  },
  {
    id: 'portfolio-templates/developer-portfolio',
    name: 'Developer Portfolio',
    description: 'A technical portfolio template designed for software developers. Includes sections for projects, skills, experience, and a blog.',
    repository: {
      owner: 'portfolio-templates',
      name: 'developer-portfolio',
      full_name: 'portfolio-templates/developer-portfolio',
      url: 'https://github.com/portfolio-templates/developer-portfolio',
      clone_url: 'https://github.com/portfolio-templates/developer-portfolio.git',
      private: false
    },
    preview_url: '/api/placeholder/600/400?text=Developer+Portfolio',
    tags: ['developer', 'technical', 'blog', 'projects'],
    structure: {
      content_files: ['data.json', 'content/projects.json', 'content/blog/*.md'],
      config_files: ['.nebula/config.json', 'package.json'],
      required_fields: ['name', 'title', 'skills', 'projects', 'experience']
    },
    metadata: {
      version: '2.0.0',
      author: 'portfolio-templates',
      created_at: new Date('2023-12-20'),
      updated_at: new Date('2024-02-28'),
      stars: 412,
      forks: 128
    },
    validation: {
      isValid: true,
      errors: [],
      warnings: []
    }
  },
  {
    id: 'portfolio-templates/business-portfolio',
    name: 'Business Portfolio',
    description: 'A professional business portfolio template with a corporate design. Ideal for consultants, agencies, and business professionals.',
    repository: {
      owner: 'portfolio-templates',
      name: 'business-portfolio',
      full_name: 'portfolio-templates/business-portfolio',
      url: 'https://github.com/portfolio-templates/business-portfolio',
      clone_url: 'https://github.com/portfolio-templates/business-portfolio.git',
      private: false
    },
    preview_url: '/api/placeholder/600/400?text=Business+Portfolio',
    tags: ['business', 'professional', 'corporate', 'services'],
    structure: {
      content_files: ['data.json', 'content/services.json', 'content/testimonials.json'],
      config_files: ['.nebula/config.json', 'package.json'],
      required_fields: ['company', 'services', 'testimonials', 'contact']
    },
    metadata: {
      version: '1.1.0',
      author: 'portfolio-templates',
      created_at: new Date('2024-01-05'),
      updated_at: new Date('2024-02-15'),
      stars: 156,
      forks: 34
    },
    validation: {
      isValid: true,
      errors: [],
      warnings: []
    }
  },
  {
    id: 'portfolio-templates/photography-portfolio',
    name: 'Photography Portfolio',
    description: 'A stunning photography portfolio template with full-screen galleries and elegant image presentations. Perfect for photographers and visual artists.',
    repository: {
      owner: 'portfolio-templates',
      name: 'photography-portfolio',
      full_name: 'portfolio-templates/photography-portfolio',
      url: 'https://github.com/portfolio-templates/photography-portfolio',
      clone_url: 'https://github.com/portfolio-templates/photography-portfolio.git',
      private: false
    },
    preview_url: '/api/placeholder/600/400?text=Photography+Portfolio',
    tags: ['photography', 'gallery', 'visual', 'fullscreen'],
    structure: {
      content_files: ['data.json', 'content/galleries.json'],
      config_files: ['.nebula/config.json', 'package.json'],
      required_fields: ['name', 'bio', 'galleries', 'contact']
    },
    metadata: {
      version: '1.0.0',
      author: 'portfolio-templates',
      created_at: new Date('2024-02-01'),
      updated_at: new Date('2024-02-22'),
      stars: 98,
      forks: 21
    },
    validation: {
      isValid: true,
      errors: [],
      warnings: []
    }
  },
  {
    id: 'portfolio-templates/blog-portfolio',
    name: 'Blog Portfolio',
    description: 'A content-focused portfolio template with integrated blogging capabilities. Great for writers, content creators, and thought leaders.',
    repository: {
      owner: 'portfolio-templates',
      name: 'blog-portfolio',
      full_name: 'portfolio-templates/blog-portfolio',
      url: 'https://github.com/portfolio-templates/blog-portfolio',
      clone_url: 'https://github.com/portfolio-templates/blog-portfolio.git',
      private: false
    },
    preview_url: '/api/placeholder/600/400?text=Blog+Portfolio',
    tags: ['blog', 'content', 'writing', 'articles'],
    structure: {
      content_files: ['data.json', 'content/posts/*.md', 'content/about.md'],
      config_files: ['.nebula/config.json', 'package.json'],
      required_fields: ['name', 'bio', 'posts', 'categories']
    },
    metadata: {
      version: '1.3.0',
      author: 'portfolio-templates',
      created_at: new Date('2023-11-15'),
      updated_at: new Date('2024-02-18'),
      stars: 267,
      forks: 89
    },
    validation: {
      isValid: true,
      errors: [],
      warnings: []
    }
  }
];

/**
 * GET /api/templates
 * Get all available templates with optional filtering
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
    const author = searchParams.get('author');

    let filteredTemplates = [...MOCK_TEMPLATES];

    // Filter by search query
    if (query) {
      const searchTerm = query.toLowerCase();
      filteredTemplates = filteredTemplates.filter(template =>
        template.name.toLowerCase().includes(searchTerm) ||
        template.description.toLowerCase().includes(searchTerm) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Filter by tags
    if (tags.length > 0) {
      filteredTemplates = filteredTemplates.filter(template =>
        tags.some(tag => template.tags.includes(tag))
      );
    }

    // Filter by author
    if (author) {
      const authorTerm = author.toLowerCase();
      filteredTemplates = filteredTemplates.filter(template =>
        template.metadata.author.toLowerCase().includes(authorTerm)
      );
    }

    return NextResponse.json({
      success: true,
      data: filteredTemplates,
      meta: {
        total: filteredTemplates.length,
        query,
        tags,
        author
      }
    });

  } catch (error) {
    console.error('Templates API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to fetch templates',
          details: error.message
        }
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/templates
 * Create or validate a new template (placeholder for future implementation)
 */
export async function POST(request) {
  return NextResponse.json(
    {
      success: false,
      error: {
        message: 'Template creation not yet implemented',
        details: 'This endpoint will be implemented in a future version'
      }
    },
    { status: 501 }
  );
}