#!/bin/bash

# Nemsalon Test Runner - Kører ALLE tests
# Brug: ./scripts/test-all.sh [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
TOTAL=0

# Function to print section headers
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    ((PASSED++))
}

# Function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
    ((FAILED++))
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Function to run a test and track results
run_test() {
    local name=$1
    local command=$2
    
    ((TOTAL++))
    echo ""
    echo -e "${YELLOW}Running: $name${NC}"
    
    if eval $command; then
        print_success "$name"
        return 0
    else
        print_error "$name"
        return 1
    fi
}

# Check if servers are running
check_servers() {
    echo "Checking if servers are running..."
    
    API_RUNNING=false
    WEB_RUNNING=false
    
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        API_RUNNING=true
        echo -e "${GREEN}✓ API server running on localhost:3000${NC}"
    else
        echo -e "${YELLOW}⚠ API server not running on localhost:3000${NC}"
    fi
    
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        WEB_RUNNING=true
        echo -e "${GREEN}✓ Web server running on localhost:5173${NC}"
    else
        echo -e "${YELLOW}⚠ Web server not running on localhost:5173${NC}"
    fi
    
    if [ "$API_RUNNING" = false ] || [ "$WEB_RUNNING" = false ]; then
        echo ""
        echo -e "${YELLOW}⚠ Warning: Not all servers are running!${NC}"
        echo -e "${YELLOW}  Some tests may fail.${NC}"
        echo ""
        echo "To start servers:"
        echo "  Terminal 1: pnpm dev:api"
        echo "  Terminal 2: pnpm dev:web"
        echo ""
        
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Parse arguments
SKIP_E2E=false
SKIP_UNIT=false
SKIP_LINT=false
SKIP_TYPECHECK=false
CI_MODE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-e2e)
            SKIP_E2E=true
            shift
            ;;
        --skip-unit)
            SKIP_UNIT=true
            shift
            ;;
        --skip-lint)
            SKIP_LINT=true
            shift
            ;;
        --skip-typecheck)
            SKIP_TYPECHECK=true
            shift
            ;;
        --ci)
            CI_MODE=true
            shift
            ;;
        --quick)
            SKIP_E2E=true
            SKIP_LINT=true
            shift
            ;;
        --help)
            echo "Nemsalon Test Runner"
            echo ""
            echo "Usage: ./scripts/test-all.sh [options]"
            echo ""
            echo "Options:"
            echo "  --skip-e2e        Skip Playwright E2E tests"
            echo "  --skip-unit       Skip unit tests (Vitest)"
            echo "  --skip-lint       Skip linting"
            echo "  --skip-typecheck  Skip TypeScript type checking"
            echo "  --ci              CI mode (no interactive prompts)"
            echo "  --quick           Quick mode (skip E2E and lint)"
            echo "  --help            Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./scripts/test-all.sh              # Run all tests"
            echo "  ./scripts/test-all.sh --quick      # Run unit tests only"
            echo "  ./scripts/test-all.sh --skip-e2e   # Skip E2E tests"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Print welcome message
clear
print_header "🧪 NEMSALON TEST RUNNER"
echo "Running all tests..."
echo ""

# Check servers
check_servers

# 1. TypeScript Type Checking
if [ "$SKIP_TYPECHECK" = false ]; then
    print_header "🔍 STEP 1: TypeScript Type Checking"
    if run_test "Type Checking" "pnpm run typecheck"; then
        : # Success
    else
        print_error "Type checking failed! Fix type errors before running tests."
        exit 1
    fi
else
    print_warning "Skipping TypeScript type checking"
fi

# 2. Linting
if [ "$SKIP_LINT" = false ]; then
    print_header "🧹 STEP 2: Linting"
    run_test "ESLint" "pnpm run lint"
else
    print_warning "Skipping linting"
fi

# 3. Unit Tests (Vitest)
if [ "$SKIP_UNIT" = false ]; then
    print_header "⚙️  STEP 3: Unit Tests (Vitest)"
    
    # API Unit Tests
    if run_test "API Unit Tests" "pnpm run test:unit"; then
        : # Success
    fi
    
    # API Contract Tests
    if run_test "API Contract Tests" "pnpm run test:unit:contract"; then
        : # Success
    fi
else
    print_warning "Skipping unit tests"
fi

# 4. E2E Tests (Playwright)
if [ "$SKIP_E2E" = false ]; then
    print_header "🎭 STEP 4: E2E Tests (Playwright)"
    
    # Smoke Tests (quick)
    print_header "4a. Smoke Tests (UI Contract)"
    if run_test "UI Smoke Tests" "pnpm run test:e2e:smoke"; then
        : # Success
    fi
    
    # Mock Tests
    print_header "4b. Mock Tests"
    if run_test "Mock Error Tests" "pnpm run test:e2e:mock"; then
        : # Success
    fi
    
    # Full Integration Tests
    print_header "4c. Integration Tests"
    if run_test "Full Integration Tests" "pnpm run test:e2e:full"; then
        : # Success
    fi
else
    print_warning "Skipping E2E tests"
fi

# Print final summary
print_header "📊 TEST SUMMARY"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${BLUE}Total:  $TOTAL${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    echo ""
    echo "Your code is ready to commit/push!"
    exit 0
else
    echo -e "${RED}❌ Some tests failed!${NC}"
    echo ""
    echo "Please fix the failing tests before committing."
    echo ""
    echo "To run specific test suites:"
    echo "  pnpm run test:unit          # Unit tests only"
    echo "  pnpm run test:e2e:smoke     # Smoke tests only"
    echo "  pnpm run test:e2e:mock      # Mock tests only"
    echo "  pnpm run test:e2e           # All E2E tests"
    exit 1
fi
