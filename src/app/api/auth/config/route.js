import { NextResponse } from 'next/server';
import { 
  validateOAuthConfig, 
  getOAuthSetupInstructions, 
  getOAuthConfigSummary,
  testOAuthConfig 
} from '@/lib/oauth-config.js';

/**
 * OAuth Configuration Status Endpoint
 * GET: Returns configuration status and setup instructions
 * POST: Tests OAuth configuration
 */

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';

    switch (action) {
      case 'status':
        return NextResponse.json({
          ...getOAuthConfigSummary(),
          timestamp: new Date().toISOString()
        });

      case 'instructions':
        return NextResponse.json({
          setup: getOAuthSetupInstructions(),
          timestamp: new Date().toISOString()
        });

      case 'validate':
        const validation = validateOAuthConfig();
        return NextResponse.json({
          validation: validation.getReport(),
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: status, instructions, or validate' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('OAuth config endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to get OAuth configuration status' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const action = body.action || 'test';

    switch (action) {
      case 'test':
        const testResult = await testOAuthConfig();
        return NextResponse.json({
          test: testResult,
          timestamp: new Date().toISOString()
        });

      case 'validate':
        const validation = validateOAuthConfig();
        return NextResponse.json({
          validation: validation.getReport(),
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: test or validate' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('OAuth config test error:', error);
    return NextResponse.json(
      { error: 'Failed to test OAuth configuration' },
      { status: 500 }
    );
  }
}