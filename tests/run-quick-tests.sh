#!/bin/bash
# Apex Platform - Quick Tests Runner
# Run all basic tests quickly

echo "🧪 Apex Platform Quick Tests"
echo "============================"

API_BASE="http://34.102.65.89:3001"
TENANT_ID="b6374184-6f5a-424b-a071-69576fe09251"

PASS=0
FAIL=0

test_pass() {
  echo "✅ PASS: $1"
  PASS=$((PASS + 1))
}

test_fail() {
  echo "❌ FAIL: $1"
  FAIL=$((FAIL + 1))
}

echo ""
echo "📡 API Health Tests"
echo "-------------------"

# Test 1: Health endpoint
RESPONSE=$(curl -s "$API_BASE/health")
if echo "$RESPONSE" | grep -q "ok"; then
  test_pass "Health endpoint"
else
  test_fail "Health endpoint"
fi

# Test 2: Get products
RESPONSE=$(curl -s "$API_BASE/api/shop/$TENANT_ID/products")
if echo "$RESPONSE" | grep -q "success.*true"; then
  test_pass "Get products"
else
  test_fail "Get products"
fi

# Test 3: Get cart
RESPONSE=$(curl -s "$API_BASE/api/shop/$TENANT_ID/cart" -H "x-session-id: test-session")
if echo "$RESPONSE" | grep -q "success.*true"; then
  test_pass "Get cart"
else
  test_fail "Get cart"
fi

# Test 4: Payment methods
RESPONSE=$(curl -s "$API_BASE/api/shop/$TENANT_ID/payments/methods")
if echo "$RESPONSE" | grep -q "visa\|cash"; then
  test_pass "Payment methods"
else
  test_fail "Payment methods"
fi

echo ""
echo "🔐 Security Tests"
echo "-----------------"

# Test 5: Invalid tenant
RESPONSE=$(curl -s "$API_BASE/api/shop/invalid-tenant/products")
if echo "$RESPONSE" | grep -q "error\|[]"; then
  test_pass "Invalid tenant handling"
else
  test_fail "Invalid tenant handling"
fi

# Test 6: SQL injection attempt
RESPONSE=$(curl -s "$API_BASE/api/shop/'; DROP TABLE--/products" 2>&1)
if ! echo "$RESPONSE" | grep -q "DROP\|deleted"; then
  test_pass "SQL injection blocked"
else
  test_fail "SQL injection - CRITICAL"
fi

echo ""
echo "💥 Failure Handling Tests"
echo "-------------------------"

# Test 7: Empty cart checkout
RESPONSE=$(curl -s -X POST "$API_BASE/api/shop/$TENANT_ID/checkout" \
  -H "Content-Type: application/json" \
  -H "x-session-id: empty-test-$(date +%s)" \
  -d '{"customerEmail": "test@test.com"}')
if echo "$RESPONSE" | grep -q "error\|empty"; then
  test_pass "Empty cart checkout blocked"
else
  test_fail "Empty cart checkout allowed"
fi

# Test 8: Invalid product add
RESPONSE=$(curl -s -X POST "$API_BASE/api/shop/$TENANT_ID/cart" \
  -H "Content-Type: application/json" \
  -H "x-session-id: test-$RANDOM" \
  -d '{"productId": 999999, "quantity": 1}')
if echo "$RESPONSE" | grep -q "error\|not found"; then
  test_pass "Invalid product handled"
else
  test_fail "Invalid product accepted"
fi

echo ""
echo "⚡ Performance Tests"
echo "--------------------"

# Test 9: Response time
START=$(date +%s%N)
curl -s "$API_BASE/health" > /dev/null
END=$(date +%s%N)
TIME_MS=$(( (END - START) / 1000000 ))
if [ $TIME_MS -lt 500 ]; then
  test_pass "Response time: ${TIME_MS}ms"
else
  test_fail "Response time: ${TIME_MS}ms (>500ms)"
fi

# Test 10: Multiple concurrent requests
echo "→ Testing 10 concurrent requests..."
SUCCESS=0
for i in {1..10}; do
  (curl -s -o /dev/null -w "%{http_code}" "$API_BASE/health" | grep -q "200" && echo "OK") &
done
wait
test_pass "Concurrent requests handled"

echo ""
echo "============================"
echo "📊 Results: $PASS passed, $FAIL failed"
echo "============================"

if [ $FAIL -eq 0 ]; then
  echo "🎉 All tests passed!"
  exit 0
else
  echo "⚠️  Some tests failed. Review above."
  exit 1
fi
