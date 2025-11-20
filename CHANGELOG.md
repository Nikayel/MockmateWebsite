# Changelog

All notable changes to MockMate will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive documentation suite
  - SECURITY.md - Security policy and vulnerability reporting
  - CONTRIBUTING.md - Contribution guidelines and code standards
  - API_DOCUMENTATION.md - Complete API reference
  - ARCHITECTURE.md - System architecture and design decisions
  - DEPLOYMENT.md - Production deployment guide
  - CHANGELOG.md - Version history (this file)

### Fixed
- Removed exposed API key from .env.example (CRITICAL security fix)

### Security
- Enhanced security documentation with best practices
- Added detailed code execution sandboxing documentation
- Documented authentication and authorization flows

## [1.0.0] - 2025-01-20

### Added
- Interview feedback system with improved UI
- PDF export functionality for interview feedback reports
- Comprehensive scoring system with detailed breakdowns:
  - Code Quality scoring (0-100)
  - Problem Solving scoring (0-100)
  - Communication scoring (0-100)
  - Collaboration metrics
- Question browser with 200+ interview scenarios
- Support for 8 programming languages:
  - JavaScript
  - TypeScript
  - Python
  - Java
  - C++
  - C#
  - Go
  - Rust
- AI-powered interview chat with dual roles:
  - Interviewer mode (Sable)
  - Coding partner mode
- Real-time code execution and testing
- Monaco code editor integration
- Workspace file management
- Session persistence and history
- GitHub OAuth authentication via Firebase
- Stripe payment integration for Pro subscriptions
- Rate limiting on all API endpoints
- Mobile-responsive UI with Tailwind CSS

### Fixed
- Scoring bug where zero collaboration gave score instead of 0
- Interview feedback UI improvements
- Question browser search and filtering

### Changed
- Updated to Next.js 15.2.4
- Upgraded to React 19
- Migrated to Tailwind CSS 4.1.9
- Enhanced code quality explanations in feedback

### Security
- Implemented rate limiting:
  - Chat API: 20 req/min
  - Execute API: 10 req/min
  - Feedback API: 5 req/min
- Added CSRF protection utilities
- Firestore security rules for data access control
- Sandboxed code execution environment
- Input validation on API endpoints

## [0.9.0] - 2025-01-15

### Added
- Enhanced interview feedback with improved UI
- Better collaboration metrics tracking
- Session review functionality
- Sample interview sessions

### Fixed
- Demo page color inconsistencies
- Interview session state persistence

## [0.8.0] - 2025-01-10

### Added
- Promo code system
- Customer portal for subscription management
- Debug endpoints for promo codes
- Session analytics and metrics

### Changed
- Improved feedback generation prompt
- Enhanced AI interviewer personality
- Updated pricing page design

## [0.7.0] - 2025-01-05

### Added
- Initial interview feedback generation
- Test execution with detailed results
- Conversation history tracking
- Session duration tracking

### Changed
- Migrated to Google Gemini 2.5 Flash
- Updated chat system architecture
- Improved code editor UX

## [0.6.0] - 2024-12-20

### Added
- Code execution API for JavaScript
- Code execution API for Python
- Test case management
- Execution timeout protection

### Security
- Sandboxed code execution environment
- Resource limits for code execution

## [0.5.0] - 2024-12-15

### Added
- AI chat integration with Google Gemini
- Real-time interview conversation
- Context-aware responses
- Retry logic with exponential backoff

## [0.4.0] - 2024-12-10

### Added
- Interview scenario library (200+ questions)
- Scenario browser and search
- Difficulty levels and tags
- Language-specific scenarios

## [0.3.0] - 2024-12-05

### Added
- User authentication with Firebase
- GitHub OAuth integration
- User profile management
- Session persistence

## [0.2.0] - 2024-12-01

### Added
- Stripe payment integration
- Pro subscription tier
- Webhook handling for subscription events
- Subscription status synchronization

## [0.1.0] - 2024-11-25

### Added
- Initial project setup
- Next.js 15 with App Router
- Landing page
- Pricing page
- Basic UI components with Radix UI
- Tailwind CSS configuration
- TypeScript setup

---

## Release Notes Format

Each release follows this structure:

### Added
New features and capabilities

### Changed
Changes to existing functionality

### Deprecated
Features that will be removed in future versions

### Removed
Features that were removed

### Fixed
Bug fixes

### Security
Security improvements and vulnerability fixes

---

## Versioning Strategy

- **Major (X.0.0):** Breaking changes, major new features
- **Minor (0.X.0):** New features, backward compatible
- **Patch (0.0.X):** Bug fixes, small improvements

## Release Schedule

- **Patch releases:** As needed (bug fixes)
- **Minor releases:** Monthly (new features)
- **Major releases:** Quarterly (breaking changes)

---

**Maintained by:** MockMate Engineering Team
**Last Updated:** 2025-01-20
