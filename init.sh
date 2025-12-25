#!/bin/bash

# InstaReader Development Server Startup Script
# This script ensures dependencies are installed and starts the Expo dev server

set -e

echo "🚀 Starting InstaReader development environment..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
else
  echo "✅ Dependencies already installed"
fi

# Check for .env file
if [ ! -f ".env" ]; then
  echo "⚠️  Warning: .env file not found. Copy .env.example to .env and add your API keys."
fi

# Start Expo dev server
echo "🎯 Starting Expo dev server..."
npx expo start











