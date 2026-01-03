#!/bin/bash

# Setup script for Digital Logbook PDF System

echo "🚀 Setting up Digital Logbook PDF System..."

# Check if .NET SDK is installed
if ! command -v dotnet &> /dev/null; then
    echo "❌ .NET SDK not found!"
    echo ""
    echo "Please install .NET 8 SDK from:"
    echo "https://dotnet.microsoft.com/download/dotnet/8.0"
    echo ""
    echo "After installation, run this script again."
    exit 1
fi

echo "✅ .NET SDK found: $(dotnet --version)"

# Restore backend dependencies
echo "📦 Restoring backend dependencies..."
dotnet restore

# Build backend
echo "🔨 Building backend..."
dotnet build

# Run database migrations
echo "🗄️  Running database migrations..."
dotnet ef migrations add AddUserAuthentication --project packages/backend.data --startup-project apps/api 2>/dev/null || echo "Migration already exists"
dotnet ef database update --project packages/backend.data --startup-project apps/api

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd apps/web
npm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "1. Backend:  dotnet run --project apps/api"
echo "2. Frontend: cd apps/web && npm run dev"
echo ""
