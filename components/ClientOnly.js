'use client';

import React, { useState, useEffect } from 'react';

/**
 * ClientOnly Component
 * Prevents hydration mismatches by only rendering children on the client
 */
export default function ClientOnly({ children, fallback = null }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return fallback;
  }

  return children;
}