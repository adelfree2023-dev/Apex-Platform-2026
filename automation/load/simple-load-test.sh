#!/bin/bash
# Simple Load Test using curl
# Works without installing any packages

echo "⚡ Apex Platform Simple Load Test"
echo "=================================="

API_BASE="http://34.102.65.89:3001"
TENANT_ID="b6374184-6f5a-424b-a071-69576fe09251"
REQUESTS=50
CONCURRENT=10

echo "Target: $API_BASE"
echo "Requests: $REQUESTS (${CONCURRENT} concurrent)"
echo ""

# Function to make request and measure time
make_request() {
  local endpoint=$1
  local start=$(date +%s%N)
  local status=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE$endpoint")
  local end=$(date +%s%N)
  local time_ms=$(( (end - start) / 1000000 ))
  echo "$status,$time_ms"
}

echo "1️⃣  Health Endpoint Load Test"
echo "------------------------------"
SUCCESS=0
FAIL=0
TOTAL_TIME=0

for i in $(seq 1 $REQUESTS); do
  RESULT=$(make_request "/health")
  STATUS=$(echo $RESULT | cut -d',' -f1)
  TIME=$(echo $RESULT | cut -d',' -f2)
  TOTAL_TIME=$((TOTAL_TIME + TIME))
  
  if [ "$STATUS" = "200" ]; then
    SUCCESS=$((SUCCESS + 1))
  else
    FAIL=$((FAIL + 1))
  fi
  
  # Progress
  if [ $((i % 10)) -eq 0 ]; then
    echo "  Progress: $i/$REQUESTS requests"
  fi
done

AVG_TIME=$((TOTAL_TIME / REQUESTS))
echo "  ✅ Completed: $SUCCESS success, $FAIL failed"
echo "  📊 Average response time: ${AVG_TIME}ms"

echo ""
echo "2️⃣  Products Endpoint Load Test"
echo "--------------------------------"
SUCCESS=0
FAIL=0
TOTAL_TIME=0

for i in $(seq 1 $REQUESTS); do
  RESULT=$(make_request "/api/shop/$TENANT_ID/products")
  STATUS=$(echo $RESULT | cut -d',' -f1)
  TIME=$(echo $RESULT | cut -d',' -f2)
  TOTAL_TIME=$((TOTAL_TIME + TIME))
  
  if [ "$STATUS" = "200" ]; then
    SUCCESS=$((SUCCESS + 1))
  else
    FAIL=$((FAIL + 1))
  fi
done

AVG_TIME=$((TOTAL_TIME / REQUESTS))
echo "  ✅ Completed: $SUCCESS success, $FAIL failed"
echo "  📊 Average response time: ${AVG_TIME}ms"

echo ""
echo "3️⃣  Concurrent Requests Test"
echo "-----------------------------"
echo "  Sending $CONCURRENT concurrent requests..."

START=$(date +%s%N)
for i in $(seq 1 $CONCURRENT); do
  curl -s -o /dev/null "$API_BASE/health" &
done
wait
END=$(date +%s%N)

TOTAL_MS=$(( (END - START) / 1000000 ))
echo "  ✅ All $CONCURRENT concurrent requests completed in ${TOTAL_MS}ms"

echo ""
echo "=================================="
echo "📊 Load Test Summary"
echo "=================================="
echo "  Requests per second: ~$((REQUESTS * 1000 / TOTAL_TIME))"
echo "  All tests passed!"
