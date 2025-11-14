# Search Quality Test Cases

## Test Queries (Real User Scenarios)

### High-Priority Queries (Should Find Results)
1. "preservation of sankaty head light" - Should find Community Preservation Committee meeting
2. "school budget 2025" - Should find relevant school committee meetings
3. "affordable housing" or "workforce housing" - Should find zoning/planning discussions
4. "Main Street reconstruction" - Should find public works updates
5. "tax rate" - Should find finance committee meetings

### Edge Cases
1. **Typos**: "sankatey head light" (fuzzy matching?)
2. **Acronyms**: "CPC" vs "Community Preservation Committee"
3. **Partial info**: "that lighthouse project" (vague queries)
4. **Date ranges**: "meetings in October 2025"
5. **Person names**: "what did [board member] say about X"

### Should Return "No Information" Gracefully
1. "What's the weather?" - Out of scope
2. "How do I appeal a decision?" - Legal advice (out of scope)
3. "Topic never discussed in any meeting" - Legitimately no data

## Success Criteria
- ✅ Top result similarity >= 0.72 OR 2+ results >= 0.68
- ✅ LLM provides answer (not "I don't have that information")
- ✅ Citations are relevant and accurate
- ✅ Response time < 5 seconds

## How to Test
```bash
# Manual testing in UI
1. Ask each query
2. Check Sources panel for relevance scores
3. Verify answer matches source content
4. Check response time in Network tab

# Automated testing (if built)
npm run test:search-quality
```
