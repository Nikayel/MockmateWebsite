# Remotion Video Development

Help with Remotion video development tasks.

## Context

$ARGUMENTS

## Instructions

1. If no arguments provided, ask what Remotion task is needed
2. For component creation: Create React components following Remotion patterns
3. For animations: Use Remotion's `useCurrentFrame()`, `useVideoConfig()`, `interpolate()`, and `spring()`
4. For compositions: Register in Root.tsx with proper duration and fps
5. Always use TypeScript with proper types from 'remotion'

## Common Remotion imports

```typescript
import { useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, AbsoluteFill } from 'remotion';
```

## Best practices

- Keep compositions pure (no side effects)
- Use `interpolate()` for linear animations
- Use `spring()` for natural motion
- Break complex videos into smaller `<Sequence>` components
- Test with `npx remotion preview`
