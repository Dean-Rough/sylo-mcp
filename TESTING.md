# Testing Guide

## Overview

This project uses a modern AI-compatible testing stack:

- **Jest** with `jest-extended` for unit/integration tests
- **Playwright** with trace viewer for E2E tests
- **MSW** for API mocking (v2 - setup in progress)
- **why-did-you-render** for React debugging (dev only)
- **console-log-level** for structured logging

## Installation Complete ✅

The testing stack has been successfully installed and configured:

- ✅ Jest with TypeScript support
- ✅ jest-extended matchers (v6) with custom type definitions
- ✅ Playwright with trace viewer enabled
- ✅ MSW v2 (handlers created, integration pending)
- ✅ why-did-you-render for React performance debugging
- ✅ console-log-level for structured logging
- ✅ Example tests demonstrating all features

## Running Tests

```bash
# Unit tests
npm run test                # Run once
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage

# E2E tests (requires server to be running separately)
npm run test:e2e           # Headless
npm run test:e2e:ui        # Interactive UI
npm run test:e2e:debug     # Debug mode

# All tests
npm run test:all
```

## Current Test Results

```
✅ 6 passing tests demonstrating:
   - jest-extended array matchers
   - jest-extended string matchers
   - jest-extended object matchers
   - jest-extended date/number matchers
   - jest-extended function/promise matchers
   - Basic functionality tests
```

## Playwright Trace Viewer

Traces are automatically captured for all tests. To view them:

```bash
# Open trace viewer
npx playwright show-trace test-results/trace.zip

# Or use the UI mode for live debugging
npm run test:e2e:ui

# View last HTML report
npx playwright show-report
```

The trace viewer shows:

- Network requests/responses
- DOM snapshots at each step
- Console logs and errors
- Screenshots and videos

## Jest Extended Matchers

Enhanced assertions for better test readability:

```typescript
// Arrays
expect(array).toIncludeAllMembers(['a', 'b'])
expect(array).toIncludeAnyMembers(['a', 'c'])
expect(array).toIncludeSameMembers(['b', 'a'])
expect(array).toBeArrayOfSize(3)
expect(array).toSatisfyAll(x => typeof x === 'string')

// Objects
expect(obj).toContainKeys(['id', 'name'])
expect(obj).toContainAllKeys(['id', 'name', 'email'])
expect(obj).toContainAnyKeys(['id', 'username'])
expect(obj).toContainEntry(['key', 'value'])
expect(obj).toContainEntries([
  ['name', 'John'],
  ['age', 30],
])

// Strings
expect(str).toStartWith('prefix')
expect(str).toEndWith('suffix')
expect(str).toInclude('substring')
expect(str).toEqualCaseInsensitive('HELLO')

// Dates & Numbers
expect(date).toBeAfter(otherDate)
expect(date).toBeBefore(otherDate)
expect(date).toBeValidDate()
expect(num).toBeWithin(1, 10)

// Functions & Promises
expect(mockFn).toHaveBeenCalledOnce()
await expect(promise).resolves.toBe('value')
await expect(promise).rejects.toThrow('error')
```

## API Mocking with MSW

Mock handlers are in `src/mocks/handlers.ts`. MSW v2 integration is set up but commented out due to complex Jest integration. To use:

```typescript
// Uncomment MSW setup in jest.setup.ts
import { server } from '../src/mocks/server'
import { http, HttpResponse } from 'msw'

server.use(
  http.get('/api/endpoint', () => {
    return HttpResponse.json({ data: 'mocked' })
  })
)
```

## React Debugging

In development, `why-did-you-render` tracks unnecessary re-renders:

```typescript
// Import in your app entry point for development
import '@/lib/wdyr'
```

Check console for warnings about component performance.

## File Structure

```
__tests__/
  example.test.ts           # Comprehensive test examples
src/
  mocks/
    server.ts              # MSW server setup
    handlers.ts            # API mock handlers
  lib/
    wdyr.ts               # why-did-you-render config
  types/
    jest-extended.d.ts     # TypeScript definitions
tests/
  e2e/
    example.spec.ts        # Playwright E2E tests
jest.config.ts             # Jest configuration
jest.setup.ts              # Jest setup with all integrations
playwright.config.ts       # Playwright configuration
TESTING.md                 # This guide
```

## Next Steps

1. **MSW Integration**: Complete MSW v2 Jest integration for API mocking
2. **Environment Setup**: Add test environment variables for Clerk/auth
3. **Component Tests**: Add React component testing examples
4. **CI/CD**: Configure testing in GitHub Actions
5. **Coverage**: Set up coverage reporting and thresholds

The testing foundation is now solid and ready for development! 🚀
