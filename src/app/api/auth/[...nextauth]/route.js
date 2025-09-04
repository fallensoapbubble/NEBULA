/**
 * NextAuth API Route Handler
 * Handles all NextAuth.js authentication routes
 */

import { NextResponse } from 'next/server';

// Temporarily disabled NextAuth to fix build issues
// TODO: Re-enable once environment is properly configured

export async function GET(request) {
  return NextResponse.json({
    error: 'NextAuth temporarily disabled',
    message: 'Authentication service is being configured'
  }, { status: 503 });
}

export async function POST(request) {
  return NextResponse.json({
    error: 'NextAuth temporarily disabled',
    message: 'Authentication service is being configured'
  }, { status: 503 });
}