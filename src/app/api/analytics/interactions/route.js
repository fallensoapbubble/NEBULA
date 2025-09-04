/**
 * API endpoint for collecting user interaction data
 */

import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { interactions } = await request.json();
    
    if (!Array.isArray(interactions)) {
      return NextResponse.json(
        { error: 'Invalid interactions data' },
        { status: 400 }
      );
    }

    // Process and analyze interactions
    const processedInteractions = interactions.map(interaction => ({
      ...interaction,
      processed_at: Date.now(),
      session_id: generateSessionId(interaction),
    }));

    // Log interactions for development
    if (process.env.NODE_ENV === 'development') {
      console.log('👆 User Interactions:', processedInteractions.length, 'events');
      processedInteractions.forEach(interaction => {
        console.log(`  ${interaction.type}:`, interaction);
      });
    }

    // In production, send to analytics service
    await processInteractions(processedInteractions);

    return NextResponse.json({ 
      success: true, 
      processed: processedInteractions.length 
    });
  } catch (error) {
    console.error('Error processing interactions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateSessionId(interaction) {
  // Simple session ID generation based on timestamp and URL
  // In production, use proper session management
  const sessionKey = `${interaction.url}_${Math.floor(interaction.timestamp / (30 * 60 * 1000))}`;
  return btoa(sessionKey).slice(0, 16);
}

async function processInteractions(interactions) {
  // Analyze interaction patterns
  const analysis = analyzeInteractions(interactions);
  
  // Send to analytics services
  if (process.env.ANALYTICS_ENDPOINT) {
    try {
      await fetch(process.env.ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user_interactions',
          data: interactions,
          analysis,
        }),
      });
    } catch (error) {
      console.warn('Failed to send to analytics service:', error);
    }
  }

  // Store in database
  if (process.env.DATABASE_URL) {
    await storeInteractions(interactions);
  }
}

function analyzeInteractions(interactions) {
  const analysis = {
    total_interactions: interactions.length,
    interaction_types: {},
    pages_visited: new Set(),
    session_duration: 0,
    bounce_rate: 0,
  };

  interactions.forEach(interaction => {
    // Count interaction types
    analysis.interaction_types[interaction.type] = 
      (analysis.interaction_types[interaction.type] || 0) + 1;
    
    // Track pages
    analysis.pages_visited.add(interaction.url);
    
    // Calculate session duration
    if (interaction.type === 'time_on_page') {
      analysis.session_duration += interaction.duration || 0;
    }
  });

  // Convert Set to array for JSON serialization
  analysis.pages_visited = Array.from(analysis.pages_visited);
  
  // Calculate bounce rate (single page sessions)
  analysis.bounce_rate = analysis.pages_visited.length === 1 ? 1 : 0;

  return analysis;
}

async function storeInteractions(interactions) {
  // Example database storage
  try {
    console.log('Would store interactions in database:', interactions.length, 'records');
  } catch (error) {
    console.warn('Database storage error:', error);
  }
}