/**
 * Skills Section Component
 * Displays the skills section of a portfolio
 */

import React from 'react';

export function SkillsSection({ skills, className = '' }) {
  if (!skills || skills.length === 0) return null;

  // Determine if skills are grouped by category or flat list
  const isGrouped = skills.some(skill => 
    skill.category || (typeof skill === 'object' && skill.skills)
  );

  return (
    <section className={`${className}`}>
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Skills</h2>
        
        {isGrouped ? (
          <GroupedSkills skills={skills} />
        ) : (
          <FlatSkills skills={skills} />
        )}
      </div>
    </section>
  );
}

/**
 * Grouped Skills Display (by category)
 */
function GroupedSkills({ skills }) {
  // Group skills by category
  const groupedSkills = skills.reduce((acc, skill) => {
    if (typeof skill === 'object' && skill.skills) {
      // Handle format: { category: "Frontend", skills: [...] }
      const category = skill.category || skill.name || 'Other';
      acc[category] = skill.skills;
    } else if (typeof skill === 'object' && skill.category) {
      // Handle format: { name: "React", category: "Frontend", level: "Advanced" }
      const category = skill.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(skill);
    } else {
      // Handle ungrouped skills
      if (!acc['Other']) acc['Other'] = [];
      acc['Other'].push(skill);
    }
    return acc;
  }, {});

  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {Object.entries(groupedSkills).map(([category, categorySkills]) => (
        <div key={category} className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CategoryIcon category={category} />
            <span className="ml-2">{category}</span>
          </h3>
          
          <div className="space-y-3">
            {categorySkills.map((skill, index) => (
              <SkillItem key={index} skill={skill} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Flat Skills Display (no categories)
 */
function FlatSkills({ skills }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {skills.map((skill, index) => (
          <SkillItem key={index} skill={skill} />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual Skill Item Component
 */
function SkillItem({ skill }) {
  if (typeof skill === 'string') {
    return (
      <div className="flex items-center">
        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
        <span className="text-gray-700">{skill}</span>
      </div>
    );
  }

  const { name, level, years, proficiency, rating } = skill;
  const skillLevel = level || proficiency;
  const skillRating = rating || (years ? `${years} years` : null);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center flex-1">
        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
        <span className="text-gray-700">{name}</span>
      </div>
      
      {(skillLevel || skillRating) && (
        <div className="ml-4 text-right">
          {skillLevel && (
            <div className="text-sm text-gray-600">{skillLevel}</div>
          )}
          {skillRating && (
            <div className="text-xs text-gray-500">{skillRating}</div>
          )}
        </div>
      )}
      
      {/* Skill level indicator */}
      {skillLevel && (
        <div className="ml-2">
          <SkillLevelIndicator level={skillLevel} />
        </div>
      )}
    </div>
  );
}

/**
 * Skill Level Indicator Component
 */
function SkillLevelIndicator({ level }) {
  const levelValue = getLevelValue(level);
  
  return (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((dot) => (
        <div
          key={dot}
          className={`w-2 h-2 rounded-full ${
            dot <= levelValue ? 'bg-blue-500' : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Convert skill level to numeric value
 */
function getLevelValue(level) {
  if (typeof level === 'number') return Math.min(Math.max(level, 1), 5);
  
  const levelLower = level.toLowerCase();
  
  if (levelLower.includes('expert') || levelLower.includes('advanced')) return 5;
  if (levelLower.includes('proficient') || levelLower.includes('intermediate')) return 4;
  if (levelLower.includes('competent') || levelLower.includes('good')) return 3;
  if (levelLower.includes('basic') || levelLower.includes('beginner')) return 2;
  if (levelLower.includes('novice') || levelLower.includes('learning')) return 1;
  
  return 3; // Default to intermediate
}

/**
 * Category Icon Component
 */
function CategoryIcon({ category }) {
  const categoryLower = category.toLowerCase();
  
  if (categoryLower.includes('frontend') || categoryLower.includes('ui') || categoryLower.includes('web')) {
    return (
      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    );
  }
  
  if (categoryLower.includes('backend') || categoryLower.includes('server') || categoryLower.includes('api')) {
    return (
      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
    );
  }
  
  if (categoryLower.includes('database') || categoryLower.includes('data')) {
    return (
      <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    );
  }
  
  if (categoryLower.includes('mobile') || categoryLower.includes('ios') || categoryLower.includes('android')) {
    return (
      <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  }
  
  if (categoryLower.includes('devops') || categoryLower.includes('deployment') || categoryLower.includes('cloud')) {
    return (
      <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
      </svg>
    );
  }
  
  if (categoryLower.includes('design') || categoryLower.includes('ux') || categoryLower.includes('ui')) {
    return (
      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
      </svg>
    );
  }
  
  // Default icon
  return (
    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  );
}

export default SkillsSection;