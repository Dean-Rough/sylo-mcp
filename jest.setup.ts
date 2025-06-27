import 'jest-extended/all'
import '@testing-library/jest-dom'
// import { server } from './src/mocks/server'
import setLogLevel from 'console-log-level'

// Set up MSW (commented out for now - MSW v2 has complex Jest integration)
// beforeAll(() => {
//   server.listen({
//     onUnhandledRequest: 'error',
//   })
// })

// afterEach(() => {
//   server.resetHandlers()
// })

// afterAll(() => {
//   server.close()
// })

// Configure structured logging for tests (disabled in test environment to avoid conflicts)
// const logger = setLogLevel({ level: process.env.NODE_ENV === 'test' ? 'warn' : 'info' })
// Override console methods with structured logging
// Object.assign(console, logger)

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
      isLocaleDomain: false,
      isReady: true,
      defaultLocale: 'en',
      domainLocales: [],
      isPreview: false,
    }
  },
}))

// Mock Next.js navigation (App Router)
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock Clerk authentication
jest.mock('@clerk/nextjs', () => ({
  useUser: () => ({
    user: {
      id: 'test-user-id',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      firstName: 'Test',
      lastName: 'User',
    },
    isLoaded: true,
    isSignedIn: true,
  }),
  useAuth: () => ({
    userId: 'test-user-id',
    sessionId: 'test-session-id',
    getToken: jest.fn().mockResolvedValue('test-token'),
    isLoaded: true,
    isSignedIn: true,
  }),
  SignInButton: ({ children }: { children: React.ReactNode }) => children,
  SignOutButton: ({ children }: { children: React.ReactNode }) => children,
  UserButton: () => 'UserButton',
  currentUser: jest.fn().mockResolvedValue({
    id: 'test-user-id',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
    firstName: 'Test',
    lastName: 'User',
  }),
}))

// Mock Clerk backend
jest.mock('@clerk/backend', () => ({
  currentUser: jest.fn().mockResolvedValue({
    id: 'test-user-id',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
    firstName: 'Test',
    lastName: 'User',
  }),
}))

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock Web APIs for Node.js test environment
if (typeof Response === 'undefined') {
  global.Response = class MockResponse {
    constructor(
      public body: any,
      public init: ResponseInit = {}
    ) {}
    get status() {
      return this.init.status || 200
    }
    get ok() {
      return this.status >= 200 && this.status < 300
    }
    get statusText() {
      return this.init.statusText || 'OK'
    }
    get headers() {
      return new Headers(this.init.headers)
    }
    async text() {
      return String(this.body)
    }
    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
    }
  } as any
}

if (typeof Request === 'undefined') {
  global.Request = class MockRequest {
    constructor(
      public url: string,
      public init: RequestInit = {}
    ) {}
    get method() {
      return this.init.method || 'GET'
    }
    get headers() {
      return new Headers(this.init.headers)
    }
    async text() {
      return String(this.init.body || '')
    }
    async json() {
      return typeof this.init.body === 'string' ? JSON.parse(this.init.body) : this.init.body
    }
  } as any
}

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-uuid-123'),
    getRandomValues: jest.fn(arr => arr.map(() => Math.floor(Math.random() * 256))),
  },
  writable: true,
})

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Suppress console errors in tests unless explicitly testing them
const originalError = console.error
beforeAll(() => {
  // Only override console.error if it hasn't been mocked by jest.spyOn
  if (!jest.isMockFunction(console.error)) {
    console.error = (...args: any[]) => {
      if (
        typeof args[0] === 'string' &&
        args[0].includes('Warning: ReactDOM.render is no longer supported')
      ) {
        return
      }
      originalError.call(console, ...args)
    }
  }
})

afterAll(() => {
  // Only restore if we actually overrode it
  if (!jest.isMockFunction(console.error)) {
    console.error = originalError
  }
})
