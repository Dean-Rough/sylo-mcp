# 🎨 Sylo V2 Icon Style Guide

## **Rule: NO EMOJI ICONS**
**Always use Lucide React icons instead of emoji for UI elements.**

## **Icon System**

### **Import Pattern**
```tsx
import { IconName } from 'lucide-react'
import { iconClass } from '@/lib/utils'
```

### **Usage Pattern**
```tsx
<IconName className={iconClass('md', 'text-blue-600')} />
```

## **Standard Icon Sizes**
- `xs`: `h-3 w-3` (12px) - Inline text icons
- `sm`: `h-4 w-4` (16px) - Default size, buttons
- `md`: `h-5 w-5` (20px) - Cards, navigation
- `lg`: `h-6 w-6` (24px) - Feature highlights
- `xl`: `h-8 w-8` (32px) - Large displays

## **Sylo V2 Icon Mapping**

### **Core Features**
- 🔒 → `Shield` - Security, credential protection
- 🤖 → `Bot` - AI agents, automation
- 🔗 → `Link2` - Connections, integrations
- ⚡ → `Zap` - Performance, speed
- 🚀 → `Rocket` - Launch, deployment

### **Services & Integrations**
- 📧 → `Mail` - Gmail, email
- 📅 → `Calendar` - Calendar events
- 📊 → `BarChart3` - Analytics, reports
- 📝 → `FileText` - Documents, notes
- 💰 → `DollarSign` - Financial, Xero

### **Actions & States**
- ✅ → `CheckCircle` - Success, completed
- ❌ → `XCircle` - Error, failed
- ⚠️ → `AlertTriangle` - Warning, attention
- 🔍 → `Search` - Search, discovery
- ⚙️ → `Settings` - Configuration
- 🔧 → `Wrench` - Tools, maintenance

### **Navigation & UI**
- 👤 → `User` - User profile
- 📱 → `Smartphone` - Mobile
- 💻 → `Monitor` - Desktop
- 🌐 → `Globe` - Web, external
- 💡 → `Lightbulb` - Ideas, tips

## **Color Guidelines**

### **Semantic Colors**
```tsx
// Success
<CheckCircle className={iconClass('sm', 'text-green-600')} />

// Warning  
<AlertTriangle className={iconClass('sm', 'text-yellow-600')} />

// Error
<XCircle className={iconClass('sm', 'text-red-600')} />

// Info
<Info className={iconClass('sm', 'text-blue-600')} />
```

### **Brand Colors**
```tsx
// Primary brand
<Icon className={iconClass('md', 'text-blue-600')} />

// Secondary
<Icon className={iconClass('md', 'text-gray-600')} />

// Muted
<Icon className={iconClass('sm', 'text-gray-400')} />
```

## **Examples**

### **Feature Cards**
```tsx
<div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
  <Shield className={iconClass('lg', 'text-blue-600')} />
</div>
```

### **Navigation Items**
```tsx
<Settings className={iconClass('sm', 'text-gray-600')} />
<span>Settings</span>
```

### **Status Indicators**
```tsx
{status === 'success' && <CheckCircle className={iconClass('sm', 'text-green-600')} />}
{status === 'error' && <XCircle className={iconClass('sm', 'text-red-600')} />}
```

## **Migration Checklist**
- [ ] Replace all emoji in UI components
- [ ] Update context compiler markdown headers
- [ ] Update test expectations
- [ ] Ensure consistent sizing with `iconClass()`
- [ ] Apply semantic colors appropriately 