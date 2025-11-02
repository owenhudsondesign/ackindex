# CLAUDE_FRONTEND.md - UI/UX Development

## Current UI Status
- **Chat interface**: Exists but needs polish (see NEXT_STEPS.md §2.A)
- **Admin dashboard**: Basic functionality, needs enhancement (§2.B)
- **User account page**: Partially built (§2.C)

## Component Architecture
```
/src/components
├── ChatMessage.tsx       # Individual message display
├── ChatInput.tsx         # User input field
├── DocumentList.tsx      # Admin doc management (NEW)
├── AnalyticsDashboard.tsx # Admin metrics (NEW)
├── UsageChart.tsx        # User account graphs (NEW)
└── BillingPanel.tsx      # Stripe integration (NEW)
```

## UI/UX Priorities

### Phase 1: Chat Interface Polish
**Priority**: High | **Timeline**: 2-3 days

**Must-have features**:
- Typing indicators while AI responds
- Message timestamps
- Citation display (links to sources)
- "Regenerate response" button
- Message history pagination
- Mobile responsive design

**Example implementation**:
```tsx
// ChatMessage.tsx
export function ChatMessage({ role, content, citations, timestamp }) {
  return (
    <div className={role === 'user' ? 'text-right' : 'text-left'}>
      <div className="inline-block max-w-2xl p-4 rounded-lg">
        <p>{content}</p>
        {citations && <CitationList sources={citations} />}
        <span className="text-xs text-gray-400">{timestamp}</span>
      </div>
    </div>
  );
}
```

### Phase 2: Admin Dashboard
**Priority**: High | **Timeline**: 3-4 days

**Features needed**:
- Analytics widgets (total docs, chunks, users)
- Recent activity feed
- Bulk actions (delete, re-scrape)
- Search/filter documents
- Export functionality

**Layout structure**:
```tsx
<AdminLayout>
  <AnalyticsDashboard /> {/* Top cards: stats */}
  <DocumentList />       {/* Table with actions */}
  <ActivityFeed />       {/* Recent scrapes/embeddings */}
</AdminLayout>
```

### Phase 3: User Account Page
**Priority**: Medium | **Timeline**: 2 days

**Features**:
- Subscription details display
- Usage graphs (daily/weekly/monthly)
- Plan upgrade flow (Stripe integration)
- Payment method management
- Invoice download history

## Design System

### Colors (TailwindCSS)
- **Primary**: `blue-600` (buttons, links)
- **Success**: `green-500` (completed status)
- **Warning**: `yellow-500` (pending status)
- **Error**: `red-500` (failed status)
- **Neutral**: `gray-100` to `gray-900` (backgrounds, text)

### Typography
- **Headings**: `font-bold text-2xl md:text-3xl`
- **Body**: `text-base text-gray-700`
- **Labels**: `text-sm font-medium text-gray-600`
- **Code**: `font-mono bg-gray-100 px-2 py-1 rounded`

### Spacing
- **Sections**: `mb-8 md:mb-12`
- **Cards**: `p-6 rounded-lg shadow-md`
- **Grid gaps**: `gap-4 md:gap-6`

## Component Patterns

### Loading States
```tsx
{isLoading ? (
  <div className="flex items-center justify-center">
    <Spinner /> <span className="ml-2">Generating response...</span>
  </div>
) : (
  <MessageList messages={messages} />
)}
```

### Error Handling
```tsx
{error && (
  <Alert variant="error">
    <p>{error.message}</p>
    <button onClick={retry}>Try Again</button>
  </Alert>
)}
```

### Empty States
```tsx
{documents.length === 0 ? (
  <EmptyState
    icon={DocumentIcon}
    title="No documents yet"
    description="Upload a PDF or scrape a URL to get started"
    action={<Button>Add Document</Button>}
  />
) : (
  <DocumentGrid documents={documents} />
)}
```

## Mobile Responsiveness
- **Breakpoints**: Use Tailwind's `sm:`, `md:`, `lg:` prefixes
- **Touch targets**: Minimum 44px height for buttons
- **Horizontal scrolling**: Avoid; use stacked layouts on mobile
- **Navigation**: Hamburger menu for small screens

## Accessibility
- **Semantic HTML**: Use `<nav>`, `<main>`, `<article>` tags
- **ARIA labels**: Add to icon-only buttons
- **Keyboard navigation**: Support Tab, Enter, Escape keys
- **Color contrast**: WCAG AA minimum (4.5:1)

## Performance
- **Lazy load**: Images and heavy components (React.lazy)
- **Code splitting**: Dynamic imports for admin routes
- **Optimize images**: Use next/image with width/height
- **Minimize re-renders**: useMemo, useCallback for expensive computations

## Testing Checklist
- [ ] Works on Chrome, Firefox, Safari
- [ ] Mobile responsive (iPhone, Android)
- [ ] Loading states display correctly
- [ ] Error messages are user-friendly
- [ ] Forms validate inputs
- [ ] Citations link to correct sources

## Related Files
- **src/app/page.tsx**: Main chat UI
- **src/app/admin/page.tsx**: Admin dashboard
- **src/app/account/page.tsx**: User account page
