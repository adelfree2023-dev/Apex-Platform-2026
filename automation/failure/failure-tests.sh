#!/bin/bash
# Apex Platform - Failure Injection Tests
# Test how the system handles failures

echo "💥 Apex Platform Failure Injection Tests"
echo "========================================="

API_BASE="http://34.102.65.89:3001"
TENANT_ID="b6374184-6f5a-424b-a071-69576fe09251"

echo ""
echo "1️⃣  Testing Invalid Tenant Handling..."
echo "---------------------------------------"

# Test: Non-existent tenant
echo "→ Accessing non-existent tenant..."
RESPONSE=$(curl -s "$API_BASE/api/shop/non-existent-tenant/products")
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q "error\|not found\|[]"; then
  echo "✅ PASS: Invalid tenant handled gracefully"
else
  echo "⚠️  WARNING: Review invalid tenant handling"
fi

echo ""
echo "2️⃣  Testing Invalid Product ID..."
echo "----------------------------------"

echo "→ Adding non-existent product to cart..."
RESPONSE=$(curl -s -X POST "$API_BASE/api/shop/$TENANT_ID/cart" \
  -H "Content-Type: application/json" \
  -H "x-session-id: test-failure" \
  -d '{"productId": 999999, "quantity": 1}')
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q "error\|not found\|Product not found"; then
  echo "✅ PASS: Invalid product handled gracefully"
else
  echo "⚠️  WARNING: Review invalid product handling"
fi

echo ""
echo "3️⃣  Testing Empty Cart Checkout..."
echo "-----------------------------------"

echo "→ Attempting checkout with empty cart..."
RESPONSE=$(curl -s -X POST "$API_BASE/api/shop/$TENANT_ID/checkout" \
  -H "Content-Type: application/json" \
  -H "x-session-id: empty-cart-test" \
  -d '{"customerEmail": "test@example.com"}')
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q "error\|empty\|Cart is empty"; then
  echo "✅ PASS: Empty cart checkout blocked"
else
  echo "⚠️  WARNING: Review empty cart handling"
fi

echo ""
echo "4️⃣  Testing Invalid Payment Method..."
echo "--------------------------------------"

echo "→ Processing payment with invalid method..."
RESPONSE=$(curl -s -X POST "$API_BASE/api/shop/$TENANT_ID/payments/process" \
  -H "Content-Type: application/json" \
  -d '{"orderId": 1, "method": "invalid_method"}')
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q "error\|Unsupported\|invalid"; then
  echo "✅ PASS: Invalid payment method handled"
else
  echo "⚠️  WARNING: Review payment method validation"
fi

echo ""
echo "5️⃣  Testing Malformed JSON..."
echo "------------------------------"

echo "→ Sending malformed JSON..."
RESPONSE=$(curl -s -X POST "$API_BASE/api/shop/$TENANT_ID/cart" \
  -H "Content-Type: application/json" \
  -d '{invalid json}' 2>&1)
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q "error\|Bad Request\|parse"; then
  echo "✅ PASS: Malformed JSON rejected"
else
  echo "⚠️  WARNING: Review JSON parsing"
fi

echo ""
echo "========================================="
echo "💥 Failure Tests Complete"
echo "========================================="
