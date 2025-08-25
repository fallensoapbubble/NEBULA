/**
 * Content Editor Save API Route
 * Temporarily disabled for build fix
 */

import { NextResponse } from 'next/server';

/**
 * POST /api/editor/save
 * Save portfolio content to GitHub repository
 */
export async function POST(request) {
  return NextResponse.json(
    { error: 'Temporarily disabled - build fix' },
    { status: 503 }
  );
}

/**
 * PUT /api/editor/save
 * Save specific content files to GitHub repository
 */
export async function PUT(request) {
  return NextResponse.json(
    { error: 'Temporarily disabled - build fix' },
    { status: 503 }
  );
}