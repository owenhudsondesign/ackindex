#!/bin/bash
# SEO and metadata check for AckIndex

echo "🔍 AckIndex SEO & Metadata Check"
echo "================================"
echo ""

BASE_URL="${BASE_URL:-https://www.ackindex.com}"

# Fetch the homepage
echo "📥 Fetching homepage..."
PAGE_CONTENT=$(curl -s "$BASE_URL")

echo ""

# Test 1: Title tag
echo "1️⃣  Checking title tag..."
TITLE=$(echo "$PAGE_CONTENT" | grep -o '<title>[^<]*</title>' | sed 's/<[^>]*>//g')
if [ -n "$TITLE" ]; then
  TITLE_LENGTH=${#TITLE}
  echo "   ✅ Title: $TITLE"
  echo "   Length: $TITLE_LENGTH characters"

  if [ $TITLE_LENGTH -lt 30 ]; then
    echo "   ⚠️  Title may be too short (optimal: 50-60 chars)"
  elif [ $TITLE_LENGTH -gt 60 ]; then
    echo "   ⚠️  Title may be too long (optimal: 50-60 chars)"
  else
    echo "   ✅ Title length is good"
  fi
else
  echo "   ❌ No title tag found"
fi

echo ""

# Test 2: Meta description
echo "2️⃣  Checking meta description..."
META_DESC=$(echo "$PAGE_CONTENT" | grep -o 'name="description" content="[^"]*"' | sed 's/.*content="\([^"]*\)".*/\1/')
if [ -n "$META_DESC" ]; then
  META_LENGTH=${#META_DESC}
  echo "   ✅ Description found"
  echo "   Length: $META_LENGTH characters"

  if [ $META_LENGTH -lt 120 ]; then
    echo "   ⚠️  Description may be too short (optimal: 150-160 chars)"
  elif [ $META_LENGTH -gt 160 ]; then
    echo "   ⚠️  Description may be too long (optimal: 150-160 chars)"
  else
    echo "   ✅ Description length is good"
  fi
else
  echo "   ⚠️  No meta description found"
fi

echo ""

# Test 3: Open Graph tags
echo "3️⃣  Checking Open Graph (social sharing) tags..."
OG_TITLE=$(echo "$PAGE_CONTENT" | grep -o 'property="og:title" content="[^"]*"' | sed 's/.*content="\([^"]*\)".*/\1/')
OG_DESC=$(echo "$PAGE_CONTENT" | grep -o 'property="og:description" content="[^"]*"' | sed 's/.*content="\([^"]*\)".*/\1/')
OG_IMAGE=$(echo "$PAGE_CONTENT" | grep -o 'property="og:image" content="[^"]*"' | sed 's/.*content="\([^"]*\)".*/\1/')

if [ -n "$OG_TITLE" ]; then
  echo "   ✅ og:title set"
else
  echo "   ⚠️  og:title missing"
fi

if [ -n "$OG_DESC" ]; then
  echo "   ✅ og:description set"
else
  echo "   ⚠️  og:description missing"
fi

if [ -n "$OG_IMAGE" ]; then
  echo "   ✅ og:image set"
else
  echo "   ⚠️  og:image missing (important for social sharing)"
fi

echo ""

# Test 4: Favicon
echo "4️⃣  Checking favicon..."
FAVICON_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/favicon.ico")
if [ "$FAVICON_STATUS" -eq 200 ]; then
  echo "   ✅ favicon.ico found"
else
  echo "   ⚠️  favicon.ico not found ($FAVICON_STATUS)"
fi

echo ""

# Test 5: robots.txt
echo "5️⃣  Checking robots.txt..."
ROBOTS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/robots.txt")
if [ "$ROBOTS_STATUS" -eq 200 ]; then
  echo "   ✅ robots.txt found"
  echo ""
  echo "   Content:"
  curl -s "$BASE_URL/robots.txt" | head -10 | sed 's/^/   /'
else
  echo "   ⚠️  robots.txt not found ($ROBOTS_STATUS)"
fi

echo ""

# Test 6: Sitemap
echo "6️⃣  Checking sitemap..."
SITEMAP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/sitemap.xml")
if [ "$SITEMAP_STATUS" -eq 200 ]; then
  echo "   ✅ sitemap.xml found"
else
  echo "   ℹ️  sitemap.xml not found (optional but recommended)"
fi

echo ""

# Test 7: Canonical URL
echo "7️⃣  Checking canonical URL..."
CANONICAL=$(echo "$PAGE_CONTENT" | grep -o 'rel="canonical" href="[^"]*"' | sed 's/.*href="\([^"]*\)".*/\1/')
if [ -n "$CANONICAL" ]; then
  echo "   ✅ Canonical URL set: $CANONICAL"
else
  echo "   ℹ️  No canonical URL (optional)"
fi

echo ""

# Test 8: Mobile viewport
echo "8️⃣  Checking mobile viewport meta tag..."
VIEWPORT=$(echo "$PAGE_CONTENT" | grep -o 'name="viewport"' || echo "")
if [ -n "$VIEWPORT" ]; then
  echo "   ✅ Viewport meta tag present (mobile-friendly)"
else
  echo "   ❌ Viewport meta tag missing (critical for mobile)"
fi

echo ""

# Test 9: Heading structure
echo "9️⃣  Checking heading structure..."
H1_COUNT=$(echo "$PAGE_CONTENT" | grep -o '<h1' | wc -l | tr -d ' ')
if [ "$H1_COUNT" -eq 1 ]; then
  echo "   ✅ Exactly one H1 tag (ideal)"
elif [ "$H1_COUNT" -eq 0 ]; then
  echo "   ⚠️  No H1 tag found"
else
  echo "   ⚠️  Multiple H1 tags ($H1_COUNT) - should have only one"
fi

echo ""

# Test 10: Language attribute
echo "🔟 Checking language attribute..."
LANG=$(echo "$PAGE_CONTENT" | grep -o '<html[^>]*lang="[^"]*"' | sed 's/.*lang="\([^"]*\)".*/\1/')
if [ -n "$LANG" ]; then
  echo "   ✅ Language set: $LANG"
else
  echo "   ⚠️  Language attribute missing"
fi

echo ""
echo "================================"
echo "SEO check complete!"
echo ""
echo "💡 SEO Tips:"
echo "   - Title: 50-60 characters"
echo "   - Description: 150-160 characters"
echo "   - Add Open Graph images for better social sharing"
echo "   - Create a sitemap.xml for better indexing"
