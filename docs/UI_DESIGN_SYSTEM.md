# UI Design System - Sylo V2

## Overview

Sylo V2 uses a modern, clean design system built on shadcn/ui components with custom branding and typography to create a professional, accessible interface for AI agent configuration.

## Brand Identity

### Logo

- **Primary Logo**: `/docs/sylo-logo-black.svg`
- **Usage**: Main navigation, authentication pages, and key brand touchpoints
- **Format**: SVG for scalability and crisp rendering at all sizes
- **Color**: Black for primary use, can be inverted for dark backgrounds

### Color Palette

```css
/* Primary Brand Colors */
--primary: 222.2 47.4% 11.2%; /* Deep charcoal */
--primary-foreground: 210 40% 98%; /* Clean white */

/* UI Colors */
--background: 0 0% 100%; /* Pure white */
--foreground: 222.2 84% 4.9%; /* Near black text */
--muted: 210 40% 96%; /* Light gray backgrounds */
--muted-foreground: 215.4 16.3% 46.9%; /* Subdued text */

/* Status Colors */
--success: 142 76% 36%; /* Green for connected states */
--warning: 48 96% 53%; /* Amber for warnings */
--destructive: 0 84.2% 60.2%; /* Red for errors */

/* Service Brand Colors */
--gmail: 4 90% 58%; /* Gmail red */
--asana: 271 91% 65%; /* Asana purple */
--xero: 200 98% 39%; /* Xero blue */
```

## Typography

### Font Family: Geist

Sylo V2 uses the Geist font family for its modern, technical aesthetic and excellent readability.

#### Font Weights & Usage:

**Geist Bold (700)**

- **Usage**: Headers (h1-h6), card titles, navigation items, primary buttons
- **Characteristics**: Strong visual hierarchy, excellent for emphasis
- **Examples**: Page titles, section headers, call-to-action buttons

**Geist Regular (400)**

- **Usage**: Body text, descriptions, paragraph content, labels
- **Characteristics**: Optimal readability for long-form content
- **Examples**: Card descriptions, help text, documentation

**Geist Mono (400)**

- **Usage**: Input fields, tags, buttons, code snippets, technical data
- **Characteristics**: Monospace for technical precision and data display
- **Examples**: API endpoints, configuration values, status badges, form inputs

### Typography Scale

```css
/* Headers - Geist Bold */
h1: 2.25rem (36px) - Page titles
h2: 1.875rem (30px) - Section headers
h3: 1.5rem (24px) - Subsection headers
h4: 1.25rem (20px) - Card titles
h5: 1.125rem (18px) - Small headers
h6: 1rem (16px) - Minimal headers

/* Body - Geist Regular */
body: 0.875rem (14px) - Default text
large: 1rem (16px) - Prominent text
small: 0.75rem (12px) - Supporting text
muted: 0.875rem (14px) - Secondary text

/* Technical - Geist Mono */
code: 0.875rem (14px) - Inline code
input: 0.875rem (14px) - Form fields
badge: 0.75rem (12px) - Status indicators
button: 0.875rem (14px) - Interactive elements
```

## Component System

### Built on shadcn/ui

- **Framework**: React + TypeScript + Tailwind CSS
- **Accessibility**: WAI-ARIA compliant components
- **Theming**: CSS custom properties for easy customization
- **Variants**: Multiple styles for different contexts

### Core Components

#### Cards

- **Primary Use**: Service connections, configuration panels, data display
- **Style**: Clean borders, subtle shadows, rounded corners
- **Content**: Header with title/description, organized content areas

#### Buttons

- **Font**: Geist Mono for technical precision
- **Variants**: Default, outline, ghost, destructive
- **States**: Default, hover, disabled, loading
- **Sizes**: Small, default, large

#### Badges & Tags

- **Font**: Geist Mono for status clarity
- **Usage**: Connection status, service states, categories
- **Colors**: Semantic (success/warning/error) and neutral

#### Form Elements

- **Font**: Geist Mono for input clarity
- **Style**: Minimal borders, focus states, error handling
- **Components**: Input, textarea, select, labels

#### Navigation

- **Font**: Geist Bold for prominence
- **Style**: Clean, minimal, contextual breadcrumbs
- **Components**: Main nav, user menu, page actions

## Layout Principles

### Grid System

- **Desktop**: 12-column CSS Grid with gap spacing
- **Responsive**: Mobile-first approach with breakpoints
- **Spacing**: Consistent 1.5rem (24px) gaps between major elements

### Spacing Scale

```css
xs: 0.25rem (4px)   - Tight spacing
sm: 0.5rem (8px)    - Small gaps
md: 1rem (16px)     - Default spacing
lg: 1.5rem (24px)   - Section spacing
xl: 2rem (32px)     - Major spacing
2xl: 3rem (48px)    - Large spacing
```

### Responsive Breakpoints

```css
sm: 640px   - Small tablets
md: 768px   - Large tablets
lg: 1024px  - Desktop
xl: 1280px  - Large desktop
2xl: 1536px - Extra large
```

## Interaction Patterns

### Loading States

- **Spinners**: Subtle animations using Lucide React icons
- **Skeleton**: Placeholder content during data fetching
- **Progressive**: Show partial content while loading additional data

### Feedback Systems

- **Toasts**: Success, error, and informational notifications
- **Inline Validation**: Real-time form feedback
- **Progress Indicators**: Multi-step process guidance

### Micro-interactions

- **Hover States**: Subtle color and shadow changes
- **Focus States**: Clear keyboard navigation indicators
- **Transitions**: Smooth 150-200ms transitions for state changes

## Accessibility

### WCAG 2.1 AA Compliance

- **Color Contrast**: Minimum 4.5:1 ratio for normal text
- **Keyboard Navigation**: Full functionality without mouse
- **Screen Readers**: Proper ARIA labels and semantic HTML
- **Focus Management**: Logical tab order and visible focus indicators

### Inclusive Design

- **Font Size**: Scalable typography (rem units)
- **Color Independence**: Information conveyed beyond color alone
- **Motion Reduction**: Respect for prefers-reduced-motion
- **High Contrast**: Support for high contrast mode

## Implementation

### CSS Custom Properties

All colors and spacing use CSS custom properties for easy theming and dark mode support.

### Component Usage

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// Example component with proper typography
;<Card>
  <CardHeader>
    <CardTitle className="font-bold">Service Status</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-muted-foreground">Connection details</p>
    <Badge variant="default" className="font-mono">
      Connected
    </Badge>
    <Button className="font-mono">Configure</Button>
  </CardContent>
</Card>
```

### Font Loading

Fonts are loaded via next/font for optimal performance and zero layout shift.

## Dark Mode Support

The design system includes full dark mode support with automatic switching based on system preferences.

### Dark Mode Colors

```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --primary: 210 40% 98%;
  /* ... additional dark mode values */
}
```

## Development Guidelines

### Component Creation

1. Use shadcn/ui base components when possible
2. Apply proper typography classes (font-bold, font-mono)
3. Include proper ARIA attributes
4. Support both light and dark modes
5. Add loading and error states

### Code Standards

- TypeScript for type safety
- Tailwind CSS for styling
- ESLint + Prettier for code quality
- Accessible HTML semantics
- Responsive design by default

This design system ensures consistency, accessibility, and maintainability across the entire Sylo V2 application.
