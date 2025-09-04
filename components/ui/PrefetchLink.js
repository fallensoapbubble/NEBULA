/**
 * Enhanced Link component with intelligent prefetching
 * Optimizes navigation performance by prefetching likely-visited pages
 */

import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';
import { prefetchManager } from '../../lib/performance-optimizer';

export default function PrefetchLink({
  href,
  children,
  prefetch = true,
  priority = 'medium',
  prefetchOn = 'hover', // 'hover', 'visible', 'immediate'
  className = '',
  ...props
}) {
  const linkRef = useRef(null);
  const router = useRouter();
  const hasPrefetched = useRef(false);

  const handlePrefetch = () => {
    if (!hasPrefetched.current && prefetch) {
      prefetchManager.prefetch(href, priority);
      hasPrefetched.current = true;
    }
  };

  useEffect(() => {
    if (prefetchOn === 'immediate') {
      handlePrefetch();
    } else if (prefetchOn === 'visible') {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            handlePrefetch();
            observer.disconnect();
          }
        },
        { threshold: 0.1, rootMargin: '100px' }
      );

      if (linkRef.current) {
        observer.observe(linkRef.current);
      }

      return () => observer.disconnect();
    }
  }, [prefetchOn, href]);

  const handleMouseEnter = () => {
    if (prefetchOn === 'hover') {
      handlePrefetch();
    }
  };

  return (
    <Link
      href={href}
      ref={linkRef}
      className={className}
      onMouseEnter={handleMouseEnter}
      {...props}
    >
      {children}
    </Link>
  );
}

/**
 * Navigation link with context-aware prefetching
 */
export function NavLink({ 
  href, 
  children, 
  isActive, 
  className = '',
  ...props 
}) {
  const baseClasses = 'transition-colors duration-200';
  const activeClasses = isActive 
    ? 'text-white bg-white/10' 
    : 'text-white/70 hover:text-white hover:bg-white/5';

  return (
    <PrefetchLink
      href={href}
      className={`${baseClasses} ${activeClasses} ${className}`}
      priority="high"
      prefetchOn="hover"
      {...props}
    >
      {children}
    </PrefetchLink>
  );
}

/**
 * Template card link with preview prefetching
 */
export function TemplateLink({ 
  template, 
  children, 
  className = '',
  ...props 
}) {
  const href = `/templates/${template.owner}/${template.repo}`;
  
  return (
    <PrefetchLink
      href={href}
      className={className}
      priority="medium"
      prefetchOn="visible"
      {...props}
    >
      {children}
    </PrefetchLink>
  );
}

/**
 * Portfolio link with user context prefetching
 */
export function PortfolioLink({ 
  username, 
  repo, 
  children, 
  className = '',
  ...props 
}) {
  const href = `/${username}/${repo}`;
  
  return (
    <PrefetchLink
      href={href}
      className={className}
      priority="high"
      prefetchOn="hover"
      {...props}
    >
      {children}
    </PrefetchLink>
  );
}