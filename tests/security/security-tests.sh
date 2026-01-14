#!/bin/bash
# Apex Platform - Security Tests
# Run these tests to verify tenant isolation and security

echo "🔐 Apex Platform Security Tests"
echo "================================"

API_BASE="http://34.102.65.89:3001"
TENANT_A="b6374184-6f5a-424b-a071-69576fe09251"
TENANT_B="test-tenant-b"

echo ""
echo "1️⃣  Testing Tenant Isolation..."
echo "--------------------------------"

# Test: Can Tenant A access Tenant B's products?
echo "→ Attempting cross-tenant access..."
RESPONSE=$(curl -s "$API_BASE/api/shop/$TENANT_B/products")
if echo "$RESPONSE" | grep -q "error\|not found"; then
  echo "✅ PASS: Cross-tenant access blocked"
else
  echo "❌ FAIL: Cross-tenant access may be possible"
fi

echo ""
echo "2️⃣  Testing SQL Injection..."
echo "-----------------------------"

# Test: SQL Injection in tenantId
echo "→ Testing SQL injection in tenantId..."
INJECTION="'; DROP TABLE tenants; --"
RESPONSE=$(curl -s "$API_BASE/api/shop/$INJECTION/products" 2>&1)
if echo "$RESPONSE" | grep -q "error\|Invalid\|Bad Request"; then
  echo "✅ PASS: SQL injection blocked"
else
  echo "⚠️  WARNING: Review SQL injection handling"
fi

echo ""
echo "3️⃣  Testing CORS Configuration..."
echo "----------------------------------"

# Test: CORS Headers
echo "→ Checking CORS headers..."
CORS=$(curl -s -I -X OPTIONS "$API_BASE/health" -H "Origin: https://malicious-site.com" 2>&1)
if echo "$CORS" | grep -q "Access-Control-Allow-Origin: \*"; then
  echo "⚠️  WARNING: CORS allows all origins"
else
  echo "✅ PASS: CORS properly restricted"
fi

echo ""
echo "4️⃣  Testing API Rate Limiting..."
echo "---------------------------------"

# Test: Rate limiting (send 100 requests quickly)
echo "→ Sending 100 rapid requests..."
COUNT=0
for i in {1..100}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/health")
  if [ "$STATUS" = "429" ]; then
    COUNT=$((COUNT + 1))
  fi
done

if [ $COUNT -gt 0 ]; then
  echo "✅ PASS: Rate limiting active ($COUNT requests limited)"
else
  echo "⚠️  WARNING: No rate limiting detected"
fi

echo ""
echo "5️⃣  Testing Health Endpoint..."
echo "-------------------------------"
HEALTH=$(curl -s "$API_BASE/health")
echo "Response: $HEALTH"
if echo "$HEALTH" | grep -q "ok"; then
  echo "✅ PASS: Health endpoint working"
else
  echo "❌ FAIL: Health endpoint not responding"
fi

echo ""
echo "================================"
echo "🔐 Security Tests Complete"
echo "================================"
