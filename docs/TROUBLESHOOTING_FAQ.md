# Troubleshooting & FAQ

This document provides solutions to common issues and answers frequently asked questions about the Nebula Portfolio Platform.

## Table of Contents

1. [Authentication Issues](#authentication-issues)
2. [Repository Problems](#repository-problems)
3. [Editor Issues](#editor-issues)
4. [Portfolio Display Problems](#portfolio-display-problems)
5. [Performance Issues](#performance-issues)
6. [Frequently Asked Questions](#frequently-asked-questions)

## Authentication Issues

### Problem: "Sign in with GitHub" button doesn't work

**Symptoms:**
- Button doesn't respond to clicks
- Redirects to error page
- Authentication popup closes immediately

**Solutions:**

1. **Check browser settings:**
   - Disable popup blockers for the site
   - Enable JavaScript
   - Clear browser cache and cookies

2. **Verify GitHub OAuth app:**
   - Ensure OAuth app is properly configured
   - Check callback URL matches exactly
   - Verify client ID and secret are correct

3. **Try different browser:**
   - Test in incognito/private mode
   - Try a different browser entirely
   - Check for browser extensions that might interfere

### Problem: "Insufficient permissions" error

**Symptoms:**
- Authentication succeeds but can't access repositories
- Error messages about missing permissions
- Can't fork or edit repositories

**Solutions:**

1. **Re-authorize the application:**
   - Go to GitHub Settings > Applications
   - Find "Nebula Portfolio Platform"
   - Click "Revoke" then sign in again

2. **Check required permissions:**
   - Ensure `public_repo` scope is granted
   - For private repos, ensure `repo` scope is granted
   - Verify organization permissions if applicable

3. **Contact support:**
   - If permissions appear correct but issues persist
   - Provide your GitHub username for investigation

### Problem: Session expires frequently

**Symptoms:**
- Logged out unexpectedly
- Need to re-authenticate often
- "Session expired" messages

**Solutions:**

1. **Check browser settings:**
   - Ensure cookies are enabled
   - Don't clear cookies automatically
   - Check if using private/incognito mode

2. **Token refresh issues:**
   - This may indicate a server-side issue
   - Try logging out and back in
   - Contact support if problem persists

## Repository Problems

### Problem: Can't fork template repository

**Symptoms:**
- Fork button doesn't work
- Error during fork process
- Repository not created in GitHub account

**Solutions:**

1. **Check repository limits:**
   - GitHub free accounts have repository limits
   - Ensure you haven't exceeded your limit
   - Consider upgrading to GitHub Pro if needed

2. **Verify template repository:**
   - Ensure template repository exists and is public
   - Check if template follows required structure
   - Try forking a different template

3. **GitHub API issues:**
   - Check GitHub status page for outages
   - Wait a few minutes and try again
   - Clear browser cache and retry

### Problem: Repository not showing in editor

**Symptoms:**
- Repository exists in GitHub but not in editor
- "Repository not found" errors
- Empty repository list

**Solutions:**

1. **Refresh repository list:**
   - Click refresh button in editor
   - Log out and back in
   - Check repository visibility settings

2. **Verify repository structure:**
   - Ensure repository contains required files
   - Check `.nebula/config.json` exists and is valid
   - Verify repository is public (for free hosting)

3. **Check permissions:**
   - Ensure you have admin access to the repository
   - Verify OAuth permissions include repository access
   - Check if repository is in an organization with restrictions

### Problem: Changes not syncing to GitHub

**Symptoms:**
- Editor shows changes saved but GitHub doesn't reflect them
- Commits not appearing in GitHub history
- "Sync failed" errors

**Solutions:**

1. **Check network connection:**
   - Ensure stable internet connection
   - Try refreshing the page
   - Check browser developer tools for network errors

2. **Verify GitHub permissions:**
   - Ensure write access to repository
   - Check if repository is archived or read-only
   - Verify OAuth token hasn't expired

3. **Manual sync:**
   - Try the "Force Sync" option if available
   - Log out and back in to refresh tokens
   - Check GitHub repository directly for recent commits

## Editor Issues

### Problem: Editor won't load or shows blank page

**Symptoms:**
- White/blank screen when opening editor
- Loading spinner that never completes
- JavaScript errors in browser console

**Solutions:**

1. **Browser troubleshooting:**
   - Hard refresh (Ctrl+F5 or Cmd+Shift+R)
   - Clear browser cache and cookies
   - Disable browser extensions temporarily
   - Try incognito/private mode

2. **Check browser compatibility:**
   - Use supported browsers (Chrome, Firefox, Safari, Edge)
   - Ensure browser is up to date
   - Enable JavaScript if disabled

3. **Network issues:**
   - Check internet connection
   - Try different network (mobile hotspot)
   - Check if corporate firewall is blocking requests

### Problem: Content not saving

**Symptoms:**
- Changes disappear when refreshing page
- "Save failed" error messages
- Unsaved changes warnings

**Solutions:**

1. **Check auto-save status:**
   - Look for save indicators in the editor
   - Ensure auto-save is enabled
   - Try manual save if auto-save fails

2. **Validate content:**
   - Check for validation errors in forms
   - Ensure required fields are filled
   - Verify image uploads are complete

3. **Browser storage:**
   - Clear browser cache
   - Check if local storage is full
   - Try different browser

### Problem: Images won't upload

**Symptoms:**
- Image upload fails or hangs
- "File too large" errors
- Images don't appear after upload

**Solutions:**

1. **Check image requirements:**
   - Maximum file size: 5MB
   - Supported formats: JPG, PNG, WebP, SVG
   - Ensure image isn't corrupted

2. **Optimize images:**
   - Compress images before upload
   - Resize large images
   - Convert to supported format if needed

3. **Upload troubleshooting:**
   - Try uploading one image at a time
   - Check internet connection stability
   - Clear browser cache and retry

## Portfolio Display Problems

### Problem: Portfolio not loading at public URL

**Symptoms:**
- 404 error when visiting portfolio URL
- "Repository not found" message
- Blank page at portfolio URL

**Solutions:**

1. **Verify URL format:**
   - Correct format: `https://nebula-mu-henna.vercel.app/username/repository`
   - Check spelling of username and repository name
   - Ensure repository name matches exactly

2. **Check repository settings:**
   - Repository must be public for free hosting
   - Verify repository contains valid portfolio structure
   - Ensure `.nebula/config.json` is present and valid

3. **Wait for deployment:**
   - New repositories may take a few minutes to deploy
   - Check back after 5-10 minutes
   - Try hard refresh (Ctrl+F5)

### Problem: Portfolio shows old content

**Symptoms:**
- Changes made in editor don't appear on live site
- Portfolio shows previous version of content
- Updates not reflecting after saving

**Solutions:**

1. **Cache issues:**
   - Hard refresh the portfolio page (Ctrl+F5)
   - Clear browser cache
   - Try viewing in incognito/private mode

2. **Deployment delay:**
   - Wait 5-10 minutes for changes to deploy
   - Check if recent commits appear in GitHub
   - Verify save was successful in editor

3. **Manual revalidation:**
   - Use cache invalidation if available
   - Contact support for manual cache clear
   - Check GitHub webhook configuration

### Problem: Portfolio looks broken or unstyled

**Symptoms:**
- Missing styles or formatting
- Layout appears broken
- Images not displaying correctly

**Solutions:**

1. **Template issues:**
   - Verify template is compatible with platform
   - Check if template files are complete
   - Try switching to a different template

2. **Content validation:**
   - Ensure all required fields are filled
   - Check for invalid or corrupted content
   - Validate image URLs and file paths

3. **Browser compatibility:**
   - Test in different browsers
   - Check for JavaScript errors in console
   - Ensure browser supports modern CSS features

## Performance Issues

### Problem: Slow loading times

**Symptoms:**
- Editor takes long time to load
- Portfolio pages load slowly
- Timeouts when saving changes

**Solutions:**

1. **Optimize content:**
   - Compress large images
   - Reduce amount of content per page
   - Remove unused assets

2. **Network optimization:**
   - Check internet connection speed
   - Try different network connection
   - Use wired connection instead of WiFi

3. **Browser optimization:**
   - Close unnecessary browser tabs
   - Clear browser cache
   - Disable resource-heavy extensions

### Problem: High memory usage

**Symptoms:**
- Browser becomes slow or unresponsive
- "Out of memory" errors
- Computer fans running loudly

**Solutions:**

1. **Reduce browser load:**
   - Close other tabs and applications
   - Restart browser periodically
   - Use browser task manager to identify issues

2. **Optimize images:**
   - Use smaller image files
   - Compress images before upload
   - Remove unused images from repository

## Frequently Asked Questions

### General Questions

**Q: Is the platform free to use?**
A: Yes, the platform is free for public repositories. GitHub's standard repository limits apply.

**Q: Can I use my own domain name?**
A: Yes, you can configure a custom domain through Vercel's domain settings.

**Q: Do I need coding knowledge to use the platform?**
A: No, the web editor provides a user-friendly interface for customizing your portfolio without coding.

**Q: Can I export my portfolio to use elsewhere?**
A: Yes, your portfolio is stored in your GitHub repository and can be exported or moved at any time.

### Technical Questions

**Q: What happens if I edit my repository directly in GitHub?**
A: Direct edits are supported, but using the web editor is recommended for the best experience and validation.

**Q: Can I collaborate with others on my portfolio?**
A: Yes, you can add collaborators to your GitHub repository to work together on your portfolio.

**Q: How often is my portfolio updated?**
A: Changes are typically reflected within 5-10 minutes of saving in the editor.

**Q: Can I use private repositories?**
A: Private repositories are supported but require GitHub Pro and won't be publicly accessible without authentication.

### Troubleshooting Questions

**Q: Why can't I see my changes on the live site?**
A: This is usually due to caching. Try hard refreshing (Ctrl+F5) or wait a few minutes for deployment.

**Q: What should I do if I get a "Rate limit exceeded" error?**
A: This indicates too many API requests. Wait an hour for the limit to reset, or contact support if the issue persists.

**Q: How do I recover if I accidentally delete content?**
A: Check your GitHub repository's commit history to restore previous versions of your content.

**Q: Why is my portfolio showing a 404 error?**
A: Verify your repository is public, contains valid portfolio structure, and the URL is correct.

### Account Questions

**Q: How do I delete my account?**
A: Simply revoke the application's access in your GitHub settings. Your repositories remain unaffected.

**Q: Can I change my GitHub username after creating portfolios?**
A: Yes, but you'll need to update any shared portfolio URLs to reflect your new username.

**Q: What data does the platform store?**
A: The platform only stores your GitHub authentication token. All portfolio content remains in your GitHub repositories.

## Getting Additional Help

### Self-Service Resources

1. **Documentation**: Check the comprehensive user guide and API documentation
2. **Video Tutorials**: Watch step-by-step tutorials for common tasks
3. **Template Examples**: Browse example portfolios for inspiration
4. **GitHub Issues**: Search existing issues for similar problems

### Community Support

1. **GitHub Discussions**: Ask questions and get help from the community
2. **Discord Server**: Join real-time discussions with other users
3. **Social Media**: Follow for updates and tips

### Direct Support

1. **Bug Reports**: Report technical issues via GitHub Issues
2. **Feature Requests**: Suggest improvements through proper channels
3. **Email Support**: Contact support for urgent issues or account problems

### Before Contacting Support

Please provide the following information:

1. **Browser and version** (e.g., Chrome 96.0.4664.110)
2. **Operating system** (e.g., Windows 11, macOS 12.1)
3. **GitHub username** (if account-related)
4. **Repository name** (if repository-related)
5. **Steps to reproduce** the issue
6. **Error messages** (exact text or screenshots)
7. **Expected vs actual behavior**

This information helps us diagnose and resolve issues more quickly.

---

*Troubleshooting Guide Version: 1.0*
*Last Updated: [Current Date]*