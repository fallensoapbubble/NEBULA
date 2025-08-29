/**
 * Modern Template Component
 * Contemporary design with gradients and animations
 */

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export function ModernTemplate({ data, componentProps, repository, componentMap }) {
  const { styling } = data;

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100"
      style={{
        '--primary-color': styling?.colors?.primary || '#6366F1',
        '--secondary-color': styling?.colors?.secondary || '#8B5CF6',
        '--accent-color': styling?.colors?.accent || '#A855F7',
        '--background-color': styling?.colors?.background || '#F1F5F9',
        '--text-color': styling?.colors?.text || '#1E293B'
      }}
    >
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            {data.avatar && (
              <div className="mb-8">
                <Image
                  src={data.avatar}
                  alt={data.name}
                  width={150}
                  height={150}
                  className="rounded-full mx-auto shadow-lg"
                />
              </div>
            )}
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              {data.name}
            </h1>
            {data.title && (
              <p className="text-2xl text-blue-600 mb-6">{data.title}</p>
            )}
            {data.description && (
              <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                {data.description}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid gap-16">
            {/* About */}
            {componentProps.about?.data && (
              <section>
                <h2 className="text-3xl font-bold text-gray-900 mb-8">About Me</h2>
                <div className="prose prose-lg prose-blue max-w-none">
                  <ModernAboutContent data={componentProps.about.data} />
                </div>
              </section>
            )}

            {/* Projects */}
            {componentProps.projects?.data && componentProps.projects.data.length > 0 && (
              <section>
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Featured Projects</h2>
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {componentProps.projects.data.map((project, index) => (
                    <ModernProjectCard key={index} project={project} />
                  ))}
                </div>
              </section>
            )}

            {/* Skills */}
            {componentProps.skills?.data && componentProps.skills.data.length > 0 && (
              <section>
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Skills & Technologies</h2>
                <ModernSkillsGrid skills={componentProps.skills.data} />
              </section>
            )}

            {/* Contact */}
            {componentProps.contact?.data && (
              <section>
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Get In Touch</h2>
                <ModernContactSection data={componentProps.contact.data} />
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-400">
              Portfolio powered by{' '}
              <Link 
                href={repository?.url || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white hover:text-blue-400"
              >
                GitHub
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * Modern About Content Component
 */
function ModernAboutContent({ data }) {
  if (typeof data === 'string') {
    return <p className="text-lg leading-relaxed">{data}</p>;
  }

  if (data.html) {
    return <div className="prose-lg" dangerouslySetInnerHTML={{ __html: data.html }} />;
  }

  if (data.body) {
    return <p className="text-lg leading-relaxed">{data.body}</p>;
  }

  if (data.content) {
    return <p className="text-lg leading-relaxed">{data.content}</p>;
  }

  return <p className="text-lg leading-relaxed">No about information available.</p>;
}

/**
 * Modern Project Card Component
 */
function ModernProjectCard({ project }) {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
      {project.image && (
        <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600">
          <Image
            src={project.image}
            alt={project.name || project.title}
            width={400}
            height={200}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          {project.name || project.title}
        </h3>
        <p className="text-gray-600 mb-4">{project.description}</p>
        
        {project.technologies && project.technologies.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {project.technologies.map((tech, techIndex) => (
              <span 
                key={techIndex}
                className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
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
              className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
            >
              View Project
              <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          )}
          {project.github && (
            <Link 
              href={project.github} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-gray-600 hover:text-gray-800 font-medium"
            >
              GitHub
              <svg className="ml-1 w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Modern Skills Grid Component
 */
function ModernSkillsGrid({ skills }) {
  // Group skills by category if they have categories
  const groupedSkills = skills.reduce((groups, skill) => {
    const category = (typeof skill === 'object' && skill.category) || 'General';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(skill);
    return groups;
  }, {});

  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {Object.entries(groupedSkills).map(([category, categorySkills]) => (
        <div key={category} className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{category}</h3>
          <div className="space-y-3">
            {categorySkills.map((skill, index) => (
              <ModernSkillItem key={index} skill={skill} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Modern Skill Item Component
 */
function ModernSkillItem({ skill }) {
  const skillName = typeof skill === 'string' ? skill : skill.name || skill.title;
  const skillLevel = typeof skill === 'object' ? skill.level : null;
  const skillPercentage = typeof skill === 'object' ? skill.percentage : null;

  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-700 font-medium">{skillName}</span>
      {skillLevel && (
        <span className="text-sm text-gray-500">{skillLevel}</span>
      )}
      {skillPercentage && (
        <div className="flex-1 ml-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${skillPercentage}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Modern Contact Section Component
 */
function ModernContactSection({ data }) {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-xl font-semibold mb-4">Let&apos;s Connect</h3>
          <p className="text-blue-100 mb-6">
            I&apos;m always interested in new opportunities and collaborations.
          </p>
          
          <div className="space-y-3">
            {data.email && (
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <Link href={`mailto:${data.email}`} className="hover:text-blue-200">
                  {data.email}
                </Link>
              </div>
            )}
            
            {data.phone && (
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <Link href={`tel:${data.phone}`} className="hover:text-blue-200">
                  {data.phone}
                </Link>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex space-x-4">
          {data.linkedin && (
            <Link
              href={data.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" />
              </svg>
            </Link>
          )}
          
          {data.twitter && (
            <Link
              href={data.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default ModernTemplate;