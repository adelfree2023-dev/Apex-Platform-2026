# Apex Platform - Test Suite

This directory contains all test scripts for the Apex Platform.

## Quick Start

```bash
# Run all quick tests
bash tests/run-quick-tests.sh
```

## Test Categories

### 1. Load Testing (`tests/load/`)
```bash
# Install Artillery
npm install -g artillery

# Run load tests
artillery run tests/load/artillery-config.json
```

### 2. Security Tests (`tests/security/`)
```bash
bash tests/security/security-tests.sh
```

### 3. Failure Injection (`tests/failure/`)
```bash
bash tests/failure/failure-tests.sh
```

## Test Coverage

| Category | Tests | Status |
|----------|-------|--------|
| API Health | 4 | ✅ |
| Security | 2 | ✅ |
| Failure Handling | 2 | ✅ |
| Performance | 2 | ✅ |
| **Total** | **10** | ✅ |

## Running on Server

```bash
cd ~/Apex-Platform-2026
git pull
chmod +x tests/*.sh tests/**/*.sh
bash tests/run-quick-tests.sh
```
