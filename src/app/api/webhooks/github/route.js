import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * GitHub Webhook Handler
 * Automatically revalidates portfolio pages when repositories are updated
 */

export async function POST(request) {
  try {
    // Get request body and headers
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    const event = request.headers.get('x-github-event');
    const delivery = request.headers.get('x-github-delivery');

    // Verify webhook signature
    if (!verifyGitHubWebhook(body, signature)) {
      console.warn('Invalid GitHub webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (parseError) {
      console.error('Failed to parse webhook payload:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Log webhook event
    console.log(`GitHub webhook received: ${event} (${delivery})`);

    // Handle different webhook events
    const result = await handleWebhookEvent(event, payload);

    return NextResponse.json({
      success: true,
      event,
      delivery,
      processed: result.processed,
      revalidated: result.revalidated,
      message: result.message,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('GitHub webhook error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Webhook processing failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * Handle different types of GitHub webhook events
 */
async function handleWebhookEvent(event, payload) {
  const result = {
    processed: false,
    revalidated: [],
    message: 'Event not processed'
  };

  switch (event) {
    case 'push':
      return await handlePushEvent(payload);
      
    case 'repository':
      return await handleRepositoryEvent(payload);
      
    case 'release':
      return await handleReleaseEvent(payload);
      
    case 'ping':
      return {
        processed: true,
        revalidated: [],
        message: 'Webhook ping received successfully'
      };
      
    default:
      console.log(`Unhandled webhook event: ${event}`);
      return {
        processed: false,
        revalidated: [],
        message: `Event type '${event}' not handled`
      };
  }
}

/**
 * Handle push events (most common for portfolio updates)
 */
async function handlePushEvent(payload) {
  const { repository, commits, ref } = payload;
  
  if (!repository) {
    return {
      processed: false,
      revalidated: [],
      message: 'No repository information in payload'
    };
  }

  const [owner, repo] = repository.full_name.split('/');
  const branch = ref ? ref.replace('refs/heads/', '') : 'main';
  
  // Only process pushes to main/master branch by default
  const mainBranches = ['main', 'master'];
  if (!mainBranches.includes(branch)) {
    return {
      processed: true,
      revalidated: [],
      message: `Push to ${branch} branch ignored (only processing ${mainBranches.join(', ')})`
    };
  }

  // Check if any commits affect portfolio-relevant files
  const portfolioRelevantFiles = [
    '.nebula/config.json',
    'data.json',
    'content.json',
    /content\/.*\.(md|json)$/,
    /.*\.md$/,
    /public\/.*\.(png|jpg|jpeg|gif|webp)$/
  ];

  let hasRelevantChanges = false;
  const changedFiles = new Set();

  if (commits && Array.isArray(commits)) {
    for (const commit of commits) {
      const files = [
        ...(commit.added || []),
        ...(commit.modified || []),
        ...(commit.removed || [])
      ];
      
      for (const file of files) {
        changedFiles.add(file);
        
        // Check if file matches portfolio-relevant patterns
        const isRelevant = portfolioRelevantFiles.some(pattern => {
          if (typeof pattern === 'string') {
            return file === pattern;
          } else if (pattern instanceof RegExp) {
            return pattern.test(file);
          }
          return false;
        });
        
        if (isRelevant) {
          hasRelevantChanges = true;
        }
      }
    }
  } else {
    // If no commit details, assume changes are relevant
    hasRelevantChanges = true;
  }

  if (!hasRelevantChanges) {
    return {
      processed: true,
      revalidated: [],
      message: `Push to ${owner}/${repo} contains no portfolio-relevant changes`
    };
  }

  // Revalidate the portfolio page
  const portfolioPath = `/${owner}/${repo}`;
  const revalidated = [];

  try {
    await revalidatePath(portfolioPath);
    revalidated.push(portfolioPath);
    
    console.log(`Revalidated portfolio: ${portfolioPath} due to push event`);
    
    return {
      processed: true,
      revalidated,
      message: `Portfolio ${owner}/${repo} revalidated due to relevant file changes`,
      details: {
        branch,
        commitCount: commits ? commits.length : 0,
        changedFiles: Array.from(changedFiles)
      }
    };
    
  } catch (revalidationError) {
    console.error(`Failed to revalidate ${portfolioPath}:`, revalidationError);
    
    return {
      processed: true,
      revalidated,
      message: `Failed to revalidate ${owner}/${repo}: ${revalidationError.message}`
    };
  }
}

/**
 * Handle repository events (created, deleted, renamed, etc.)
 */
async function handleRepositoryEvent(payload) {
  const { action, repository } = payload;
  
  if (!repository) {
    return {
      processed: false,
      revalidated: [],
      message: 'No repository information in payload'
    };
  }

  const [owner, repo] = repository.full_name.split('/');
  const portfolioPath = `/${owner}/${repo}`;

  switch (action) {
    case 'deleted':
      // Repository was deleted - we can't revalidate a non-existent page
      // But we could potentially clean up any cached data
      return {
        processed: true,
        revalidated: [],
        message: `Repository ${owner}/${repo} was deleted - no revalidation needed`
      };
      
    case 'renamed':
      // Repository was renamed - old path should return 404, new path should work
      const oldName = payload.changes?.name?.from;
      if (oldName) {
        try {
          // Revalidate both old and new paths
          await revalidatePath(`/${owner}/${oldName}`);
          await revalidatePath(portfolioPath);
          
          return {
            processed: true,
            revalidated: [`/${owner}/${oldName}`, portfolioPath],
            message: `Repository renamed from ${oldName} to ${repo} - both paths revalidated`
          };
        } catch (error) {
          console.error('Failed to revalidate renamed repository paths:', error);
        }
      }
      break;
      
    case 'publicized':
      // Repository made public - revalidate to show content
      try {
        await revalidatePath(portfolioPath);
        return {
          processed: true,
          revalidated: [portfolioPath],
          message: `Repository ${owner}/${repo} made public - portfolio revalidated`
        };
      } catch (error) {
        console.error('Failed to revalidate publicized repository:', error);
      }
      break;
      
    case 'privatized':
      // Repository made private - revalidate to show error
      try {
        await revalidatePath(portfolioPath);
        return {
          processed: true,
          revalidated: [portfolioPath],
          message: `Repository ${owner}/${repo} made private - portfolio revalidated`
        };
      } catch (error) {
        console.error('Failed to revalidate privatized repository:', error);
      }
      break;
  }

  return {
    processed: true,
    revalidated: [],
    message: `Repository ${action} event processed but no revalidation needed`
  };
}

/**
 * Handle release events
 */
async function handleReleaseEvent(payload) {
  const { action, repository } = payload;
  
  if (!repository) {
    return {
      processed: false,
      revalidated: [],
      message: 'No repository information in payload'
    };
  }

  // Only revalidate on published releases
  if (action === 'published') {
    const [owner, repo] = repository.full_name.split('/');
    const portfolioPath = `/${owner}/${repo}`;
    
    try {
      await revalidatePath(portfolioPath);
      
      return {
        processed: true,
        revalidated: [portfolioPath],
        message: `Portfolio ${owner}/${repo} revalidated due to new release`
      };
    } catch (error) {
      console.error('Failed to revalidate on release:', error);
    }
  }

  return {
    processed: true,
    revalidated: [],
    message: `Release ${action} event processed but no revalidation needed`
  };
}

/**
 * Verify GitHub webhook signature
 */
function verifyGitHubWebhook(payload, signature) {
  if (!signature) {
    return false;
  }

  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.warn('GITHUB_WEBHOOK_SECRET not set, webhook verification disabled');
    // In development, skip verification if no secret is set
    return process.env.NODE_ENV === 'development';
  }

  // GitHub sends signature as 'sha256=<hash>'
  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', webhookSecret)
    .update(payload, 'utf8')
    .digest('hex')}`;

  // Use timingSafeEqual to prevent timing attacks
  try {
    const signatureBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    
    return signatureBuffer.length === expectedBuffer.length &&
           crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}

/**
 * GET endpoint for webhook status and configuration
 */
export async function GET() {
  const hasSecret = !!process.env.GITHUB_WEBHOOK_SECRET;
  
  return NextResponse.json({
    service: 'github-webhook',
    status: 'healthy',
    configured: hasSecret,
    supportedEvents: ['push', 'repository', 'release', 'ping'],
    timestamp: new Date().toISOString(),
    setup: {
      url: `${process.env.VERCEL_URL || 'your-domain.com'}/api/webhooks/github`,
      contentType: 'application/json',
      secret: hasSecret ? 'configured' : 'not configured',
      events: ['push', 'repository', 'release']
    }
  });
}