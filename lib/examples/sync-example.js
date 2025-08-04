/**
 * Example usage of RepositoryService synchronization features
 * This demonstrates conflict detection and resolution workflows
 */

import { RepositoryService } from '../repository-service.js';

async function synchronizationExample() {
  const accessToken = process.env.GITHUB_ACCESS_TOKEN;
  const service = new RepositoryService(accessToken);

  const owner = 'your-username';
  const repo = 'your-portfolio';
  
  try {
    console.log('🔄 Synchronization Example');
    console.log('==========================\n');

    // Example 1: Check current sync status
    console.log('1. Checking synchronization status...');
    const lastKnownSha = 'abc123'; // This would come from local storage/state
    
    const syncStatus = await service.getSyncStatus(owner, repo, lastKnownSha);
    if (syncStatus.success) {
      console.log('✅ Sync status retrieved:');
      console.log(`   Up to date: ${syncStatus.status.upToDate}`);
      console.log(`   Latest SHA: ${syncStatus.status.latestSha}`);
      console.log(`   New commits: ${syncStatus.status.newCommitsCount}`);
      
      if (!syncStatus.status.upToDate) {
        console.log('   📋 New commits:');
        syncStatus.status.newCommits.forEach(commit => {
          console.log(`     - ${commit.sha.substring(0, 7)}: ${commit.message}`);
        });
      }
    } else {
      console.log('❌ Failed to get sync status:', syncStatus.error);
      return;
    }

    // Example 2: Simulate local changes
    console.log('\n2. Simulating local changes...');
    const localChanges = [
      {
        path: 'data.json',
        content: JSON.stringify({
          name: 'John Doe',
          title: 'Full Stack Developer',
          lastUpdated: new Date().toISOString(),
          localEdit: true
        }, null, 2),
        sha: 'local-sha-123'
      },
      {
        path: 'README.md',
        content: '# My Portfolio\n\nUpdated locally with new content.\n\n## Features\n- Local editing\n- Conflict resolution',
        sha: 'local-sha-456'
      }
    ];

    console.log('✅ Local changes prepared:');
    localChanges.forEach(change => {
      console.log(`   📝 ${change.path} (${change.content.length} chars)`);
    });

    // Example 3: Detect conflicts
    console.log('\n3. Detecting conflicts...');
    const conflictResult = await service.detectConflicts(
      owner, 
      repo, 
      localChanges, 
      lastKnownSha
    );

    if (conflictResult.success) {
      console.log(`✅ Conflict detection completed:`);
      console.log(`   Has conflicts: ${conflictResult.hasConflicts}`);
      console.log(`   Conflicts found: ${conflictResult.conflicts.length}`);
      
      if (conflictResult.hasConflicts) {
        console.log('   ⚠️  Conflicts:');
        conflictResult.conflicts.forEach(conflict => {
          console.log(`     - ${conflict.path}: ${conflict.conflictReason}`);
        });

        // Example 4: Resolve conflicts
        console.log('\n4. Resolving conflicts...');
        
        // Strategy 1: Keep local changes
        console.log('   Strategy: Keep local changes');
        const localResolution = await service.resolveConflicts(
          owner,
          repo,
          conflictResult.conflicts,
          'keep_local'
        );

        if (localResolution.success) {
          console.log('   ✅ Conflicts resolved (kept local):');
          localResolution.resolutions.forEach(resolution => {
            if (resolution.success) {
              console.log(`     ✅ ${resolution.path}: ${resolution.resolutionType}`);
            } else {
              console.log(`     ❌ ${resolution.path}: ${resolution.error}`);
            }
          });
        }

        // Strategy 2: Manual resolution (example)
        console.log('\n   Alternative: Manual resolution');
        const manualResolutions = {
          'data.json': JSON.stringify({
            name: 'John Doe',
            title: 'Full Stack Developer',
            lastUpdated: new Date().toISOString(),
            mergedContent: true,
            localEdit: true,
            remoteEdit: true
          }, null, 2)
        };

        const manualResolution = await service.resolveConflicts(
          owner,
          repo,
          conflictResult.conflicts.filter(c => c.path === 'data.json'),
          'manual',
          manualResolutions
        );

        if (manualResolution.success) {
          console.log('   ✅ Manual resolution applied:');
          console.log(`     📝 Merged content for data.json`);
        }

      } else {
        console.log('   ✅ No conflicts detected - safe to proceed with changes');
      }
    } else {
      console.log('❌ Failed to detect conflicts:', conflictResult.error);
    }

    // Example 5: Pull latest changes
    console.log('\n5. Pulling latest changes...');
    const pullResult = await service.pullRemoteChanges(owner, repo);
    
    if (pullResult.success) {
      console.log('✅ Latest changes pulled:');
      console.log(`   Latest commit: ${pullResult.updates.latestCommit.sha.substring(0, 7)}`);
      console.log(`   Commit message: ${pullResult.updates.latestCommit.message}`);
      console.log(`   Files in repo: ${pullResult.updates.structure.contents.length}`);
    } else {
      console.log('❌ Failed to pull changes:', pullResult.error);
    }

    // Example 6: Compare commits
    console.log('\n6. Comparing commits...');
    const latestCommit = await service.getLatestCommit(owner, repo);
    if (latestCommit.success && latestCommit.commit.sha !== lastKnownSha) {
      const comparison = await service.compareCommits(
        owner, 
        repo, 
        lastKnownSha, 
        latestCommit.commit.sha
      );

      if (comparison.success) {
        console.log('✅ Commit comparison:');
        console.log(`   Status: ${comparison.comparison.status}`);
        console.log(`   Commits ahead: ${comparison.comparison.aheadBy}`);
        console.log(`   Files changed: ${comparison.comparison.files.length}`);
        
        if (comparison.comparison.files.length > 0) {
          console.log('   📋 Changed files:');
          comparison.comparison.files.forEach(file => {
            console.log(`     ${file.status}: ${file.filename} (+${file.additions}/-${file.deletions})`);
          });
        }
      }
    }

  } catch (error) {
    console.error('❌ Synchronization example failed:', error.message);
  }
}

/**
 * Example of a complete sync workflow
 */
async function completeSyncWorkflow() {
  const accessToken = process.env.GITHUB_ACCESS_TOKEN;
  const service = new RepositoryService(accessToken);

  const owner = 'your-username';
  const repo = 'your-portfolio';
  const lastKnownSha = 'abc123';

  console.log('\n🔄 Complete Sync Workflow');
  console.log('==========================\n');

  try {
    // Step 1: Check if we're up to date
    const syncStatus = await service.getSyncStatus(owner, repo, lastKnownSha);
    if (!syncStatus.success) {
      throw new Error(`Sync check failed: ${syncStatus.error}`);
    }

    if (syncStatus.status.upToDate) {
      console.log('✅ Repository is up to date - no sync needed');
      return;
    }

    console.log(`📥 Found ${syncStatus.status.newCommitsCount} new commits`);

    // Step 2: Simulate user has local changes
    const localChanges = [
      {
        path: 'data.json',
        content: '{"updated": "locally"}',
        sha: 'local-123'
      }
    ];

    // Step 3: Check for conflicts
    const conflicts = await service.detectConflicts(owner, repo, localChanges, lastKnownSha);
    if (!conflicts.success) {
      throw new Error(`Conflict detection failed: ${conflicts.error}`);
    }

    if (conflicts.hasConflicts) {
      console.log(`⚠️  Found ${conflicts.conflicts.length} conflicts`);
      
      // Step 4: Resolve conflicts (keeping local changes in this example)
      const resolution = await service.resolveConflicts(
        owner, 
        repo, 
        conflicts.conflicts, 
        'keep_local'
      );

      if (!resolution.success) {
        throw new Error('Conflict resolution failed');
      }

      console.log(`✅ Resolved ${resolution.summary.resolved} conflicts`);
    } else {
      console.log('✅ No conflicts detected');
    }

    // Step 5: Update local state with latest commit
    const latestCommit = await service.getLatestCommit(owner, repo);
    if (latestCommit.success) {
      console.log(`✅ Sync complete - updated to ${latestCommit.commit.sha.substring(0, 7)}`);
      // In a real app, you would save this SHA to local storage/state
    }

  } catch (error) {
    console.error('❌ Sync workflow failed:', error.message);
  }
}

// Export for use in other modules
export { synchronizationExample, completeSyncWorkflow };

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  synchronizationExample()
    .then(() => completeSyncWorkflow())
    .catch(console.error);
}