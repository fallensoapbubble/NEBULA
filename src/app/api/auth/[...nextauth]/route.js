/**
 * NextAuth API Route Handler
 * Temporarily disabled for production build
 */

import { NextResponse } from 'next/server';

export async function GET(request) {
  return NextResponse.json({
    error: 'Authentication temporarily disabled',
    message: 'NextAuth configuration needs to be fixed for production build'
  }, { status: 503 });
}

export async function POST(request) {
  return NextResponse.json({
    error: 'Authentication temporarily disabled', 
    message: 'NextAuth configuration needs to be fixed for production build'
  }, { status: 503 });
}