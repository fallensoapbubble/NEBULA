/**
 * Portfolio Data Standardizer
 * Creates standard portfolio data schema and transforms various repository file formats
 * to a unified structure that templates can use consistently
 */

/**
 * Standard Portfolio Data Schema
 * Defines the unified structure that all templates should expect
 */
export const STANDARD_PORTFOLIO_SCHEMA = {
  // Personal Information
  personal: {
    name: { type: 'string', required: true, description: 'Full name' },
    title: { type: 'string', required: false, description: 'Professional title or tagline' },
    description: { type: 'string', required: false, description: 'Brief personal description' },
    bio: { type: 'string', required: false, description: 'Longer biographical text' },
    location: { type: 'string', required: false, description: 'Current location' },
    avatar: { type: 'string', required: false, description: 'Profile image URL' },
    website: { type: 'string', required: false, description: 'Personal website URL' }
  },

  // Contact Information
  contact: {
    email: { type: 'string', required: false, description: 'Email address' },
    phone: { type: 'string', required: false, description: 'Phone number' },
    social: {
      type: 'array',
      required: false,
      description: 'Social media links',
      items: {
        platform: { type: 'string', required: true, description: 'Platform name (github, linkedin, twitter, etc.)' },
        url: { type: 'string', required: true, description: 'Profile URL' },
        username: { type: 'string', required: false, description: 'Username on platform' }
      }
    }
  },

  // Professional Experience
  experience: {
    type: 'array',
    required: false,
    description: 'Work experience entries',
    items: {
      title: { type: 'string', required: true, description: 'Job title' },
      company: { type: 'string', required: true, description: 'Company name' },
      location: { type: 'string', required: false, description: 'Job location' },
      startDate: { type: 'string', required: true, description: 'Start date (ISO format or readable)' },
      endDate: { type: 'string', required: false, description: 'End date (ISO format or readable, null for current)' },
      description: { type: 'string', required: false, description: 'Job description' },
      highlights: { type: 'array', required: false, description: 'Key achievements', items: { type: 'string' } },
      technologies: { type: 'array', required: false, description: 'Technologies used', items: { type: 'string' } }
    }
  },

  // Projects
  projects: {
    type: 'array',
    required: false,
    description: 'Portfolio projects',
    items: {
      name: { type: 'string', required: true, description: 'Project name' },
      description: { type: 'string', required: true, description: 'Project description' },
      url: { type: 'string', required: false, description: 'Live project URL' },
      repository: { type: 'string', required: false, description: 'Source code repository URL' },
      image: { type: 'string', required: false, description: 'Project screenshot URL' },
      technologies: { type: 'array', required: false, description: 'Technologies used', items: { type: 'string' } },
      status: { type: 'string', required: false, description: 'Project status (completed, in-progress, planned)' },
      featured: { type: 'boolean', required: false, description: 'Whether project should be featured' },
      startDate: { type: 'string', required: false, description: 'Project start date' },
      endDate: { type: 'string', required: false, description: 'Project completion date' }
    }
  },

  // Skills
  skills: {
    type: 'array',
    required: false,
    description: 'Technical and professional skills',
    items: {
      name: { type: 'string', required: true, description: 'Skill name' },
      category: { type: 'string', required: false, description: 'Skill category (programming, design, etc.)' },
      level: { type: 'string', required: false, description: 'Proficiency level (beginner, intermediate, advanced, expert)' },
      years: { type: 'number', required: false, description: 'Years of experience' }
    }
  },

  // Education
  education: {
    type: 'array',
    required: false,
    description: 'Educational background',
    items: {
      institution: { type: 'string', required: true, description: 'School/University name' },
      degree: { type: 'string', required: true, description: 'Degree or certification' },
      field: { type: 'string', required: false, description: 'Field of study' },
      startDate: { type: 'string', required: false, description: 'Start date' },
      endDate: { type: 'string', required: false, description: 'Graduation date' },
      gpa: { type: 'string', required: false, description: 'GPA or grade' },
      honors: { type: 'array', required: false, description: 'Honors and awards', items: { type: 'string' } }
    }
  },

  // Certifications
  certifications: {
    type: 'array',
    required: false,
    description: 'Professional certifications',
    items: {
      name: { type: 'string', required: true, description: 'Certification name' },
      issuer: { type: 'string', required: true, description: 'Issuing organization' },
      date: { type: 'string', required: false, description: 'Date obtained' },
      expiryDate: { type: 'string', required: false, description: 'Expiry date' },
      credentialId: { type: 'string', required: false, description: 'Credential ID' },
      url: { type: 'string', required: false, description: 'Verification URL' }
    }
  },

  // Metadata
  metadata: {
    lastUpdated: { type: 'string', required: false, description: 'Last update timestamp' },
    version: { type: 'string', required: false, description: 'Schema version' },
    template: { type: 'string', required: false, description: 'Template identifier' },
    theme: { type: 'object', required: false, description: 'Theme customization settings' }
  }
};

/**
 * Portfolio Data Standardizer class
 * Handles transformation of various data formats to standard schema
 */
export class PortfolioDataStandardizer {
  constructor(options = {}) {
    this.options = {
      strictValidation: options.strictValidation || false,
      allowUnknownFields: options.allowUnknownFields !== false,
      schemaVersion: options.schemaVersion || '1.0.0',
      ...options
    };
  }

  /**
   * Transform parsed portfolio content to standard schema
   * @param {object} parsedContent - Content from PortfolioContentAnalyzer
   * @returns {Promise<{success: boolean, data?: object, errors?: string[], warnings?: string[]}>}
   */
  async standardizePortfolioData(parsedContent) {
    try {
      const standardData = {
        personal: {},
        contact: {},
        experience: [],
        projects: [],
        skills: [],
        education: [],
        certifications: [],
        metadata: {
          lastUpdated: new Date().toISOString(),
          version: this.options.schemaVersion,
          standardizedAt: new Date().toISOString()
        }
      };

      const errors = [];
      const warnings = [];

      // Transform each content type
      await this.transformPersonalData(parsedContent, standardData, errors, warnings);
      await this.transformContactData(parsedContent, standardData, errors, warnings);
      await this.transformExperienceData(parsedContent, standardData, errors, warnings);
      await this.transformProjectsData(parsedContent, standardData, errors, warnings);
      await this.transformSkillsData(parsedContent, standardData, errors, warnings);
      await this.transformEducationData(parsedContent, standardData, errors, warnings);
      await this.transformCertificationsData(parsedContent, standardData, errors, warnings);

      // Validate the standardized data
      const validation = await this.validateStandardData(standardData);
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);

      const isSuccessful = this.options.strictValidation ? errors.length === 0 : true;
      
      return {
        success: isSuccessful,
        data: standardData,
        errors,
        warnings,
        validation: {
          isValid: validation.isValid,
          completeness: validation.completeness,
          score: validation.score
        }
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Standardization failed: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Transform personal information from various sources
   */
  async transformPersonalData(parsedContent, standardData, errors, warnings) {
    const sources = ['data', 'portfolio', 'about', 'readme'];
    
    for (const source of sources) {
      if (!parsedContent[source]) continue;

      for (const item of parsedContent[source]) {
        if (!item.metadata.parseSuccess) continue;

        const content = item.content;
        
        // Handle different content formats
        if (source === 'about' || source === 'readme') {
          // Markdown content
          if (content.frontmatter) {
            this.extractPersonalFromObject(content.frontmatter, standardData.personal);
          }
          if (content.body && !standardData.personal.bio) {
            standardData.personal.bio = content.body.trim();
          }
        } else {
          // JSON/YAML content
          this.extractPersonalFromObject(content, standardData.personal);
        }
      }
    }

    // Validate required fields
    if (!standardData.personal.name) {
      if (this.options.strictValidation) {
        errors.push('Personal name is required but not found');
      } else {
        warnings.push('Personal name is missing - consider adding it to improve portfolio completeness');
      }
    }
  }

  /**
   * Extract personal data from object
   */
  extractPersonalFromObject(obj, personal) {
    const fieldMappings = {
      name: ['name', 'fullName', 'full_name', 'displayName', 'display_name'],
      title: ['title', 'jobTitle', 'job_title', 'position', 'role', 'tagline'],
      description: ['description', 'summary', 'intro', 'about'],
      bio: ['bio', 'biography', 'about', 'description'],
      location: ['location', 'address', 'city', 'country'],
      avatar: ['avatar', 'photo', 'image', 'picture', 'profileImage', 'profile_image'],
      website: ['website', 'url', 'homepage', 'blog', 'site']
    };

    for (const [standardField, possibleFields] of Object.entries(fieldMappings)) {
      if (personal[standardField]) continue; // Don't overwrite existing data

      for (const field of possibleFields) {
        if (obj[field] && typeof obj[field] === 'string') {
          personal[standardField] = obj[field].trim();
          break;
        }
      }
    }
  }

  /**
   * Transform contact information
   */
  async transformContactData(parsedContent, standardData, errors, warnings) {
    const sources = ['data', 'portfolio', 'contact', 'social'];
    
    for (const source of sources) {
      if (!parsedContent[source]) continue;

      for (const item of parsedContent[source]) {
        if (!item.metadata.parseSuccess) continue;

        const content = item.content;
        this.extractContactFromObject(content, standardData.contact);
      }
    }
  }

  /**
   * Extract contact data from object
   */
  extractContactFromObject(obj, contact) {
    // Email
    const emailFields = ['email', 'mail', 'contact_email', 'contactEmail'];
    for (const field of emailFields) {
      if (obj[field] && !contact.email) {
        contact.email = obj[field].trim();
        break;
      }
    }

    // Phone
    const phoneFields = ['phone', 'telephone', 'mobile', 'cell', 'contact_phone'];
    for (const field of phoneFields) {
      if (obj[field] && !contact.phone) {
        contact.phone = obj[field].trim();
        break;
      }
    }

    // Social media
    if (!contact.social) contact.social = [];
    
    const socialFields = ['social', 'links', 'socialLinks', 'social_links'];
    for (const field of socialFields) {
      if (obj[field] && Array.isArray(obj[field])) {
        for (const social of obj[field]) {
          if (social.platform && social.url) {
            contact.social.push({
              platform: social.platform.toLowerCase(),
              url: social.url,
              username: social.username || this.extractUsernameFromUrl(social.url, social.platform)
            });
          }
        }
      }
    }

    // Direct social platform fields
    const platformMappings = {
      github: ['github', 'githubUrl', 'github_url'],
      linkedin: ['linkedin', 'linkedinUrl', 'linkedin_url'],
      twitter: ['twitter', 'twitterUrl', 'twitter_url'],
      instagram: ['instagram', 'instagramUrl', 'instagram_url'],
      facebook: ['facebook', 'facebookUrl', 'facebook_url']
    };

    for (const [platform, fields] of Object.entries(platformMappings)) {
      for (const field of fields) {
        if (obj[field] && !contact.social.some(s => s.platform === platform)) {
          contact.social.push({
            platform,
            url: obj[field],
            username: this.extractUsernameFromUrl(obj[field], platform)
          });
          break;
        }
      }
    }
  }

  /**
   * Extract username from social media URL
   */
  extractUsernameFromUrl(url, platform) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Remove leading slash and get first path segment
      const segments = pathname.split('/').filter(s => s.length > 0);
      return segments[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Transform experience data
   */
  async transformExperienceData(parsedContent, standardData, errors, warnings) {
    const sources = ['experience', 'work', 'jobs', 'employment'];
    
    for (const source of sources) {
      if (!parsedContent[source]) continue;

      for (const item of parsedContent[source]) {
        if (!item.metadata.parseSuccess) continue;

        const content = item.content;
        if (Array.isArray(content)) {
          for (const exp of content) {
            const standardExp = this.transformExperienceItem(exp);
            if (standardExp) {
              standardData.experience.push(standardExp);
            }
          }
        } else if (content.experience && Array.isArray(content.experience)) {
          for (const exp of content.experience) {
            const standardExp = this.transformExperienceItem(exp);
            if (standardExp) {
              standardData.experience.push(standardExp);
            }
          }
        }
      }
    }

    // Sort by start date (most recent first)
    standardData.experience.sort((a, b) => {
      const dateA = new Date(a.startDate || '1900-01-01');
      const dateB = new Date(b.startDate || '1900-01-01');
      return dateB - dateA;
    });
  }

  /**
   * Transform individual experience item
   */
  transformExperienceItem(exp) {
    if (!exp || typeof exp !== 'object') return null;

    const standardExp = {};

    // Required fields
    const titleFields = ['title', 'position', 'role', 'jobTitle', 'job_title'];
    const companyFields = ['company', 'employer', 'organization', 'workplace'];

    for (const field of titleFields) {
      if (exp[field]) {
        standardExp.title = exp[field].trim();
        break;
      }
    }

    for (const field of companyFields) {
      if (exp[field]) {
        standardExp.company = exp[field].trim();
        break;
      }
    }

    if (!standardExp.title || !standardExp.company) {
      return null; // Skip invalid entries
    }

    // Optional fields
    const fieldMappings = {
      location: ['location', 'city', 'address'],
      startDate: ['startDate', 'start_date', 'from', 'began'],
      endDate: ['endDate', 'end_date', 'to', 'until', 'ended'],
      description: ['description', 'summary', 'details', 'responsibilities']
    };

    for (const [standardField, possibleFields] of Object.entries(fieldMappings)) {
      for (const field of possibleFields) {
        if (exp[field]) {
          standardExp[standardField] = exp[field];
          break;
        }
      }
    }

    // Handle arrays
    if (exp.highlights && Array.isArray(exp.highlights)) {
      standardExp.highlights = exp.highlights.filter(h => typeof h === 'string');
    }

    if (exp.technologies && Array.isArray(exp.technologies)) {
      standardExp.technologies = exp.technologies.filter(t => typeof t === 'string');
    } else if (exp.skills && Array.isArray(exp.skills)) {
      standardExp.technologies = exp.skills.filter(s => typeof s === 'string');
    }

    return standardExp;
  }

  /**
   * Transform projects data
   */
  async transformProjectsData(parsedContent, standardData, errors, warnings) {
    const sources = ['projects', 'portfolio', 'work'];
    
    for (const source of sources) {
      if (!parsedContent[source]) continue;

      for (const item of parsedContent[source]) {
        if (!item.metadata.parseSuccess) continue;

        const content = item.content;
        if (Array.isArray(content)) {
          for (const proj of content) {
            const standardProj = this.transformProjectItem(proj);
            if (standardProj) {
              standardData.projects.push(standardProj);
            }
          }
        } else if (content.projects && Array.isArray(content.projects)) {
          for (const proj of content.projects) {
            const standardProj = this.transformProjectItem(proj);
            if (standardProj) {
              standardData.projects.push(standardProj);
            }
          }
        }
      }
    }

    // Sort by featured status and date
    standardData.projects.sort((a, b) => {
      if (a.featured !== b.featured) {
        return b.featured ? 1 : -1;
      }
      const dateA = new Date(a.startDate || a.endDate || '1900-01-01');
      const dateB = new Date(b.startDate || b.endDate || '1900-01-01');
      return dateB - dateA;
    });
  }

  /**
   * Transform individual project item
   */
  transformProjectItem(proj) {
    if (!proj || typeof proj !== 'object') return null;

    const standardProj = {};

    // Required fields
    const nameFields = ['name', 'title', 'projectName', 'project_name'];
    const descFields = ['description', 'summary', 'details', 'about'];

    for (const field of nameFields) {
      if (proj[field]) {
        standardProj.name = proj[field].trim();
        break;
      }
    }

    for (const field of descFields) {
      if (proj[field]) {
        standardProj.description = proj[field].trim();
        break;
      }
    }

    if (!standardProj.name || !standardProj.description) {
      return null; // Skip invalid entries
    }

    // Optional fields
    const fieldMappings = {
      url: ['url', 'link', 'demo', 'live', 'website', 'homepage'],
      repository: ['repository', 'repo', 'github', 'source', 'code'],
      image: ['image', 'screenshot', 'preview', 'thumbnail', 'photo'],
      status: ['status', 'state', 'progress'],
      startDate: ['startDate', 'start_date', 'began', 'created'],
      endDate: ['endDate', 'end_date', 'completed', 'finished']
    };

    for (const [standardField, possibleFields] of Object.entries(fieldMappings)) {
      for (const field of possibleFields) {
        if (proj[field]) {
          standardProj[standardField] = proj[field];
          break;
        }
      }
    }

    // Handle boolean fields
    if (proj.featured !== undefined) {
      standardProj.featured = Boolean(proj.featured);
    }

    // Handle arrays
    if (proj.technologies && Array.isArray(proj.technologies)) {
      standardProj.technologies = proj.technologies.filter(t => typeof t === 'string');
    } else if (proj.tech && Array.isArray(proj.tech)) {
      standardProj.technologies = proj.tech.filter(t => typeof t === 'string');
    } else if (proj.stack && Array.isArray(proj.stack)) {
      standardProj.technologies = proj.stack.filter(t => typeof t === 'string');
    }

    return standardProj;
  }

  /**
   * Transform skills data
   */
  async transformSkillsData(parsedContent, standardData, errors, warnings) {
    const sources = ['skills', 'technologies', 'tech'];
    
    for (const source of sources) {
      if (!parsedContent[source]) continue;

      for (const item of parsedContent[source]) {
        if (!item.metadata.parseSuccess) continue;

        const content = item.content;
        if (Array.isArray(content)) {
          for (const skill of content) {
            const standardSkill = this.transformSkillItem(skill);
            if (standardSkill) {
              standardData.skills.push(standardSkill);
            }
          }
        } else if (content.skills && Array.isArray(content.skills)) {
          for (const skill of content.skills) {
            const standardSkill = this.transformSkillItem(skill);
            if (standardSkill) {
              standardData.skills.push(standardSkill);
            }
          }
        }
      }
    }

    // Remove duplicates and sort by category
    const uniqueSkills = new Map();
    for (const skill of standardData.skills) {
      const key = skill.name.toLowerCase();
      if (!uniqueSkills.has(key)) {
        uniqueSkills.set(key, skill);
      } else if (skill.level && !uniqueSkills.get(key).level) {
        // Replace with version that has level information
        uniqueSkills.set(key, skill);
      }
    }
    
    standardData.skills = Array.from(uniqueSkills.values()).sort((a, b) => {
      if (a.category !== b.category) {
        return (a.category || '').localeCompare(b.category || '');
      }
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Transform individual skill item
   */
  transformSkillItem(skill) {
    if (!skill) return null;

    // Handle string skills
    if (typeof skill === 'string') {
      return { name: skill.trim() };
    }

    if (typeof skill !== 'object') return null;

    const standardSkill = {};

    // Required field
    const nameFields = ['name', 'skill', 'technology', 'tech'];
    for (const field of nameFields) {
      if (skill[field]) {
        standardSkill.name = skill[field].trim();
        break;
      }
    }

    if (!standardSkill.name) return null;

    // Optional fields
    const fieldMappings = {
      category: ['category', 'type', 'group', 'area'],
      level: ['level', 'proficiency', 'expertise', 'rating'],
      years: ['years', 'experience', 'yearsOfExperience', 'years_of_experience']
    };

    for (const [standardField, possibleFields] of Object.entries(fieldMappings)) {
      for (const field of possibleFields) {
        if (skill[field] !== undefined) {
          if (standardField === 'years') {
            const years = parseInt(skill[field]);
            if (!isNaN(years)) {
              standardSkill[standardField] = years;
            }
          } else {
            standardSkill[standardField] = skill[field];
          }
          break;
        }
      }
    }

    return standardSkill;
  }

  /**
   * Transform education data
   */
  async transformEducationData(parsedContent, standardData, errors, warnings) {
    const sources = ['education', 'school', 'university'];
    
    for (const source of sources) {
      if (!parsedContent[source]) continue;

      for (const item of parsedContent[source]) {
        if (!item.metadata.parseSuccess) continue;

        const content = item.content;
        if (Array.isArray(content)) {
          for (const edu of content) {
            const standardEdu = this.transformEducationItem(edu);
            if (standardEdu) {
              standardData.education.push(standardEdu);
            }
          }
        } else if (content.education && Array.isArray(content.education)) {
          for (const edu of content.education) {
            const standardEdu = this.transformEducationItem(edu);
            if (standardEdu) {
              standardData.education.push(standardEdu);
            }
          }
        }
      }
    }

    // Sort by end date (most recent first)
    standardData.education.sort((a, b) => {
      const dateA = new Date(a.endDate || a.startDate || '1900-01-01');
      const dateB = new Date(b.endDate || b.startDate || '1900-01-01');
      return dateB - dateA;
    });
  }

  /**
   * Transform individual education item
   */
  transformEducationItem(edu) {
    if (!edu || typeof edu !== 'object') return null;

    const standardEdu = {};

    // Required fields
    const institutionFields = ['institution', 'school', 'university', 'college'];
    const degreeFields = ['degree', 'qualification', 'program', 'course'];

    for (const field of institutionFields) {
      if (edu[field]) {
        standardEdu.institution = edu[field].trim();
        break;
      }
    }

    for (const field of degreeFields) {
      if (edu[field]) {
        standardEdu.degree = edu[field].trim();
        break;
      }
    }

    if (!standardEdu.institution || !standardEdu.degree) {
      return null; // Skip invalid entries
    }

    // Optional fields
    const fieldMappings = {
      field: ['field', 'major', 'subject', 'area', 'fieldOfStudy', 'field_of_study'],
      startDate: ['startDate', 'start_date', 'from', 'began'],
      endDate: ['endDate', 'end_date', 'to', 'graduated', 'graduation'],
      gpa: ['gpa', 'grade', 'score', 'result']
    };

    for (const [standardField, possibleFields] of Object.entries(fieldMappings)) {
      for (const field of possibleFields) {
        if (edu[field]) {
          standardEdu[standardField] = edu[field];
          break;
        }
      }
    }

    // Handle honors array
    if (edu.honors && Array.isArray(edu.honors)) {
      standardEdu.honors = edu.honors.filter(h => typeof h === 'string');
    } else if (edu.awards && Array.isArray(edu.awards)) {
      standardEdu.honors = edu.awards.filter(a => typeof a === 'string');
    }

    return standardEdu;
  }

  /**
   * Transform certifications data
   */
  async transformCertificationsData(parsedContent, standardData, errors, warnings) {
    const sources = ['certifications', 'certificates', 'certs'];
    
    for (const source of sources) {
      if (!parsedContent[source]) continue;

      for (const item of parsedContent[source]) {
        if (!item.metadata.parseSuccess) continue;

        const content = item.content;
        if (Array.isArray(content)) {
          for (const cert of content) {
            const standardCert = this.transformCertificationItem(cert);
            if (standardCert) {
              standardData.certifications.push(standardCert);
            }
          }
        } else if (content.certifications && Array.isArray(content.certifications)) {
          for (const cert of content.certifications) {
            const standardCert = this.transformCertificationItem(cert);
            if (standardCert) {
              standardData.certifications.push(standardCert);
            }
          }
        }
      }
    }

    // Sort by date (most recent first)
    standardData.certifications.sort((a, b) => {
      const dateA = new Date(a.date || '1900-01-01');
      const dateB = new Date(b.date || '1900-01-01');
      return dateB - dateA;
    });
  }

  /**
   * Transform individual certification item
   */
  transformCertificationItem(cert) {
    if (!cert || typeof cert !== 'object') return null;

    const standardCert = {};

    // Required fields
    const nameFields = ['name', 'title', 'certification', 'certificate'];
    const issuerFields = ['issuer', 'organization', 'provider', 'authority'];

    for (const field of nameFields) {
      if (cert[field]) {
        standardCert.name = cert[field].trim();
        break;
      }
    }

    for (const field of issuerFields) {
      if (cert[field]) {
        standardCert.issuer = cert[field].trim();
        break;
      }
    }

    if (!standardCert.name || !standardCert.issuer) {
      return null; // Skip invalid entries
    }

    // Optional fields
    const fieldMappings = {
      date: ['date', 'issued', 'obtained', 'earned'],
      expiryDate: ['expiryDate', 'expiry_date', 'expires', 'expiration'],
      credentialId: ['credentialId', 'credential_id', 'id', 'certificateId'],
      url: ['url', 'link', 'verification', 'badge']
    };

    for (const [standardField, possibleFields] of Object.entries(fieldMappings)) {
      for (const field of possibleFields) {
        if (cert[field]) {
          standardCert[standardField] = cert[field];
          break;
        }
      }
    }

    return standardCert;
  }

  /**
   * Validate standardized data against schema
   * @param {object} data - Standardized portfolio data
   * @returns {Promise<{isValid: boolean, errors: string[], warnings: string[], completeness: number, score: number}>}
   */
  async validateStandardData(data) {
    const errors = [];
    const warnings = [];
    let completeness = 0;
    const maxScore = 100;

    // Validate personal information (30 points)
    if (data.personal.name) {
      completeness += 15;
    } else {
      errors.push('Personal name is required');
    }

    if (data.personal.title) completeness += 5;
    if (data.personal.description || data.personal.bio) completeness += 10;

    // Validate contact information (20 points)
    if (data.contact.email) completeness += 10;
    if (data.contact.social && data.contact.social.length > 0) completeness += 10;

    // Validate experience (20 points)
    if (data.experience && data.experience.length > 0) {
      completeness += 20;
    } else {
      warnings.push('No work experience found - consider adding experience data');
    }

    // Validate projects (20 points)
    if (data.projects && data.projects.length > 0) {
      completeness += 20;
    } else {
      warnings.push('No projects found - consider adding project data');
    }

    // Validate skills (10 points)
    if (data.skills && data.skills.length > 0) {
      completeness += 10;
    } else {
      warnings.push('No skills found - consider adding skills data');
    }

    // Additional validation rules
    if (data.contact.social) {
      for (const social of data.contact.social) {
        if (!social.platform || !social.url) {
          errors.push('Social media entries must have platform and url');
        }
      }
    }

    if (data.experience) {
      for (const exp of data.experience) {
        if (!exp.title || !exp.company) {
          errors.push('Experience entries must have title and company');
        }
      }
    }

    if (data.projects) {
      for (const proj of data.projects) {
        if (!proj.name || !proj.description) {
          errors.push('Project entries must have name and description');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      completeness: Math.round((completeness / maxScore) * 100),
      score: completeness
    };
  }

  /**
   * Get schema information
   * @returns {object} Schema structure and metadata
   */
  getSchemaInfo() {
    return {
      version: this.options.schemaVersion,
      schema: STANDARD_PORTFOLIO_SCHEMA,
      supportedFormats: ['json', 'yaml', 'markdown'],
      requiredFields: ['personal.name'],
      recommendedFields: [
        'personal.title',
        'personal.description',
        'contact.email',
        'projects',
        'experience'
      ]
    };
  }

  /**
   * Create empty portfolio data structure
   * @returns {object} Empty standardized portfolio structure
   */
  createEmptyPortfolio() {
    return {
      personal: {},
      contact: { social: [] },
      experience: [],
      projects: [],
      skills: [],
      education: [],
      certifications: [],
      metadata: {
        lastUpdated: new Date().toISOString(),
        version: this.options.schemaVersion,
        template: null,
        theme: {}
      }
    };
  }
}
/**
 * Cr
eate a new PortfolioDataStandardizer instance
 * @param {object} options - Configuration options
 * @returns {PortfolioDataStandardizer} New standardizer instance
 */
export function createPortfolioDataStandardizer(options = {}) {
  return new PortfolioDataStandardizer(options);
}

/**
 * Standardize portfolio data (convenience function)
 * @param {object} parsedContent - Content from PortfolioContentAnalyzer
 * @param {object} options - Configuration options
 * @returns {Promise<object>} Standardization results
 */
export async function standardizePortfolioData(parsedContent, options = {}) {
  const standardizer = createPortfolioDataStandardizer(options);
  return standardizer.standardizePortfolioData(parsedContent);
}

/**
 * Validate portfolio data against standard schema
 * @param {object} data - Portfolio data to validate
 * @param {object} options - Configuration options
 * @returns {Promise<object>} Validation results
 */
export async function validatePortfolioData(data, options = {}) {
  const standardizer = createPortfolioDataStandardizer(options);
  return standardizer.validateStandardData(data);
}

/**
 * Get the current portfolio schema
 * @returns {object} Portfolio schema definition
 */
export function getPortfolioSchema() {
  return STANDARD_PORTFOLIO_SCHEMA;
}