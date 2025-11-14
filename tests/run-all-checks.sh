#!/bin/bash
# Master test runner for AckIndex
# Runs all automated checks in sequence

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║   AckIndex Production Test Suite              ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

BASE_URL="${BASE_URL:-https://www.ackindex.com}"
echo "🌐 Testing: $BASE_URL"
echo ""

# Track results
TOTAL_CHECKS=4
PASSED_CHECKS=0

# Run health check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./tests/health-check.sh
if [ $? -eq 0 ]; then ((PASSED_CHECKS++)); fi
echo ""

# Run performance check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./tests/performance-check.sh
if [ $? -eq 0 ]; then ((PASSED_CHECKS++)); fi
echo ""

# Run security check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./tests/security-check.sh
if [ $? -eq 0 ]; then ((PASSED_CHECKS++)); fi
echo ""

# Run SEO check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./tests/seo-check.sh
if [ $? -eq 0 ]; then ((PASSED_CHECKS++)); fi
echo ""

# Summary
echo "╔════════════════════════════════════════════════╗"
echo "║   Test Suite Summary                           ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "✅ Health Check: Complete"
echo "⚡ Performance: Complete"
echo "🔒 Security: Complete"
echo "🔍 SEO: Complete"
echo ""

# Optional: Run smoke tests if auth token provided
if [ -n "$TEST_AUTH_TOKEN" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🧪 Running authenticated smoke tests..."
  echo ""
  node tests/quick-smoke-test.js
  echo ""
else
  echo "ℹ️  Skipping authenticated tests (set TEST_AUTH_TOKEN to run)"
  echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 All automated checks complete!"
echo ""
echo "Next steps:"
echo "   1. Review warnings above (⚠️ marks)"
echo "   2. Test manually on mobile device"
echo "   3. Run authenticated tests: TEST_AUTH_TOKEN='your-token' ./tests/run-all-checks.sh"
echo "   4. Check ./tests/*.md for manual test procedures"
echo ""
