# User Experience Test Cases

## First-Time User Flow
1. **Landing Page**
   - ✅ Value proposition clear ("Search Every Nantucket Town Meeting Instantly")
   - ✅ Example questions visible
   - ✅ Sign up prompt clear and non-intrusive
   - ✅ Dark mode toggle works

2. **Onboarding**
   - ✅ User signs up → immediately can ask questions
   - ✅ No complex setup required
   - ✅ Token limit clearly communicated

3. **First Query**
   - ✅ Response appears with loading animation
   - ✅ Citations visible and clickable
   - ✅ "View source" links work
   - ✅ Sidebar auto-opens showing "New Chat" button

## Chat Experience
1. **Question Input**
   - ✅ Textarea expands with content
   - ✅ Enter to submit, Shift+Enter for newline
   - ✅ Placeholder text helpful
   - ✅ Character limit shown (if applicable)

2. **Response Display**
   - ✅ Markdown renders correctly (bold, lists, links)
   - ✅ Code blocks formatted (if any)
   - ✅ Citations numbered correctly [Source 1], [Source 2]
   - ✅ Similarity scores displayed (82%, 84%, etc.)

3. **Sources Panel**
   - ✅ Shows 3 most relevant sources
   - ✅ Snippet preview is meaningful (not cut-off mid-sentence)
   - ✅ "View source" opens correct URL
   - ✅ Document title and date visible

## Conversation Management (Premium)
1. **New Conversation**
   - ✅ "New Chat" button creates blank slate
   - ✅ Auto-generates title after first exchange
   - ✅ Conversation appears in sidebar

2. **Load Conversation**
   - ✅ Clicking conversation loads messages
   - ✅ Scroll position correct (bottom of chat)
   - ✅ Continue conversation works seamlessly

3. **Delete Conversation**
   - ✅ Confirmation dialog appears
   - ✅ Deletes from list after confirmation
   - ✅ If current conversation deleted → switches to new chat

## Mobile Experience
1. **Responsive Design**
   - ✅ Works on iPhone (Safari)
   - ✅ Works on Android (Chrome)
   - ✅ Sidebar toggles correctly on mobile
   - ✅ Input doesn't zoom on focus (font-size >= 16px)
   - ✅ Touch targets large enough (44px minimum)

2. **Mobile-Specific**
   - ✅ Hamburger menu works
   - ✅ Citations collapse/expand on tap
   - ✅ No horizontal scroll
   - ✅ Chat input stays visible (doesn't hide behind keyboard)

## Error Handling
1. **Network Errors**
   - ✅ "Failed to fetch" → user-friendly message
   - ✅ Retry mechanism or suggestion

2. **No Results**
   - ✅ "I don't have that information" message clear
   - ✅ Suggests alternative searches
   - ✅ Doesn't look like a system error

3. **Token Limit Reached**
   - ✅ Clear message: "You've used X of Y tokens"
   - ✅ Upgrade link prominent
   - ✅ Shows token reset date

## Accessibility
1. **Keyboard Navigation**
   - ✅ Tab order logical
   - ✅ Can submit form with Enter
   - ✅ Skip to main content link (optional but nice)

2. **Screen Readers**
   - ✅ Images have alt text
   - ✅ Loading states announced
   - ✅ Error messages announced
   - ✅ ARIA labels on interactive elements

3. **Color Contrast**
   - ✅ Text meets WCAG AA standards (4.5:1 ratio)
   - ✅ Links distinguishable from text
   - ✅ Dark mode also meets contrast standards

## Browser Compatibility
Test in:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest, especially iOS)
- ✅ Edge (latest)

## Testing Tools
```bash
# Lighthouse audit
npm run build && npm start
# Then run Lighthouse in Chrome DevTools

# Accessibility testing
npx @axe-core/cli http://localhost:3000

# Mobile testing
# Use Chrome DevTools device emulation
# Or BrowserStack for real devices
```
