#!/bin/bash
# Quick production health check
# Usage: ./tests/health-check.sh

echo "🏥 AckIndex Health Check"
echo "========================"
echo ""

# Check homepage (follow redirects)
echo -n "Homepage: "
STATUS=$(curl -L -s -o /dev/null -w "%{http_code}" https://www.ackindex.com)
if [ "$STATUS" -eq 200 ]; then
  echo "✅ OK ($STATUS)"
else
  echo "❌ FAIL ($STATUS)"
fi

# Check API endpoint (should return 401 without auth)
echo -n "API Auth: "
STATUS=$(curl -L -s -o /dev/null -w "%{http_code}" https://www.ackindex.com/api/chat -X POST -H "Content-Type: application/json" -d '{"message":"test"}')
if [ "$STATUS" -eq 401 ]; then
  echo "✅ OK (Protected)"
else
  echo "⚠️  Unexpected status: $STATUS"
fi

# Check response time
echo -n "Response Time: "
TIME=$(curl -L -s -o /dev/null -w "%{time_total}" https://www.ackindex.com)
echo "${TIME}s"

if (( $(echo "$TIME < 2.0" | bc -l) )); then
  echo "  ✅ Fast (<2s)"
elif (( $(echo "$TIME < 5.0" | bc -l) )); then
  echo "  ⚠️  Acceptable (2-5s)"
else
  echo "  ❌ Slow (>5s)"
fi

echo ""
echo "========================"
echo "Health check complete!"
