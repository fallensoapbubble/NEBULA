/**
 * Projects Section Component
 * Displays the projects section of a portfolio
 */

import Link from 'next/link';
import Image from 'next/image';

export function ProjectsSection({ projects, className = '' }) {
  if (!projects || projects.length === 0) return null;

  return (
    <section className={`${className}`}>
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Projects</h2>
        
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, index) => (
            <ProjectCard key={index} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Individual Project Card Component
 */
function ProjectCard({ project }) {
  const {
    name,
    title,
    description,
    url,
    github,
    demo,
    image,
    screenshot,
    technologies,
    tags,
    status,
    featured,
    year,
    category
  } = project;

  const projectTitle = title || name;
  const projectUrl = url || demo || github;
  const projectImage = image || screenshot;
  const projectTechs = technologies || tags || [];

  return (
    <div className={`bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${featured ? 'ring-2 ring-blue-500' : ''}`}>
      {/* Project Image */}
      {projectImage && (
        <div className="aspect-video relative overflow-hidden">
          <Image
            src={projectImage}
            alt={projectTitle}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {featured && (
            <div className="absolute top-2 right-2">
              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                Featured
              </span>
            </div>
          )}
        </div>
      )}

      <div className="p-6">
        {/* Project Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-1">
              {projectUrl ? (
                <Link 
                  href={projectUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 transition-colors"
                >
                  {projectTitle}
                </Link>
              ) : (
                projectTitle
              )}
            </h3>
            
            {/* Category and Year */}
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              {category && <span>{category}</span>}
              {category && year && <span>•</span>}
              {year && <span>{year}</span>}
            </div>
          </div>

          {/* Status Badge */}
          {status && (
            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(status)}`}>
              {status}
            </span>
          )}
        </div>

        {/* Description */}
        {description && (
          <p className="text-gray-600 mb-4 line-clamp-3">
            {description}
          </p>
        )}

        {/* Technologies */}
        {projectTechs.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {projectTechs.slice(0, 6).map((tech, techIndex) => (
              <span 
                key={techIndex}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
              >
                {tech}
              </span>
            ))}
            {projectTechs.length > 6 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                +{projectTechs.length - 6} more
              </span>
            )}
          </div>
        )}

        {/* Action Links */}
        <div className="flex items-center space-x-4">
          {projectUrl && (
            <Link 
              href={projectUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View Project
            </Link>
          )}

          {github && github !== projectUrl && (
            <Link 
              href={github} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-gray-600 hover:text-gray-800 font-medium text-sm"
            >
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
              </svg>
              Code
            </Link>
          )}

          {demo && demo !== projectUrl && demo !== github && (
            <Link 
              href={demo} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-green-600 hover:text-green-800 font-medium text-sm"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Demo
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Get status color classes
 */
function getStatusColor(status) {
  const statusLower = status.toLowerCase();
  
  if (statusLower.includes('complete') || statusLower.includes('finished') || statusLower.includes('live')) {
    return 'bg-green-100 text-green-800';
  }
  
  if (statusLower.includes('progress') || statusLower.includes('development') || statusLower.includes('wip')) {
    return 'bg-yellow-100 text-yellow-800';
  }
  
  if (statusLower.includes('planned') || statusLower.includes('upcoming')) {
    return 'bg-blue-100 text-blue-800';
  }
  
  if (statusLower.includes('archived') || statusLower.includes('deprecated')) {
    return 'bg-gray-100 text-gray-800';
  }
  
  return 'bg-gray-100 text-gray-800';
}

export default ProjectsSection;