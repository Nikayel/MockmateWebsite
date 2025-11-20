# Security Policy

## Supported Versions

We release security patches for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of MockMate seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please Do NOT:

- Open a public GitHub issue
- Discuss the vulnerability in public forums or social media
- Attempt to exploit the vulnerability beyond what's necessary to demonstrate it

### Please DO:

**Report via Email:** Send details to security@mockmate.dev

**Include the following information:**
- Type of vulnerability (e.g., XSS, SQL injection, authentication bypass)
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### What to Expect:

- **Initial Response:** Within 48 hours, we'll acknowledge receipt of your report
- **Status Updates:** We'll keep you informed about our progress every 5-7 days
- **Validation:** We'll work to validate the vulnerability and determine its impact
- **Fix Timeline:** Critical issues will be fixed within 7 days; high severity within 14 days
- **Disclosure:** We'll coordinate with you on public disclosure timing
- **Credit:** With your permission, we'll publicly acknowledge your contribution

## Security Measures

### Current Implementation

- **Authentication:** Firebase Authentication with OAuth 2.0
- **Rate Limiting:** IP-based rate limiting on all API endpoints
- **Input Validation:** Server-side validation on all user inputs
- **HTTPS Only:** All production traffic uses TLS 1.3
- **Content Security Policy:** Strict CSP headers on all responses
- **Code Execution Sandboxing:** Isolated execution environment for user code
- **Secret Management:** Environment variables for all sensitive data
- **Dependency Scanning:** Automated vulnerability scanning via Dependabot
- **CORS Protection:** Restricted cross-origin requests
- **CSRF Protection:** Token-based CSRF protection on state-changing operations

### Data Protection

- **Encryption at Rest:** All user data encrypted in Firestore
- **Encryption in Transit:** TLS 1.3 for all network communication
- **API Key Security:** Keys stored as environment variables, never in code
- **Session Management:** Secure session tokens with automatic expiration
- **Password Security:** OAuth-only authentication (no password storage)

### Code Execution Security

MockMate allows users to execute code in interview sessions. We implement multiple layers of protection:

- **Sandboxed Execution:** Code runs in isolated containers with resource limits
- **Timeout Protection:** Maximum execution time of 10 seconds
- **Memory Limits:** 256MB maximum memory per execution
- **Network Isolation:** No external network access from executed code
- **File System Restrictions:** Read-only file system access
- **Process Isolation:** Each execution runs in a separate process

### Third-Party Dependencies

We regularly audit our dependencies for security vulnerabilities:

```bash
# Run security audit
npm audit

# Check for outdated packages
npm outdated

# Update dependencies
npm update
```

## Security Best Practices for Contributors

If you're contributing to MockMate, please follow these security guidelines:

### Code Review Checklist

- [ ] No hardcoded secrets, API keys, or credentials
- [ ] All user inputs are validated and sanitized
- [ ] SQL/NoSQL queries use parameterized statements
- [ ] Authentication is required for protected endpoints
- [ ] Authorization checks verify user permissions
- [ ] Error messages don't leak sensitive information
- [ ] Logging doesn't include sensitive data (passwords, tokens, etc.)
- [ ] Dependencies are up-to-date and vulnerability-free
- [ ] CSRF tokens are used for state-changing operations
- [ ] Rate limiting is applied to prevent abuse

### Secure Coding Guidelines

**Authentication & Authorization:**
```typescript
// ✅ GOOD: Verify authentication
const userId = await getUserIdFromRequest(request)
if (!userId) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

// ❌ BAD: Trust client-provided user ID
const { userId } = await request.json() // Never trust this!
```

**Input Validation:**
```typescript
// ✅ GOOD: Validate with schema
const schema = z.object({
  email: z.string().email(),
  message: z.string().max(1000)
})
const validated = schema.parse(data)

// ❌ BAD: Use raw input
const { email, message } = data // No validation!
```

**Secrets Management:**
```typescript
// ✅ GOOD: Use environment variables
const apiKey = process.env.GEMINI_API_KEY

// ❌ BAD: Hardcode secrets
const apiKey = "AIzaSyD_QdsBh4q..." // Never do this!
```

## Security Monitoring

We monitor our systems for security incidents:

- **Error Tracking:** Sentry for error monitoring and alerting
- **Access Logs:** Comprehensive logging of authentication attempts
- **Anomaly Detection:** Automated alerts for unusual activity patterns
- **Uptime Monitoring:** 24/7 monitoring with PagerDuty alerts
- **Dependency Alerts:** Automated security advisories from GitHub

## Incident Response Plan

In the event of a security incident:

1. **Detection:** Automated monitoring or user report
2. **Assessment:** Security team evaluates severity and impact
3. **Containment:** Immediate steps to prevent further damage
4. **Investigation:** Root cause analysis and evidence collection
5. **Remediation:** Deploy fixes and security patches
6. **Communication:** Notify affected users (if applicable)
7. **Post-Mortem:** Document lessons learned and improve processes

## Compliance

MockMate is designed to comply with:

- **GDPR:** EU General Data Protection Regulation
- **CCPA:** California Consumer Privacy Act
- **SOC 2 Type II:** (In progress) Security and availability controls
- **OWASP Top 10:** Protection against common web vulnerabilities

## Security Contacts

- **General Security:** security@mockmate.dev
- **Vulnerability Reports:** security@mockmate.dev
- **PGP Key:** Available at https://mockmate.dev/.well-known/pgp-key.txt

## Bug Bounty Program

We currently do not have a formal bug bounty program, but we greatly appreciate security researchers who responsibly disclose vulnerabilities. We recognize contributors in our Hall of Fame (with permission).

## Recent Security Updates

### 2025-01-20
- Removed exposed API key from version control
- Implemented Gemini API prompt caching to reduce attack surface
- Added comprehensive input validation with Zod schemas
- Enhanced rate limiting with per-user tracking

### 2025-01-15
- Added security headers (CSP, HSTS, X-Frame-Options)
- Implemented CSRF protection on all state-changing endpoints
- Created Firestore security rules for data access control
- Updated dependencies to patch known vulnerabilities

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/deploying/production-checklist#security)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Stripe Security](https://stripe.com/docs/security)

## Acknowledgments

We thank the following security researchers for their responsible disclosure:

*(None yet - be the first!)*

---

**Last Updated:** 2025-01-20
**Version:** 1.0.0
