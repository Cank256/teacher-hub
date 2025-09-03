# Mobile App Deployment Runbook

## Overview

This runbook provides step-by-step procedures for deploying the Teacher Hub mobile application to production, handling incidents, and managing releases.

## Pre-Deployment Checklist

### Code Quality Gates
- [ ] All tests passing (unit, integration, E2E)
- [ ] Code coverage above 80%
- [ ] TypeScript strict mode compliance
- [ ] ESLint and Prettier checks passing
- [ ] Security audit completed
- [ ] Performance benchmarks met

### Release Preparation
- [ ] Version number updated in package.json and app.json
- [ ] Changelog updated with release notes
- [ ] Feature flags configured for new features
- [ ] Kill switches tested and documented
- [ ] App store metadata reviewed and updated
- [ ] Privacy policy updated if needed

### Environment Setup
- [ ] EAS Build credentials configured
- [ ] Signing certificates valid and not expiring soon
- [ ] Environment variables set correctly
- [ ] Third-party service integrations tested
- [ ] Monitoring and analytics configured

## Deployment Procedures

### 1. Preview Build Deployment (PR/Staging)

**Trigger:** Pull request to main branch

**Automated Steps:**
```bash
# Triggered automatically by GitHub Actions
# .github/workflows/mobile-build-deploy.yml

# Manual trigger if needed:
cd packages/mobile
eas build --platform all --profile preview --non-interactive
```

**Verification:**
- [ ] Build completes successfully
- [ ] Preview app installs and launches
- [ ] Core functionality works
- [ ] No critical crashes in first 5 minutes

### 2. Production Build Deployment

**Trigger:** Merge to main branch or manual workflow dispatch

**Pre-deployment Steps:**
1. **Create Release Branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b release/v1.x.x
   ```

2. **Update Version Numbers**
   ```bash
   # Update package.json version
   npm version patch|minor|major
   
   # Update app.json version and build numbers
   # iOS: increment buildNumber
   # Android: increment versionCode
   ```

3. **Final Testing**
   ```bash
   cd packages/mobile
   npm run test:all
   npm run type-check
   npm run lint
   ```

**Deployment Steps:**

1. **Build for Production**
   ```bash
   # iOS Production Build
   eas build --platform ios --profile production-ios --non-interactive --auto-submit
   
   # Android Production Build
   eas build --platform android --profile production-android --non-interactive --auto-submit
   ```

2. **Monitor Build Progress**
   - Check EAS Build dashboard
   - Monitor build logs for errors
   - Verify signing and provisioning

3. **Post-Build Verification**
   - [ ] Build artifacts generated successfully
   - [ ] App size within acceptable limits
   - [ ] No critical warnings in build logs
   - [ ] Signing certificates applied correctly

### 3. Over-the-Air (OTA) Updates

**When to Use OTA:**
- Bug fixes that don't require native code changes
- Content updates and configuration changes
- Feature flag updates
- Non-critical improvements

**Deployment Steps:**
```bash
cd packages/mobile

# For staging/preview
eas update --branch preview --message "Bug fix: [description]"

# For production (after testing)
eas update --branch production --message "Production update: [description]"
```

**OTA Update Checklist:**
- [ ] Changes are JavaScript-only (no native dependencies)
- [ ] Update tested in preview environment
- [ ] Rollback plan prepared
- [ ] Update message is descriptive
- [ ] Monitoring alerts configured

### 4. App Store Submission

**iOS App Store (Automatic via EAS Submit):**
1. Build automatically submitted to App Store Connect
2. Monitor submission status in App Store Connect
3. Respond to any review feedback
4. Release to App Store once approved

**Google Play Store (Automatic via EAS Submit):**
1. Build automatically uploaded to Google Play Console
2. Monitor review status in Play Console
3. Configure release rollout percentage
4. Monitor crash reports and user feedback

**Manual Submission (if needed):**
```bash
# iOS
eas submit --platform ios --latest

# Android
eas submit --platform android --latest
```

## Release Monitoring

### Immediate Post-Release (0-2 hours)

**Metrics to Monitor:**
- [ ] Crash-free sessions rate > 99%
- [ ] App launch success rate > 95%
- [ ] Critical user flows working
- [ ] No spike in error rates
- [ ] Push notifications delivering

**Monitoring Tools:**
- Sentry dashboard for crashes and errors
- Firebase Analytics for user engagement
- App Store Connect/Play Console for reviews
- Custom release health dashboard

**Actions if Issues Detected:**
1. Assess severity (P0-P3)
2. Activate incident response if P0/P1
3. Consider OTA hotfix or rollback
4. Communicate with stakeholders

### Extended Monitoring (2-24 hours)

**Additional Metrics:**
- [ ] User retention rates normal
- [ ] Feature adoption as expected
- [ ] Performance metrics stable
- [ ] User feedback sentiment
- [ ] Server load and API performance

### Weekly Release Review (7 days)

**Review Metrics:**
- Overall release health score
- Feature usage analytics
- User feedback analysis
- Performance regression analysis
- Crash trend analysis

## Incident Response Procedures

### Incident Severity Levels

**P0 - Critical (Response: Immediate)**
- App crashes on launch for >50% of users
- Complete feature failure (login, core functionality)
- Data loss or security breach
- App store removal threat

**P1 - High (Response: <1 hour)**
- Significant feature degradation
- Crashes affecting >10% of users
- Performance degradation >50%
- Payment or critical workflow issues

**P2 - Medium (Response: <4 hours)**
- Minor feature issues
- Crashes affecting <10% of users
- Performance issues <50%
- Non-critical workflow problems

**P3 - Low (Response: <24 hours)**
- Cosmetic issues
- Minor UX problems
- Documentation errors
- Enhancement requests

### Incident Response Steps

#### 1. Detection and Assessment (0-15 minutes)

**Detection Sources:**
- Automated monitoring alerts
- User reports via support channels
- App store reviews
- Team member reports

**Initial Assessment:**
1. Confirm the incident
2. Determine severity level
3. Identify affected users/features
4. Estimate business impact

#### 2. Response Team Assembly (15-30 minutes)

**Core Team:**
- Incident Commander (Mobile Lead)
- Mobile Developer (on-call)
- Backend Developer (if API related)
- DevOps Engineer
- Product Manager
- Customer Support Lead

**Communication Channels:**
- Slack: #incident-response
- Phone: Emergency contact list
- Email: incident-team@teacherhub.ug

#### 3. Immediate Response (30 minutes - 2 hours)

**P0/P1 Response Actions:**

1. **Assess Rollback Options**
   ```bash
   # Check if OTA rollback is possible
   eas update --branch production --message "Rollback to previous version"
   
   # If native changes, prepare emergency build
   eas build --platform all --profile production --non-interactive
   ```

2. **Activate Kill Switches**
   ```typescript
   // Disable problematic features
   featureFlags.activateKillSwitch('problematic_feature');
   ```

3. **Implement Hotfix**
   - Create hotfix branch from main
   - Implement minimal fix
   - Fast-track testing and deployment

4. **Monitor and Communicate**
   - Update status page
   - Notify affected users
   - Provide regular updates

#### 4. Resolution and Recovery

**Resolution Steps:**
1. Deploy fix via OTA or new build
2. Verify fix resolves the issue
3. Monitor metrics for improvement
4. Gradually restore affected features
5. Communicate resolution to users

**Recovery Verification:**
- [ ] Incident metrics return to normal
- [ ] No new related issues reported
- [ ] User feedback improves
- [ ] All systems functioning normally

#### 5. Post-Incident Review

**Within 48 hours of resolution:**

1. **Incident Timeline Documentation**
   - Detection time and method
   - Response actions taken
   - Resolution time and method
   - Impact assessment

2. **Root Cause Analysis**
   - Technical root cause
   - Process failures
   - Contributing factors
   - Prevention opportunities

3. **Action Items**
   - Code improvements
   - Process improvements
   - Monitoring enhancements
   - Documentation updates

## Emergency Procedures

### Complete App Failure

**Immediate Actions:**
1. Activate all relevant kill switches
2. Deploy emergency OTA update disabling all non-essential features
3. Prepare minimal functionality build
4. Communicate with app stores if needed

### Security Incident

**Immediate Actions:**
1. Assess data exposure risk
2. Activate security kill switches
3. Force user re-authentication if needed
4. Coordinate with security team
5. Prepare security advisory

### App Store Rejection/Removal

**Immediate Actions:**
1. Contact app store review team
2. Prepare compliance documentation
3. Implement required changes
4. Submit expedited review request
5. Communicate with users via other channels

## Rollback Procedures

### OTA Rollback
```bash
# Rollback to previous OTA update
eas update --branch production --message "Rollback: [reason]"

# Rollback to specific update
eas update --branch production --group [previous-group-id]
```

### Binary Rollback
```bash
# Emergency build with previous stable version
git checkout [previous-stable-tag]
eas build --platform all --profile production --non-interactive --auto-submit
```

### Feature Rollback
```typescript
// Disable specific features
featureFlags.activateKillSwitch('new_feature');
featureFlags.activateKillSwitch('experimental_feature');
```

## Communication Templates

### Incident Notification
```
🚨 INCIDENT ALERT - P[X] - [Title]

Status: [Investigating/Identified/Monitoring/Resolved]
Impact: [Description of user impact]
Affected: [Number/percentage of users]
ETA: [Estimated resolution time]

Actions Taken:
- [Action 1]
- [Action 2]

Next Update: [Time]
Incident Commander: [Name]
```

### Resolution Notification
```
✅ INCIDENT RESOLVED - [Title]

Resolution: [Description of fix]
Root Cause: [Brief explanation]
Prevention: [Steps taken to prevent recurrence]

Timeline:
- Detected: [Time]
- Resolved: [Time]
- Duration: [Total time]

Post-mortem: [Link to detailed analysis]
```

### User Communication
```
We're aware of an issue affecting [feature/functionality] and are working on a fix. 

Expected resolution: [timeframe]
Workaround: [if available]

We'll update you as soon as it's resolved. Thank you for your patience.
```

## Contacts and Escalation

### Emergency Contacts
- **Mobile Team Lead:** [Name] - [Phone] - [Email]
- **DevOps Lead:** [Name] - [Phone] - [Email]
- **Product Manager:** [Name] - [Phone] - [Email]
- **CTO:** [Name] - [Phone] - [Email]

### External Contacts
- **Apple Developer Support:** [Contact info]
- **Google Play Support:** [Contact info]
- **Sentry Support:** [Contact info]
- **Firebase Support:** [Contact info]

### Escalation Matrix
- **P0:** Immediate notification to all contacts
- **P1:** Notify team leads within 1 hour
- **P2:** Notify during business hours
- **P3:** Include in weekly reports

## Tools and Resources

### Monitoring Dashboards
- **Sentry:** https://sentry.io/organizations/teacherhub/
- **Firebase:** https://console.firebase.google.com/
- **EAS Build:** https://expo.dev/accounts/teacherhub/projects/
- **App Store Connect:** https://appstoreconnect.apple.com/
- **Google Play Console:** https://play.google.com/console/

### Documentation
- **API Documentation:** [Internal link]
- **Architecture Docs:** [Internal link]
- **Runbook Updates:** [Internal link]
- **Incident History:** [Internal link]

### Scripts and Automation
- **Emergency Scripts:** `/scripts/emergency/`
- **Monitoring Scripts:** `/scripts/monitoring/`
- **Deployment Scripts:** `/scripts/deployment/`

## Runbook Maintenance

**Review Schedule:** Monthly
**Update Triggers:**
- After each incident
- Architecture changes
- Tool changes
- Process improvements

**Ownership:** Mobile Team Lead
**Approvers:** CTO, DevOps Lead