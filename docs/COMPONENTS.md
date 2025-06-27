# Component Breakdown

## Overview

Sylo V2 follows a **component-driven architecture** with clear separation between UI components, business logic, and API integration. All components are built with **TypeScript**, **React 18**, and follow **accessibility-first design principles**.

## Frontend Component Architecture

### Page Components (Next.js App Router)

#### `app/layout.tsx` - Root Layout

```typescript
interface RootLayoutProps {
  children: React.ReactNode
}

// Purpose: Global app shell with Clerk authentication provider
// Features: Dark/light theme, global error boundary, analytics
// Dependencies: Clerk, TailwindCSS, global styles
```

#### `app/page.tsx` - Landing Page

```typescript
interface LandingPageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

// Purpose: Marketing landing page with value proposition
// Features: Hero section, feature overview, pricing, testimonials
// Components: HeroSection, FeatureGrid, PricingTable, TestimonialCarousel
```

#### `app/dashboard/page.tsx` - Main Dashboard

```typescript
interface DashboardProps {
  searchParams: {
    tab?: string
    filter?: string
  }
}

// Purpose: Central hub for service management and monitoring
// Features: Service connections, MCP config, system status
// Components: ServiceConnectionPanel, MCPConfigPanel, StatusOverview
```

#### `app/dashboard/connections/page.tsx` - Connection Management

```typescript
interface ConnectionsPageProps {
  searchParams: {
    service?: string
    status?: 'active' | 'inactive' | 'error'
  }
}

// Purpose: Detailed OAuth connection management interface
// Features: Add/remove services, permission management, troubleshooting
// Components: ConnectionList, OAuthWizard, PermissionEditor
```

#### `app/auth/callback/[service]/page.tsx` - OAuth Callback

```typescript
interface OAuthCallbackProps {
  params: { service: string }
  searchParams: {
    code?: string
    state?: string
    error?: string
  }
}

// Purpose: Handles OAuth authorization callbacks from providers
// Features: Token exchange, error handling, success redirection
// Components: LoadingSpinner, ErrorMessage, SuccessRedirect
```

### Core UI Components

#### Service Connection Management

```typescript
// ServiceConnectionPanel.tsx
interface ServiceConnectionPanelProps {
  connections: OAuthConnection[]
  onConnect: (service: ServiceType) => void
  onDisconnect: (connectionId: string) => void
  onRefresh: (connectionId: string) => void
}

// Purpose: Main interface for managing OAuth service connections
// Features: Visual service status, quick connect/disconnect, health monitoring
// State: Connection status, loading states, error handling
```

```typescript
// ServiceCard.tsx
interface ServiceCardProps {
  service: ServiceType
  connection?: OAuthConnection
  isConnecting?: boolean
  onConnect: () => void
  onDisconnect: () => void
  onConfigure: () => void
}

// Purpose: Individual service connection display and controls
// Features: Service branding, status indicators, action buttons
// Variants: Connected, disconnected, error, loading states
```

```typescript
// OAuthWizard.tsx
interface OAuthWizardProps {
  service: ServiceType
  onComplete: (connection: OAuthConnection) => void
  onCancel: () => void
}

// Purpose: Step-by-step OAuth setup wizard
// Features: Permission explanation, scope selection, progress tracking
// Steps: Service selection → Permission review → Authorization → Confirmation
```

```typescript
// PermissionEditor.tsx
interface PermissionEditorProps {
  connection: OAuthConnection
  availableScopes: OAuthScope[]
  onUpdate: (scopes: string[]) => void
}

// Purpose: Granular OAuth permission management
// Features: Scope descriptions, security indicators, batch operations
// Security: Clear permission explanations, impact warnings
```

#### MCP Configuration Management

```typescript
// MCPConfigPanel.tsx
interface MCPConfigPanelProps {
  configs: MCPConfig[]
  activeConfig?: MCPConfig
  onGenerate: () => void
  onActivate: (configId: string) => void
  onExport: (configId: string, format: 'json' | 'yaml') => void
}

// Purpose: MCP configuration generation and management interface
// Features: Real-time generation, multi-format export, version history
// Performance: Debounced regeneration, cached previews
```

```typescript
// ConfigGenerator.tsx
interface ConfigGeneratorProps {
  connections: OAuthConnection[]
  template?: MCPTemplate
  onGenerated: (config: MCPConfig) => void
}

// Purpose: Real-time MCP configuration generation
// Features: Live preview, validation feedback, template selection
// Optimization: Debounced updates, incremental generation
```

```typescript
// ConfigValidator.tsx
interface ConfigValidatorProps {
  config: MCPConfig
  onValidationComplete: (result: ValidationResult) => void
}

// Purpose: MCP configuration validation and compatibility checking
// Features: Spec compliance, LLM compatibility, error highlighting
// Integration: Multiple LLM provider validation APIs
```

```typescript
// ConfigExporter.tsx
interface ConfigExporterProps {
  config: MCPConfig
  formats: ExportFormat[]
  onExport: (format: ExportFormat) => void
}

// Purpose: Multi-format configuration export with copy/download options
// Features: JSON/YAML/TOML export, clipboard integration, direct download
// UX: One-click copy, format syntax highlighting
```

#### Context Visualization

```typescript
// ContextViewer.tsx
interface ContextViewerProps {
  userId: string
  contextType: 'projects' | 'communications' | 'tasks' | 'financials'
  refreshInterval?: number
  onRefresh: () => void
}

// Purpose: Real-time context data visualization from connected services
// Features: Auto-refresh, filtering, export capabilities
// Performance: Efficient polling, smart caching
```

```typescript
// ProjectSummary.tsx
interface ProjectSummaryProps {
  projects: Project[]
  filter?: ProjectFilter
  onProjectSelect: (project: Project) => void
}

// Purpose: Project status overview with timeline and stakeholder info
// Features: Progress visualization, deadline tracking, stakeholder communication
// Data Sources: Asana, Monday.com, Trello integration
```

```typescript
// CommunicationSummary.tsx
interface CommunicationSummaryProps {
  communications: Communication[]
  priorityLevel: 'all' | 'high' | 'urgent'
  onActionRequired: (communication: Communication) => void
}

// Purpose: Email and message summary with priority classification
// Features: Smart prioritization, action suggestions, quick responses
// AI Integration: Priority classification, sentiment analysis
```

#### Audit and Monitoring

```typescript
// AuditLogPanel.tsx
interface AuditLogPanelProps {
  logs: AuditLog[]
  filters: AuditLogFilter
  onFilterChange: (filters: AuditLogFilter) => void
  onExport: () => void
}

// Purpose: Comprehensive audit trail with filtering and export
// Features: Real-time updates, advanced filtering, compliance export
// Performance: Virtual scrolling for large datasets
```

```typescript
// StatusMonitor.tsx
interface StatusMonitorProps {
  services: ServiceStatus[]
  systemHealth: SystemHealth
  onServiceRefresh: (service: string) => void
}

// Purpose: Real-time system and service health monitoring
// Features: Service status indicators, performance metrics, alerts
// Integration: External monitoring APIs, uptime tracking
```

```typescript
// ErrorHandler.tsx
interface ErrorHandlerProps {
  error: SystemError
  context: ErrorContext
  onRetry: () => void
  onReport: (error: SystemError) => void
}

// Purpose: User-friendly error display with actionable resolution steps
// Features: Error categorization, auto-retry, support integration
// UX: Clear error explanations, guided troubleshooting
```

### Shared UI Components

#### Navigation and Layout

```typescript
// Navbar.tsx
interface NavbarProps {
  user: User
  notifications: Notification[]
  onSignOut: () => void
}

// Purpose: Top navigation with user menu and notifications
// Features: Profile dropdown, notification center, quick actions
// Responsive: Mobile-optimized collapsible design
```

```typescript
// Sidebar.tsx
interface SidebarProps {
  currentPath: string
  connections: OAuthConnection[]
  isCollapsed?: boolean
  onToggle: () => void
}

// Purpose: Main navigation sidebar with service status indicators
// Features: Service health indicators, quick navigation, collapsible
// State: Persistent collapse state, active route highlighting
```

```typescript
// LoadingSpinner.tsx
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
  progress?: number
}

// Purpose: Consistent loading states throughout the application
// Features: Multiple sizes, optional progress, custom messages
// Accessibility: Screen reader support, focus management
```

#### Form Components

```typescript
// Form.tsx
interface FormProps<T> {
  schema: ZodSchema<T>
  defaultValues?: Partial<T>
  onSubmit: (data: T) => void
  children: (props: FormRenderProps<T>) => React.ReactNode
}

// Purpose: Type-safe form wrapper with validation
// Features: Zod schema validation, error handling, accessibility
// Integration: React Hook Form, automatic error display
```

```typescript
// Input.tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
}

// Purpose: Consistent form input with validation and accessibility
// Features: Error states, help text, icon integration
// Accessibility: ARIA labels, error announcements
```

```typescript
// Button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
}

// Purpose: Consistent button styling with loading states
// Features: Multiple variants, icon support, loading indicators
// Accessibility: Focus management, keyboard navigation
```

#### Data Display

```typescript
// Table.tsx
interface TableProps<T> {
  data: T[]
  columns: TableColumn<T>[]
  pagination?: PaginationConfig
  sorting?: SortingConfig
  onRowClick?: (row: T) => void
}

// Purpose: Feature-rich data table with sorting and pagination
// Features: Column sorting, pagination, row selection, export
// Performance: Virtual scrolling for large datasets
```

```typescript
// StatusBadge.tsx
interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info'
  children: React.ReactNode
  size?: 'sm' | 'md'
}

// Purpose: Consistent status indication across the application
// Features: Color-coded statuses, optional pulse animation
// Accessibility: High contrast colors, clear labeling
```

```typescript
// CodeBlock.tsx
interface CodeBlockProps {
  code: string
  language: string
  showLineNumbers?: boolean
  onCopy?: () => void
}

// Purpose: Syntax-highlighted code display with copy functionality
// Features: Syntax highlighting, line numbers, copy to clipboard
// Integration: Prism.js for syntax highlighting
```

## Backend Service Components

### API Route Handlers

```typescript
// /pages/api/auth/oauth/initiate/[service].ts
interface OAuthInitiateHandler {
  GET: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
}

// Purpose: OAuth flow initiation with PKCE challenge generation
// Security: CSRF protection, state validation, rate limiting
// Integration: Multiple OAuth provider support
```

```typescript
// /pages/api/config/mcp.ts
interface MCPConfigHandler {
  GET: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
}

// Purpose: Real-time MCP configuration generation
// Performance: Caching, incremental updates, compression
// Validation: MCP spec compliance, service compatibility
```

```typescript
// /pages/api/webhook/command.ts
interface WebhookCommandHandler {
  POST: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
}

// Purpose: Agent command processing with security validation
// Security: HMAC signature validation, rate limiting, audit logging
// Performance: Async processing, queue management
```

### Business Logic Services

```typescript
// /lib/oauth/OAuthService.ts
class OAuthService {
  generateAuthURL(service: string, userId: string): Promise<string>
  handleCallback(code: string, state: string): Promise<OAuthConnection>
  refreshToken(connectionId: string): Promise<OAuthConnection>
  revokeAccess(connectionId: string): Promise<void>
}

// Purpose: Centralized OAuth flow management
// Security: Token encryption, secure storage, audit logging
// Reliability: Retry logic, error recovery, monitoring
```

```typescript
// /lib/context/ContextCompiler.ts
class ContextCompiler {
  compileProjects(userId: string): Promise<ProjectContext>
  compileCommunications(userId: string): Promise<CommunicationContext>
  compileTasks(userId: string): Promise<TaskContext>
  compileFinancials(userId: string): Promise<FinancialContext>
}

// Purpose: Real-time context data compilation from multiple sources
// Performance: Parallel API calls, intelligent caching, compression
// Reliability: Fallback strategies, partial success handling
```

```typescript
// /lib/mcp/MCPGenerator.ts
class MCPGenerator {
  generateConfig(userId: string): Promise<MCPConfig>
  validateConfig(config: MCPConfig): Promise<ValidationResult>
  exportConfig(configId: string, format: ExportFormat): Promise<string>
}

// Purpose: MCP configuration generation and validation
// Features: Template system, version management, compatibility checking
// Performance: Incremental generation, caching, optimization
```

### Utility Services

```typescript
// /lib/security/EncryptionService.ts
class EncryptionService {
  encrypt(data: string): string
  decrypt(encryptedData: string): string
  generateHMAC(data: string): string
  validateHMAC(data: string, signature: string): boolean
}

// Purpose: Centralized cryptographic operations
// Security: AES-256-GCM encryption, HMAC-SHA256 signatures
// Compliance: FIPS 140-2 level encryption standards
```

```typescript
// /lib/audit/AuditLogger.ts
class AuditLogger {
  logAction(action: AuditAction): Promise<void>
  queryLogs(filters: AuditLogFilter): Promise<AuditLog[]>
  exportLogs(filters: AuditLogFilter): Promise<string>
}

// Purpose: Comprehensive audit trail management
// Compliance: SOC2, GDPR compliant logging
// Performance: Async logging, batch processing, archival
```

```typescript
// /lib/cache/CacheService.ts
class CacheService {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<void>
  invalidate(pattern: string): Promise<void>
  stats(): Promise<CacheStats>
}

// Purpose: Redis-based caching with intelligent invalidation
// Performance: Connection pooling, compression, monitoring
// Reliability: Fallback strategies, cluster support
```

## State Management

### Global State (Zustand)

```typescript
// /store/authStore.ts
interface AuthStore {
  user: User | null
  isLoading: boolean
  signIn: () => void
  signOut: () => void
  updateUser: (user: Partial<User>) => void
}

// Purpose: Authentication state management
// Features: Persistent state, automatic token refresh
// Integration: Clerk authentication provider
```

```typescript
// /store/connectionStore.ts
interface ConnectionStore {
  connections: OAuthConnection[]
  isLoading: boolean
  error: string | null

  fetchConnections: () => Promise<void>
  addConnection: (connection: OAuthConnection) => void
  updateConnection: (id: string, updates: Partial<OAuthConnection>) => void
  removeConnection: (id: string) => void
  refreshConnection: (id: string) => Promise<void>
}

// Purpose: OAuth connection state management
// Features: Optimistic updates, error recovery, real-time sync
// Performance: Efficient re-renders, selective updates
```

```typescript
// /store/configStore.ts
interface ConfigStore {
  configs: MCPConfig[]
  activeConfig: MCPConfig | null
  isGenerating: boolean

  generateConfig: () => Promise<void>
  setActiveConfig: (id: string) => void
  exportConfig: (id: string, format: ExportFormat) => Promise<string>
  deleteConfig: (id: string) => void
}

// Purpose: MCP configuration state management
// Features: Auto-generation, version tracking, export management
// Performance: Debounced generation, incremental updates
```

## Component Testing Strategy

### Unit Testing (Jest + Testing Library)

```typescript
// ServiceCard.test.tsx
describe('ServiceCard', () => {
  it('renders connected state correctly', () => {
    const mockConnection = createMockConnection('gmail', 'active');
    render(
      <ServiceCard
        service="gmail"
        connection={mockConnection}
        onConnect={jest.fn()}
        onDisconnect={jest.fn()}
      />
    );

    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByTestId('disconnect-btn')).toBeEnabled();
  });

  it('handles disconnect action', async () => {
    const mockOnDisconnect = jest.fn();
    const mockConnection = createMockConnection('gmail', 'active');

    render(
      <ServiceCard
        service="gmail"
        connection={mockConnection}
        onConnect={jest.fn()}
        onDisconnect={mockOnDisconnect}
      />
    );

    await userEvent.click(screen.getByTestId('disconnect-btn'));
    expect(mockOnDisconnect).toHaveBeenCalledWith(mockConnection.id);
  });
});
```

### Integration Testing (Playwright)

```typescript
// oauth-flow.spec.ts
test('complete OAuth flow for Gmail', async ({ page }) => {
  await page.goto('/dashboard/connections')

  // Start OAuth flow
  await page.click('[data-testid="connect-gmail-btn"]')
  await expect(page).toHaveURL(/.*auth\/oauth\/initiate\/gmail.*/)

  // Mock OAuth provider response
  await page.route('**/oauth/callback/**', async route => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ success: true }),
    })
  })

  // Complete authorization
  await page.click('[data-testid="authorize-btn"]')
  await expect(page).toHaveURL('/dashboard/connections')
  await expect(page.locator('[data-testid="gmail-connected"]')).toBeVisible()
})
```

## Performance Optimization

### Component Optimization

```typescript
// Memoized expensive components
const MCPConfigPanel = React.memo(({ configs, onGenerate }) => {
  const memoizedConfig = useMemo(
    () => generatePreview(configs),
    [configs]
  );

  return <ConfigDisplay config={memoizedConfig} />;
});

// Debounced user input
const useDebounced = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};
```

### Code Splitting

```typescript
// Lazy-loaded heavy components
const MCPConfigPanel = lazy(() => import('./MCPConfigPanel'))
const AuditLogPanel = lazy(() => import('./AuditLogPanel'))

// Route-based code splitting
const DashboardPage = lazy(() => import('../pages/dashboard'))
```

This component architecture provides a **scalable, maintainable foundation** for Sylo V2's complex OAuth management, real-time context compilation, and secure agent integration capabilities.
