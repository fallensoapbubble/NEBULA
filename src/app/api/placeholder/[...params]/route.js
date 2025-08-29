/**
 * Placeholder Image API
 * Generates placeholder images for template previews
 */

import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text') || 'Template Preview';
  const width = parseInt(params.params[0]) || 600;
  const height = parseInt(params.params[1]) || 400;

  // Create SVG placeholder
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:rgba(255,255,255,0.1);stop-opacity:1" />
          <stop offset="100%" style="stop-color:rgba(255,255,255,0.05);stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="#1a1a1a"/>
      <rect width="100%" height="100%" fill="url(#grad)"/>
      <rect x="2" y="2" width="${width-4}" height="${height-4}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
      <text x="50%" y="50%" font-family="Inter, sans-serif" font-size="18" font-weight="500" fill="rgba(255,255,255,0.8)" text-anchor="middle" dominant-baseline="middle">
        ${text.replace(/\+/g, ' ')}
      </text>
    </svg>
  `;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}