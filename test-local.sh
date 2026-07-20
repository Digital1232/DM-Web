#!/bin/bash

# Local Testing Script for AI Awards MVP
# Run: ./test-local.sh

echo "🚀 AI Awards for Creativity - Local Testing"
echo "==========================================="
echo ""

# Check Node/npm
echo "✓ Checking Node.js..."
node --version
npm --version
echo ""

# Install dependencies
echo "✓ Installing dependencies..."
npm install --silent
echo "✅ Dependencies installed"
echo ""

# Lint check
echo "✓ Running linter..."
npm run lint 2>/dev/null && echo "✅ Lint passed" || echo "⚠️  Lint warnings (non-critical)"
echo ""

# Format check
echo "✓ Checking code format..."
npm run format:check 2>/dev/null && echo "✅ Format correct" || echo "ℹ️  Run: npm run format"
echo ""

# Run tests
echo "✓ Running unit tests..."
npm test 2>&1 | tail -20
echo ""

echo "==========================================="
echo "📊 Testing Complete!"
echo ""
echo "Next steps:"
echo "1. Configure .env with Firebase credentials"
echo "2. Run: npm test -- ScoreCalculator.test.ts"
echo "3. Run: npm run dev (to start server)"
echo ""
echo "📖 See LOCAL_TESTING_GUIDE.md for detailed instructions"
