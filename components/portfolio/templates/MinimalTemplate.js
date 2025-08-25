/**
 * Minimal Template Component
 * Clean and simple design with focus on content
 */

import Image from 'next/image';
import Link from 'next/link';

export function MinimalTemplate({ data, componentProps, repository, componentMap }) {
  const { styling } = data;

  return (
    <div 
      className="min-h-screen bg-gray-50"
      style={{
        '--primary-color': styling?.colors?.primary || '#6B7280',
        '--secondary-color': styling?.colors?.secondary || '#4B5563',
        '--accent-color': styling?.colors?.accent || '#9CA3AF',
        '--background-color': styling?.colors?.background || '#F9FAFB',
        '--text-color': styling?.colors?.text || '#111827'
      }}
    >
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <header className="text-center mb-16">
          {data.avatar && (
            <div className="mb-6">
              <Image
                src={data.avatar}
                alt={data.name}
                width={120}
                height={120}
                className="rounded-full mx-auto"
              />
            </div>
          )}
          <h1 className="text-4xl font-light text-gray-900 mb-2">
            {data.name}
          </h1>
          {data.title && (
            <p className="text-xl text-gray-600 mb-4">{data.title}</p>
          )}
          {data.description && (
            <p className="text-gray-700 max-w-2xl mx-auto">{data.description}</p>
          )}
        </header>

        {/* Content Sections */}
        <div className="space-y-16">
          {/* About Section */}
          {componentProps.about?.data && (
            <section>
              <h2 className="text-2xl font-light text-gray-900 mb-6">About</h2>
              <div className="prose prose-gray max-w-none">
                <MinimalAboutContent data={componentProps.about.data} />
              </div>
            </section>
          )}

          {/* Projects Section */}
          {componentProps.projects?.data && componentProps.projects.data.length > 0 && (
            <section>
              <h2 className="text-2xl font-light text-gray-900 mb-6">Projects</h2>
              <div className="grid gap-6 md:grid-cols-2">
                {componentProps.projects.data.map((project, index) => (
                  <MinimalProjectCard key={index} project={project} />
                ))}
              </div>
            </section>
          )}

          {/* Skills Section */}
          {componentProps.skills?.data && componentProps.skills.data.length > 0 && (
            <section>
              <h2 className="text-2xl font-light text-gray-900 mb-6">Skills</h2>
              <div className="flex flex-wrap gap-3">
                {componentProps.skills.data.map((skill, index) => (
                  <MinimalSkillTag key={index} skill={skill} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">
            Hosted from{' '}
            <Link 
              href={repository?.url || '#'} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-700 hover:text-gray-900"
            >
              GitHub
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}

/**
 * Minimal About Content Component
 */
function MinimalAboutContent({ data }) {
  if (typeof data === 'string') {
    return <p>{data}</p>;
  }

  if (data.html) {
    return <div dangerouslySetInnerHTML={{ __html: data.html }} />;
  }

  if (data.body) {
    return <p>{data.body}</p>;
  }

  if (data.content) {
    return <p>{data.content}</p>;
  }

  return <p>No about information available.</p>;
}

/**
 * Minimal Project Card Component
 */
function MinimalProjectCard({ project }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {project.name || project.title}
      </h3>
      <p className="text-gray-600 mb-4">{project.description}</p>
      
      {project.technologies && project.technologies.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {project.technologies.map((tech, index) => (
            <span 
              key={index}
              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
            >
              {tech}
            </span>
          ))}
        </div>
      )}
      
      <div className="flex space-x-3">
        {project.url && (
          <Link 
            href={project.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            View Project →
          </Link>
        )}
        {project.github && (
          <Link 
            href={project.github} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-gray-800 text-sm"
          >
            GitHub →
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * Minimal Skill Tag Component
 */
function MinimalSkillTag({ skill }) {
  const skillName = typeof skill === 'string' ? skill : skill.name || skill.title;
  const skillLevel = typeof skill === 'object' ? skill.level : null;

  return (
    <span className="inline-flex items-center px-3 py-1 bg-white text-gray-700 text-sm rounded-full shadow-sm">
      {skillName}
      {skillLevel && (
        <span className="ml-2 text-xs text-gray-500">
          {skillLevel}
        </span>
      )}
    </span>
  );
}

export default MinimalTemplate;