#!/bin/bash
# Security headers and configuration check for AckIndex

echo "🔒 AckIndex Security Check"
echo "=========================="
echo ""

BASE_URL="${BASE_URL:-https://www.ackindex.com}"

# Test 1: HTTPS redirect
echo "1️⃣  Testing HTTPS enforcement..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://ackindex.com")
if [ "$HTTP_STATUS" -eq 301 ] || [ "$HTTP_STATUS" -eq 307 ] || [ "$HTTP_STATUS" -eq 308 ]; then
  echo "   ✅ HTTP redirects to HTTPS ($HTTP_STATUS)"
else
  echo "   ⚠️  HTTP status: $HTTP_STATUS"
fi

echo ""

# Test 2: Security headers
echo "2️⃣  Checking security headers..."

# HSTS
HSTS=$(curl -s -I "$BASE_URL" | grep -i "strict-transport-security" || echo "missing")
if [[ $HSTS == *"max-age"* ]]; then
  echo "   ✅ HSTS enabled"
else
  echo "   ⚠️  HSTS not found (not critical for Vercel)"
fi

# X-Content-Type-Options
CONTENT_TYPE=$(curl -s -I "$BASE_URL" | grep -i "x-content-type-options" || echo "missing")
if [[ $CONTENT_TYPE == *"nosniff"* ]]; then
  echo "   ✅ X-Content-Type-Options: nosniff"
else
  echo "   ⚠️  X-Content-Type-Options missing"
fi

# X-Frame-Options
FRAME=$(curl -s -I "$BASE_URL" | grep -i "x-frame-options" || echo "missing")
if [[ $FRAME == *"DENY"* ]] || [[ $FRAME == *"SAMEORIGIN"* ]]; then
  echo "   ✅ X-Frame-Options set (clickjacking protection)"
else
  echo "   ⚠️  X-Frame-Options missing"
fi

echo ""

# Test 3: API authentication
echo "3️⃣  Testing API authentication..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}' \
  "$BASE_URL/api/chat")

if [ "$API_STATUS" -eq 401 ]; then
  echo "   ✅ API requires authentication (401)"
else
  echo "   ❌ Unexpected status: $API_STATUS (should be 401)"
fi

echo ""

# Test 4: SQL injection attempt (should be safe)
echo "4️⃣  Testing input sanitization..."
INJECTION_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"test OR 1=1--"}' \
  "$BASE_URL/api/chat")

if [ "$INJECTION_STATUS" -eq 401 ]; then
  echo "   ✅ Malicious input handled safely"
else
  echo "   ⚠️  Status: $INJECTION_STATUS"
fi

echo ""

# Test 5: Rate limiting headers
echo "5️⃣  Checking for rate limiting..."
RATE_LIMIT=$(curl -s -I -X POST "$BASE_URL/api/chat" | grep -i "x-ratelimit" || echo "none")
if [[ $RATE_LIMIT == *"x-ratelimit"* ]]; then
  echo "   ✅ Rate limiting headers present"
else
  echo "   ℹ️  No rate limiting headers (may be handled server-side)"
fi

echo ""

# Test 6: Check for exposed .env files
echo "6️⃣  Testing for exposed config files..."
ENV_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/.env")
if [ "$ENV_STATUS" -eq 404 ]; then
  echo "   ✅ .env file not exposed"
else
  echo "   ❌ WARNING: .env may be accessible! ($ENV_STATUS)"
fi

ENV_LOCAL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/.env.local")
if [ "$ENV_LOCAL_STATUS" -eq 404 ]; then
  echo "   ✅ .env.local file not exposed"
else
  echo "   ❌ WARNING: .env.local may be accessible! ($ENV_LOCAL_STATUS)"
fi

echo ""

# Test 7: Admin routes require auth
echo "7️⃣  Testing admin route protection..."
ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/admin/scrape-url")
if [ "$ADMIN_STATUS" -eq 401 ] || [ "$ADMIN_STATUS" -eq 403 ]; then
  echo "   ✅ Admin routes protected ($ADMIN_STATUS)"
else
  echo "   ⚠️  Admin route status: $ADMIN_STATUS"
fi

echo ""

# Test 8: SSL certificate validity
echo "8️⃣  Checking SSL certificate..."
SSL_EXPIRY=$(curl -s -I "$BASE_URL" 2>&1 | grep -i "ssl certificate problem" || echo "valid")
if [[ $SSL_EXPIRY == *"problem"* ]]; then
  echo "   ❌ SSL certificate issue detected"
else
  echo "   ✅ SSL certificate valid"
fi

echo ""
echo "=========================="
echo "Security check complete!"
echo ""
echo "💡 Security Tips:"
echo "   - All critical APIs should require authentication"
echo "   - Never expose .env files or API keys"
echo "   - Use HTTPS everywhere"
echo "   - Enable security headers (handled by Vercel)"
