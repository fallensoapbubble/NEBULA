/**
 * Temporary Auth API Route Handler
 * Simplified authentication endpoints for build compatibility
 */

import { NextResponse } from 'next/server';

export async function GET(request) {
  const { pathname } = new URL(request.url);
  
  // Handle session endpoint
  if (pathname.includes('/session')) {
    return NextResponse.json({
      user: null,
      expires: null
    });
  }
  
  // Handle providers endpoint
  if (pathname.includes('/providers')) {
    return NextResponse.json({
      github: {
        id: 'github',
        name: 'GitHub',
        type: 'oauth',
        signinUrl: '/auth/signin',
        callbackUrl: '/api/auth/callback/github'
      }
    });
  }
  
  // Default response
  return NextResponse.json({ 
    message: 'Authentication service available',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request) {
  return NextResponse.json({ 
    message: 'Authentication service available',
    timestamp: new Date().toISOString()
  });
}