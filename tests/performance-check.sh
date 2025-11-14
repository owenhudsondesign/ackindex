#!/bin/bash
# Performance check for AckIndex production
# Tests response times, bundle size, and key metrics

echo "⚡ AckIndex Performance Check"
echo "============================="
echo ""

BASE_URL="${BASE_URL:-https://www.ackindex.com}"

# Test 1: Homepage load time
echo "📄 Testing homepage load time..."
HOMEPAGE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL")
echo "   Homepage: ${HOMEPAGE_TIME}s"

if (( $(echo "$HOMEPAGE_TIME < 2.0" | bc -l) )); then
  echo "   ✅ Excellent (<2s)"
elif (( $(echo "$HOMEPAGE_TIME < 5.0" | bc -l) )); then
  echo "   ⚠️  Acceptable (2-5s)"
else
  echo "   ❌ Slow (>5s)"
fi

echo ""

# Test 2: API endpoint response time (should fail fast with 401)
echo "🔌 Testing API response time..."
API_TIME=$(curl -s -o /dev/null -w "%{time_total}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}' \
  "$BASE_URL/api/chat")
echo "   API Auth Check: ${API_TIME}s"

if (( $(echo "$API_TIME < 1.0" | bc -l) )); then
  echo "   ✅ Fast (<1s)"
elif (( $(echo "$API_TIME < 3.0" | bc -l) )); then
  echo "   ⚠️  Acceptable (1-3s)"
else
  echo "   ❌ Slow (>3s)"
fi

echo ""

# Test 3: Check for compression
echo "📦 Testing GZIP compression..."
CONTENT_ENCODING=$(curl -s -I "$BASE_URL" | grep -i "content-encoding" || echo "none")
if [[ $CONTENT_ENCODING == *"gzip"* ]] || [[ $CONTENT_ENCODING == *"br"* ]]; then
  echo "   ✅ Compression enabled: $CONTENT_ENCODING"
else
  echo "   ⚠️  Compression may not be enabled"
fi

echo ""

# Test 4: Check caching headers
echo "💾 Testing cache headers..."
CACHE_CONTROL=$(curl -s -I "$BASE_URL" | grep -i "cache-control" || echo "none")
echo "   Cache-Control: $CACHE_CONTROL"

if [[ $CACHE_CONTROL == *"max-age"* ]]; then
  echo "   ✅ Caching configured"
else
  echo "   ⚠️  No caching detected"
fi

echo ""

# Test 5: DNS lookup time
echo "🌐 Testing DNS resolution..."
DNS_TIME=$(curl -s -o /dev/null -w "%{time_namelookup}" "$BASE_URL")
echo "   DNS Lookup: ${DNS_TIME}s"

if (( $(echo "$DNS_TIME < 0.1" | bc -l) )); then
  echo "   ✅ Fast (<100ms)"
elif (( $(echo "$DNS_TIME < 0.5" | bc -l) )); then
  echo "   ✅ Good (<500ms)"
else
  echo "   ⚠️  Slow (>500ms)"
fi

echo ""

# Test 6: SSL/TLS handshake time
echo "🔒 Testing SSL/TLS handshake..."
TLS_TIME=$(curl -s -o /dev/null -w "%{time_appconnect}" "$BASE_URL")
echo "   TLS Handshake: ${TLS_TIME}s"

if (( $(echo "$TLS_TIME < 0.3" | bc -l) )); then
  echo "   ✅ Fast (<300ms)"
elif (( $(echo "$TLS_TIME < 1.0" | bc -l) )); then
  echo "   ✅ Good (<1s)"
else
  echo "   ⚠️  Slow (>1s)"
fi

echo ""

# Test 7: Time to first byte (TTFB)
echo "⏱️  Testing Time to First Byte (TTFB)..."
TTFB=$(curl -s -o /dev/null -w "%{time_starttransfer}" "$BASE_URL")
echo "   TTFB: ${TTFB}s"

if (( $(echo "$TTFB < 0.5" | bc -l) )); then
  echo "   ✅ Excellent (<500ms)"
elif (( $(echo "$TTFB < 1.0" | bc -l) )); then
  echo "   ✅ Good (<1s)"
else
  echo "   ⚠️  Could be improved (>1s)"
fi

echo ""
echo "============================="
echo "Performance check complete!"
echo ""
echo "💡 Tips:"
echo "   - TTFB <500ms is ideal"
echo "   - Total page load <2s is excellent"
echo "   - Enable compression and caching for best results"
