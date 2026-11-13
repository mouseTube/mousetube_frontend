#!/bin/bash

set -e

echo "📦 Installing dependencies..."

if [ "$(echo "$DEBUG" | tr '[:upper:]' '[:lower:]')" = "false" ]; then
    echo "⚙️ Production mode detected (DEBUG=false)"
    export NODE_ENV=production

    echo "🔧 Installing production dependencies only..."
    npm ci --omit=dev

    echo "🚀 Building Nuxt app for production..."
    npm run build

    echo "🌐 Starting Nuxt in production mode..."
    exec npm run start
else
    echo "🛠️ Development mode detected (DEBUG=$DEBUG)"
    export NODE_ENV=development
    echo "🔧 Installing all dependencies..."
    npm install

    echo "🔧 Starting Nuxt in development mode..."
    exec npm run dev -- --host 0.0.0.0
fi