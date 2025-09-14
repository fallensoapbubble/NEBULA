/**
 * Simplified NextAuth API Route Handler
 * Temporarily disabled to resolve build issues
 */

export async function GET(request) {
  return new Response(JSON.stringify({ 
    error: 'Authentication temporarily disabled',
    message: 'NextAuth route is temporarily simplified to resolve build issues'
  }), {
    status: 501,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function POST(request) {
  return new Response(JSON.stringify({ 
    error: 'Authentication temporarily disabled',
    message: 'NextAuth route is temporarily simplified to resolve build issues'
  }), {
    status: 501,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}