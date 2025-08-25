/**
 * Classic Template Component
 * Traditional portfolio layout with navigation
 */

import Image from 'next/image';
import Link from 'next/link';

export function ClassicTemplate({ data, componentProps, repository, componentMap }) {
  const { styling } = data;

  return (
    <div 
      className="min-h-screen bg-white"
      style={{
        '--primary-color': styling?.colors?.primary || '#525252',
        '--secondary-color': styling?.colors?.secondary || '#404040',
        '--accent-color': styling?.colors?.accent || '#737373',
        '--background-color': styling?.colors?.background || '#FAFAFA',
        '--text-color': styling?.colors?.text || '#171717'
      }}
    >
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              {data.avatar && (
                <Image
                  src={data.avatar}
                  alt={data.name}
                  width={40}
                  height={40}
                  className="rounded-full mr-3"
                />
              )}
              <h1 className="text-xl font-semibold text-gray-900">
                {data.name}
              </h1>
            </div>
            <div className="flex space-x-6">
              <a href="#about" className="text-gray-600 hover:text-gray-900">About</a>
              <a href="#projects" className="text-gray-600 hover:text-gray-900">Projects</a>
              <a href="#skills" className="text-gray-600 hover:text-gray-900">Skills</a>
              <a href="#contact" className="text-gray-600 hover:text-gray-900">Contact</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {data.title || `Welcome to ${data.name}'s Portfolio`}
          </h2>
          {data.description && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {data.description}
            </p>
          )}
        </div>
      </section>

      {/* Content Sections */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* About Section */}
        {componentProps.about?.data && (
          <section id="about" className="py-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">About</h2>
            <div className="prose prose-lg max-w-none">
              <ClassicAboutContent data={componentProps.about.data} />
            </div>
          </section>
        )}

        {/* Projects Section */}
        {componentProps.projects?.data && componentProps.projects.data.length > 0 && (
          <section id="projects" className="py-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Projects</h2>
            <div className="grid gap-8 md:grid-cols-2">
              {componentProps.projects.data.map((project, index) => (
                <ClassicProjectCard key={index} project={project} />
              ))}
            </div>
          </section>
        )}

        {/* Skills Section */}
        {componentProps.skills?.data && componentProps.skills.data.length > 0 && (
          <section id="skills" className="py-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Skills</h2>
            <ClassicSkillsSection skills={componentProps.skills.data} />
          </section>
        )}

        {/* Contact Section */}
        {componentProps.contact?.data && (
          <section id="contact" className="py-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Contact</h2>
            <ClassicContactSection data={componentProps.contact.data} />
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>
              © {new Date().getFullYear()} {data.name}. 
              Hosted from{' '}
              <Link 
                href={repository?.url || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
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
 * Classic About Content Component
 */
function ClassicAboutContent({ data }) {
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
 * Classic Project Card Component
 */
function ClassicProjectCard({ project }) {
  return (
    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      {project.image && (
        <div className="mb-4">
          <Image
            src={project.image}
            alt={project.name || project.title}
            width={400}
            height={200}
            className="w-full h-48 object-cover rounded"
          />
        </div>
      )}
      
      <h3 className="text-xl font-semibold text-gray-900 mb-3">
        {project.name || project.title}
      </h3>
      <p className="text-gray-600 mb-4">{project.description}</p>
      
      {project.technologies && project.technologies.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Technologies:</h4>
          <div className="flex flex-wrap gap-2">
            {project.technologies.map((tech, index) => (
              <span 
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded border"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex space-x-4">
        {project.url && (
          <Link 
            href={project.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            View Project →
          </Link>
        )}
        {project.github && (
          <Link 
            href={project.github} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-gray-800 font-medium"
          >
            GitHub →
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * Classic Skills Section Component
 */
function ClassicSkillsSection({ skills }) {
  // Group skills by category if they have categories
  const groupedSkills = skills.reduce((groups, skill) => {
    const category = (typeof skill === 'object' && skill.category) || 'Technical Skills';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(skill);
    return groups;
  }, {});

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {Object.entries(groupedSkills).map(([category, categorySkills]) => (
        <div key={category} className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{category}</h3>
          <div className="space-y-2">
            {categorySkills.map((skill, index) => (
              <ClassicSkillItem key={index} skill={skill} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Classic Skill Item Component
 */
function ClassicSkillItem({ skill }) {
  const skillName = typeof skill === 'string' ? skill : skill.name || skill.title;
  const skillLevel = typeof skill === 'object' ? skill.level : null;
  const skillYears = typeof skill === 'object' ? skill.years : null;

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
      <span className="text-gray-700">{skillName}</span>
      <div className="text-sm text-gray-500">
        {skillLevel && <span>{skillLevel}</span>}
        {skillYears && <span className="ml-2">({skillYears} years)</span>}
      </div>
    </div>
  );
}

/**
 * Classic Contact Section Component
 */
function ClassicContactSection({ data }) {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
        <div className="space-y-3">
          {data.email && (
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              <Link href={`mailto:${data.email}`} className="text-blue-600 hover:text-blue-800">
                {data.email}
              </Link>
            </div>
          )}
          
          {data.phone && (
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              <Link href={`tel:${data.phone}`} className="text-blue-600 hover:text-blue-800">
                {data.phone}
              </Link>
            </div>
          )}
          
          {data.location && (
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700">{data.location}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Links</h3>
        <div className="space-y-3">
          {data.linkedin && (
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" />
              </svg>
              <Link 
                href={data.linkedin} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                LinkedIn Profile
              </Link>
            </div>
          )}
          
          {data.twitter && (
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
              </svg>
              <Link 
                href={data.twitter} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                Twitter Profile
              </Link>
            </div>
          )}
          
          {data.github && (
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
              </svg>
              <Link 
                href={data.github} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                GitHub Profile
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ClassicTemplate;