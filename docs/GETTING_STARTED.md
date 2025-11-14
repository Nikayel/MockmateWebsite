# Getting Started with MockMate

This guide will help you set up MockMate from scratch.

## Quick Start

1. **Install the Extension**
   - Open VS Code
   - Go to Extensions (Cmd+Shift+X)
   - Search for "MockMate"
   - Click Install

2. **Sign In**
   - Open Command Palette (Cmd+Shift+P)
   - Run "MockMate: Sign In"
   - Authenticate with GitHub

3. **Start Your First Interview**
   - Run "MockMate: Start Simulation"
   - Choose a problem
   - Start coding!

## Detailed Setup

### Prerequisites

- VS Code 1.102.0 or higher
- GitHub account
- Internet connection

### Extension Configuration

After installation, configure the extension in VS Code settings:

1. Open Settings (Cmd+,)
2. Search for "mockmate"
3. Set your Supabase URL and keys (if self-hosting)

Default settings work out of the box if using the hosted service.

### Authentication

MockMate uses GitHub OAuth for authentication:

1. Click "Sign In" in the extension
2. Browser opens to the MockMate website
3. Click "Continue with GitHub"
4. Authorize the app
5. VS Code automatically receives your session token

### First Interview

1. **Start Simulation**
   - Command Palette → "MockMate: Start Simulation"
   - Or click the MockMate icon in the sidebar

2. **Choose Problem Type**
   - Data Structures & Algorithms
   - System Design
   - Bug Fixing
   - Or browse scenarios

3. **Configure Context** (optional)
   - Select workspace folders to include
   - This helps AI understand your coding style

4. **Start Coding**
   - Write your solution
   - Ask the AI interviewer questions
   - Use the coding partner for hints

5. **Submit**
   - Run "MockMate: Submit Solution"
   - Get feedback and analytics

## Understanding the Interface

### AI Interviewer Panel

The interviewer acts like a real technical interviewer:
- Asks clarifying questions
- Reviews your approach
- Discusses complexity
- Provides feedback

### Coding Partner Panel

Your AI coding assistant:
- Helps debug issues
- Suggests optimizations
- Answers algorithm questions
- Provides hints when stuck

### Workspace Context

MockMate reads your open files to:
- Understand your coding style
- Provide consistent suggestions
- Reference your existing code patterns
- Make interviews more realistic

## Tips for Best Results

1. **Upload Your Codebase**
   - Include relevant files from your projects
   - Helps AI understand your patterns

2. **Be Conversational**
   - Talk through your approach
   - Ask questions like in real interviews

3. **Use Both AIs**
   - Interviewer for guidance
   - Partner for technical help

4. **Review Feedback**
   - Check session summaries
   - Learn from mistakes
   - Track improvement over time

## Troubleshooting

### Can't Sign In

- Check internet connection
- Make sure GitHub OAuth is configured
- Try signing out and back in

### AI Not Responding

- Check API keys are set (if self-hosting)
- Verify internet connection
- Check Supabase Edge Functions are deployed

### Extension Not Loading

- Reload VS Code window
- Check extension is enabled
- Update to latest version

## Next Steps

- Read the [Full Documentation](./FULL_DOCS.md)
- Check out [Pricing & Limits](./PRICING.md)
- See [API Reference](./API.md) for developers

