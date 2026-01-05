# Contributing to CodeSparring

Thank you for your interest in contributing to CodeSparring! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors. We expect everyone to:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, trolling, or discriminatory comments
- Personal or political attacks
- Publishing others' private information without permission
- Other conduct that could reasonably be considered inappropriate

### Enforcement

Project maintainers have the right to remove, edit, or reject comments, commits, code, issues, and other contributions that do not align with this Code of Conduct.

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or higher
- **pnpm** (preferred) or npm/yarn
- **Git** for version control
- **Firebase CLI** (optional, for local Firebase emulation)
- **VS Code** (recommended) with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/MockmateWebsite.git
   cd MockmateWebsite
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/Nikayel/MockmateWebsite.git
   ```

## Development Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env.local
```

Fill in your `.env.local` with the required credentials:

```env
# Firebase Configuration (Required)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# AI Configuration (Required)
GEMINI_API_KEY=your_gemini_api_key

# Stripe Configuration (Optional - only for payment features)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_ID_WEBSITE=price_...
STRIPE_PRICE_ID_VSCODE=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Note:** You can develop most features without Stripe. Payment-related features will be disabled without Stripe credentials.

### 3. Start Development Server

```bash
pnpm dev
```

Visit http://localhost:3000 to see your local instance.

### 4. Firebase Setup (Optional)

For local development with Firebase emulators:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Start emulators
firebase emulators:start
```

## How to Contribute

### Types of Contributions

We welcome various types of contributions:

- **Bug Fixes:** Fix issues reported in GitHub Issues
- **Features:** Implement new features from our roadmap
- **Documentation:** Improve README, API docs, or code comments
- **Tests:** Add test coverage for existing functionality
- **Performance:** Optimize existing code or reduce bundle size
- **UI/UX:** Improve design, accessibility, or user experience
- **Security:** Report vulnerabilities or enhance security measures

### Finding Work

1. **Check Issues:** Browse [GitHub Issues](https://github.com/Nikayel/MockmateWebsite/issues) for open tasks
2. **Good First Issues:** Look for issues tagged `good first issue` if you're new
3. **Roadmap:** Check our [project roadmap](#) for planned features
4. **Ask Questions:** Not sure where to start? Open a discussion or comment on an issue

### Before You Start

1. **Check for duplicates:** Search existing issues and PRs
2. **Discuss major changes:** Open an issue to discuss significant changes before coding
3. **Assign yourself:** Comment on the issue to let others know you're working on it
4. **Stay updated:** Sync your fork regularly to avoid conflicts

## Coding Standards

### TypeScript Guidelines

- **Use TypeScript:** All new code should be TypeScript (`.ts` or `.tsx`)
- **Strict mode:** Follow strict TypeScript rules
- **Type safety:** Avoid `any` types; use proper typing
- **Interfaces:** Prefer interfaces over type aliases for object shapes

```typescript
// ✅ GOOD
interface User {
  id: string
  email: string
  name: string | null
}

// ❌ BAD
const user: any = { ... }
```

### React Best Practices

- **Functional Components:** Use function components with hooks
- **Component Organization:** One component per file
- **Props Typing:** Always type component props
- **Hooks:** Follow Rules of Hooks
- **Performance:** Use `useMemo`, `useCallback` appropriately

```typescript
// ✅ GOOD
interface ButtonProps {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>
}

// ❌ BAD
export function Button(props: any) {
  return <button onClick={props.onClick}>{props.label}</button>
}
```

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Format code
pnpm format

# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix
```

**Key Style Rules:**
- **Indentation:** 2 spaces (no tabs)
- **Quotes:** Double quotes for JSX, single quotes for TS/JS
- **Semicolons:** Always use semicolons
- **Line Length:** Maximum 100 characters
- **Imports:** Organize imports (types, then modules, then local)

### File Naming Conventions

- **Components:** PascalCase (e.g., `UserProfile.tsx`)
- **Utilities:** camelCase (e.g., `formatDate.ts`)
- **Hooks:** camelCase with `use` prefix (e.g., `useAuth.ts`)
- **Types:** PascalCase (e.g., `UserTypes.ts`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS.ts`)

### Security Guidelines

See [SECURITY.md](./SECURITY.md) for detailed security guidelines. Key points:

- ✅ Never commit API keys or secrets
- ✅ Validate all user inputs
- ✅ Use parameterized queries
- ✅ Implement proper authentication/authorization
- ✅ Sanitize error messages (no sensitive data leaks)

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat:** New feature
- **fix:** Bug fix
- **docs:** Documentation changes
- **style:** Code style changes (formatting, no logic change)
- **refactor:** Code refactoring (no feature change)
- **perf:** Performance improvements
- **test:** Adding or updating tests
- **chore:** Build process or tooling changes
- **security:** Security fixes or improvements

### Examples

```bash
# Feature
feat(interview): add support for Rust language

# Bug fix
fix(auth): resolve OAuth callback redirect loop

# Documentation
docs(api): add examples for chat endpoint

# Security
security(api): implement rate limiting on execute endpoint
```

### Commit Best Practices

- Write clear, concise commit messages
- Use present tense ("add feature" not "added feature")
- Capitalize the first letter
- No period at the end of the subject line
- Limit subject line to 50 characters
- Wrap body at 72 characters
- Reference issues and PRs in the footer

## Pull Request Process

### Before Submitting

1. **Update your fork:**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Create a feature branch:**
   ```bash
   git checkout -b feat/your-feature-name
   ```

3. **Make your changes:**
   - Write clean, well-documented code
   - Follow coding standards
   - Add tests for new functionality
   - Update documentation as needed

4. **Test your changes:**
   ```bash
   pnpm lint        # Check code style
   pnpm type-check  # Check TypeScript types
   pnpm build       # Ensure build succeeds
   ```

5. **Commit your changes:**
   ```bash
   git add .
   git commit -m "feat(scope): add new feature"
   ```

6. **Push to your fork:**
   ```bash
   git push origin feat/your-feature-name
   ```

### Submitting the PR

1. Go to the [MockmateWebsite repository](https://github.com/Nikayel/MockmateWebsite)
2. Click "New Pull Request"
3. Select your feature branch
4. Fill out the PR template:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How to test these changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed my code
- [ ] Commented complex sections
- [ ] Updated documentation
- [ ] No new warnings
- [ ] Added tests (if applicable)
- [ ] All tests pass
```

### PR Review Process

1. **Automated Checks:** CI/CD runs tests, linting, and build
2. **Code Review:** Maintainers review your code
3. **Feedback:** Address any requested changes
4. **Approval:** Once approved, a maintainer will merge

### After Your PR is Merged

1. **Delete your branch:**
   ```bash
   git branch -d feat/your-feature-name
   git push origin --delete feat/your-feature-name
   ```

2. **Update your fork:**
   ```bash
   git checkout main
   git pull upstream main
   git push origin main
   ```

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Writing Tests

We use Jest and React Testing Library:

```typescript
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders with correct label', () => {
    render(<Button label="Click me" onClick={() => {}} />)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<Button label="Click me" onClick={handleClick} />)
    screen.getByText('Click me').click()
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### Test Coverage Goals

- **Minimum:** 70% code coverage for new features
- **Target:** 80%+ code coverage overall
- **Critical paths:** 100% coverage for auth and payment flows

## Documentation

### Types of Documentation

1. **Code Comments:** Explain complex logic
2. **JSDoc:** Document functions and types
3. **README:** Keep README.md up-to-date
4. **API Docs:** Document all API endpoints
5. **Architecture Docs:** Explain system design decisions

### JSDoc Example

```typescript
/**
 * Generates interview feedback based on session data
 * @param sessionId - Unique identifier for the interview session
 * @param userId - ID of the user who completed the interview
 * @returns Promise resolving to feedback object with scores and analysis
 * @throws {Error} If session data is invalid or AI service is unavailable
 */
async function generateFeedback(
  sessionId: string,
  userId: string
): Promise<FeedbackResult> {
  // Implementation...
}
```

## Community

### Getting Help

- **GitHub Discussions:** Ask questions and share ideas
- **Discord:** Join our community server (coming soon)
- **Email:** Reach out to support@codesparring.com
- **Office Hours:** Monthly contributor calls (calendar link)

### Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes for significant contributions
- Annual contributor awards

### Becoming a Maintainer

Regular contributors may be invited to become maintainers. Criteria:
- Consistent high-quality contributions
- Deep understanding of the codebase
- Helpful code reviews
- Active community participation

## License

By contributing, you agree that your contributions will be licensed under the project's hybrid license model (see [README.md](./README.md#license)).

- **Open Source Components:** MIT License
- **Proprietary Components:** All Rights Reserved

---

**Questions?** Open an issue or reach out to the maintainers!

Thank you for contributing to CodeSparring! 🚀
