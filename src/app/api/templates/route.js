/**
 * Templates API Route
 * Provides template gallery data with mock templates for development
 */

import { NextResponse } from 'next/server';

// Template data with real GitHub repositories that can be forked
const MOCK_TEMPLATES = [
  {
    id: 'vercel/next.js',
    name: 'Next.js Starter',
    description: 'The official Next.js starter template. A React framework for production with server-side rendering, static site generation, and more.',
    repository: {
      owner: 'vercel',
      name: 'next.js',
      full_name: 'vercel/next.js',
      url: 'https://github.com/vercel/next.js',
      clone_url: 'https://github.com/vercel/next.js.git',
      private: false
    },
    preview_url: '/api/placeholder/600/400?text=Next.js+Starter',
    tags: ['react', 'nextjs', 'starter', 'framework'],
    structure: {
      content_files: ['package.json', 'README.md'],
      config_files: ['next.config.js', 'package.json'],
      required_fields: ['name', 'description']
    },
    metadata: {
      version: '1.0.0',
      author: 'vercel',
      created_at: new Date('2024-01-15'),
      updated_at: new Date('2024-02-20'),
      stars: 125000,
      forks: 26800
    },
    validation: {
      isValid: true,
      errors: [],
      warnings: []
    }
  },
  {
    id: 'facebook/create-react-app',
    name: 'React App Template',
    description: 'Create React apps with no build configuration. The official template for creating React applications with modern tooling.',
    repository: {
      owner: 'facebook',
      name: 'create-react-app',
      full_name: 'facebook/create-react-app',
      url: 'https://github.com/facebook/create-react-app',
      clone_url: 'https://github.com/facebook/create-react-app.git',
      private: false
    },
    preview_url: '/api/placeholder/600/400?text=React+App',
    tags: ['react', 'javascript', 'spa', 'frontend'],
    structure: {
      content_files: ['package.json', 'public/index.html', 'src/App.js'],
      config_files: ['package.json'],
      required_fields: ['name', 'version']
    },
    metadata: {
      version: '1.2.0',
      author: 'facebook',
      created_at: new Date('2024-01-10'),
      updated_at: new Date('2024-02-25'),
      stars: 102000,
      forks: 26500
    },
    validation: {
      isValid: true,
      errors: [],
      warnings: []
    }
  },
  {
    id: 'vitejs/vite',
    name: 'Vite Template',
    description: 'Next generation frontend tooling. A fast build tool that provides instant server start and lightning fast HMR.',
    repository: {
      owner: 'vitejs',
      name: 'vite',
      full_name: 'vitejs/vite',
      url: 'https://github.com/vitejs/vite',
      clone_url: 'https://github.com/vitejs/vite.git',
      private: false
    },
    preview_url: '/api/placeholder/600/400?text=Vite+Template',
    tags: ['vite', 'build-tool', 'frontend', 'fast'],
    structure: {
      content_files: ['package.json', 'index.html'],
      config_files: ['vite.config.js', 'package.json'],
      required_fields: ['name', 'version']
    },
    metadata: {
      version: '2.0.0',
      author: 'vitejs',
      created_at: new Date('2023-12-20'),
      updated_at: new Date('2024-02-28'),
      stars: 67000,
      forks: 6000
    },
    validation: {
      isValid: true,
      errors: [],
      warnings: []
    }
  },
  {
    id: 'tailwindlabs/tailwindcss',
    name: 'Tailwind CSS',
    description: 'A utility-first CSS framework for rapidly building custom user interfaces. Perfect for modern web development.',
    repository: {
      owner: 'tailwindlabs',
      name: 'tailwindcss',
      full_name: 'tailwindlabs/tailwindcss',
      url: 'https://github.com/tailwindlabs/tailwindcss',
      clone_url: 'https://github.com/tailwindlabs/tailwindcss.git',
      private: false
    },
    preview_url: '/api/placeholder/600/400?text=Tailwind+CSS',
    tags: ['css', 'utility-first', 'styling', 'framework'],
    structure: {
      content_files: ['package.json', 'tailwind.config.js'],
      config_files: ['tailwind.config.js', 'package.json'],
      required_fields: ['name', 'version']
    },
    metadata: {
      version: '1.1.0',
      author: 'tailwindlabs',
      created_at: new Date('2024-01-05'),
      updated_at: new Date('2024-02-15'),
      stars: 82000,
      forks: 4100
    },
    validation: {
      isValid: true,
      errors: [],
      warnings: []
    }
  },
  {
    id: 'microsoft/vscode',
    name: 'VS Code Template',
    description: 'Visual Studio Code source code repository. A powerful, lightweight code editor with rich ecosystem of extensions.',
    repository: {
      owner: 'microsoft',
      name: 'vscode',
      full_name: 'microsoft/vscode',
      url: 'https://github.com/microsoft/vscode',
      clone_url: 'https://github.com/microsoft/vscode.git',
      private: false
    },
    preview_url: '/api/placeholder/600/400?text=VS+Code',
    tags: ['editor', 'typescript', 'electron', 'development'],
    structure: {
      content_files: ['package.json', 'src/main.ts'],
      config_files: ['package.json', 'tsconfig.json'],
      required_fields: ['name', 'version']
    },
    metadata: {
      version: '1.0.0',
      author: 'microsoft',
      created_at: new Date('2024-02-01'),
      updated_at: new Date('2024-02-22'),
      stars: 163000,
      forks: 28800
    },
    validation: {
      isValid: true,
      errors: [],
      warnings: []
    }
  },
  {
    id: 'nodejs/node',
    name: 'Node.js Template',
    description: 'Node.js JavaScript runtime built on Chrome\'s V8 JavaScript engine. Perfect for building scalable network applications.',
    repository: {
      owner: 'nodejs',
      name: 'node',
      full_name: 'nodejs/node',
      url: 'https://github.com/nodejs/node',
      clone_url: 'https://github.com/nodejs/node.git',
      private: false
    },
    preview_url: '/api/placeholder/600/400?text=Node.js',
    tags: ['nodejs', 'javascript', 'runtime', 'backend'],
    structure: {
      content_files: ['package.json', 'lib/index.js'],
      config_files: ['package.json'],
      required_fields: ['name', 'version']
    },
    metadata: {
      version: '1.3.0',
      author: 'nodejs',
      created_at: new Date('2023-11-15'),
      updated_at: new Date('2024-02-18'),
      stars: 107000,
      forks: 29200
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