# MockMate Trial Recording - Setup Guide

This guide will help you set up the MockMate trial recording feature with real AI interviewer capabilities.

## Overview

The MockMate trial recording is a fully functional mock coding interview simulator featuring:

- **Real Code Editor**: Monaco Editor (VS Code's editor) for actual code writing
- **AI Interviewer**: Powered by Claude AI for realistic interview conversations
- **AI Coding Partner**: Get hints and help while solving the problem
- **Two Sum Problem**: A classic LeetCode-style interview question
- **Automated Testing**: 5 comprehensive test cases including edge cases
- **Performance Analytics**: Real-time feedback on your solution

## Setup Instructions

### 1. Install Dependencies

The required packages are already installed:
- `@monaco-editor/react` - Real code editor
- `@anthropic-ai/sdk` - AI chatbot integration

### 2. Configure API Keys

1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Add your Anthropic API key to `.env.local`:
   ```
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```

3. Get your API key from [Anthropic Console](https://console.anthropic.com/)

### 3. Run the Development Server

```bash
npm run dev
```

Visit `http://localhost:3000/demo` to try the mock interview!

## Features

### Real Code Editor
- Full Monaco Editor integration (same as VS Code)
- Syntax highlighting for JavaScript
- Line numbers and auto-formatting
- Read-only when interview is not started

### AI Interviewer
- Introduces the Two Sum problem
- Answers clarifying questions
- Discusses your approach and solution
- Reviews code for improvements
- Provides professional interview feedback

### AI Coding Partner
- Available anytime during the interview
- Provides hints when you're stuck
- Helps debug code issues
- Answers questions about algorithms
- Suggests optimizations

### Code Execution & Testing

The system runs 5 comprehensive test cases:

1. **Basic case**: `[2,7,11,15]`, target `9`
2. **Non-adjacent pair**: `[3,2,4]`, target `6`
3. **Duplicate numbers**: `[3,3]`, target `6`
4. **Negative numbers**: `[-1,-2,-3,-4,-5]`, target `-8`
5. **Zeros**: `[0,4,3,0]`, target `0`

### Performance Metrics

After completing all tests, you'll receive:

- **Time Taken**: How long you spent on the problem
- **Code Quality**: Score based on correctness and optimization
- **Communication**: Rating based on interviewer interaction
- **Test Pass Rate**: Percentage of tests passed

## API Endpoints

### POST /api/chat
Handles AI chatbot messages for both the interviewer and coding partner.

**Request:**
```json
{
  "message": "What's the time complexity?",
  "context": [...previous messages],
  "role": "interviewer" | "partner"
}
```

**Response:**
```json
{
  "reply": "The optimal solution has O(n) time complexity..."
}
```

### POST /api/execute
Executes and validates the Two Sum solution.

**Request:**
```json
{
  "code": "function twoSum(nums, target) { ... }"
}
```

**Response:**
```json
{
  "success": true,
  "results": [...test case results],
  "summary": {
    "total": 5,
    "passed": 5,
    "failed": 0,
    "passRate": 100
  }
}
```

## How It Works

1. **Start Interview**: Click "Start Mock Interview" to begin
   - Timer starts tracking your time
   - AI Interviewer presents the Two Sum problem
   - Code editor becomes editable

2. **Solve the Problem**: Write your solution in the Monaco Editor
   - Ask the AI Interviewer clarifying questions
   - Use the AI Coding Partner for hints and help
   - Write your code in JavaScript

3. **Run Tests**: Click "Run Tests" to validate your solution
   - 5 test cases execute automatically
   - See which tests pass/fail in real-time
   - Get immediate feedback

4. **Complete**: When all tests pass
   - Comprehensive performance analysis
   - Detailed feedback on strengths and improvements
   - Export your interview report as JSON

## Code Quality Scoring

- **95%+**: Optimal O(n) solution with hash map, all tests pass
- **75%**: Brute force O(n²) solution, all tests pass
- **<75%**: Some tests failed or suboptimal solution

## Tips for Users

1. **Think aloud**: Engage with the AI Interviewer to improve communication score
2. **Ask questions**: Use the AI Coding Partner when stuck
3. **Test edge cases**: Consider negative numbers, duplicates, and zeros
4. **Optimize**: Try to achieve O(n) time complexity with a hash map
5. **Time management**: Aim to complete in under 15 minutes

## Troubleshooting

### "Sorry, I encountered an error"
- Check that your `ANTHROPIC_API_KEY` is set in `.env.local`
- Ensure you have API credits in your Anthropic account
- Restart the dev server after adding the API key

### Code editor not showing
- Monaco Editor loads client-side only
- Check browser console for errors
- Try refreshing the page

### Tests not running
- Ensure your function is named `twoSum`
- Check that it accepts parameters `(nums, target)`
- Make sure it returns an array `[index1, index2]`

## Future Enhancements

Potential improvements for the trial recording:
- Support for multiple programming languages (Python, Java, C++)
- More interview problems (Binary Tree, Dynamic Programming, etc.)
- Video recording of the interview session
- Shared interview reports via unique links
- Integration with VS Code extension for seamless experience

## Questions?

If you encounter any issues or have questions about the setup, please check:
- The `.env.local.example` file for required environment variables
- The API documentation at `/api/chat` and `/api/execute`
- Your browser console for error messages
