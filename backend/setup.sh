#!/bin/bash

# YouTube Backend - Quick Setup Script
# This script automates the initial setup process

echo "🚀 YouTube Backend - Quick Setup"
echo "================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18 or higher."
    exit 1
fi

echo "✓ Node.js $(node -v) detected"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL 14 or higher."
    exit 1
fi

echo "✓ PostgreSQL detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✓ Dependencies installed"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✓ .env file created"
    echo "⚠️  Please edit .env file with your configuration before running the server"
    echo ""
else
    echo "✓ .env file already exists"
    echo ""
fi

# Ask if user wants to create database
read -p "Do you want to create the database now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter database name (default: youtube_db): " DB_NAME
    DB_NAME=${DB_NAME:-youtube_db}
    
    read -p "Enter PostgreSQL username (default: postgres): " DB_USER
    DB_USER=${DB_USER:-postgres}
    
    echo "Creating database..."
    psql -U $DB_USER -c "CREATE DATABASE $DB_NAME;" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✓ Database '$DB_NAME' created"
        
        # Run migrations
        echo "Running database migrations..."
        psql -U $DB_USER -d $DB_NAME -f src/database/schema.sql
        
        if [ $? -eq 0 ]; then
            echo "✓ Migrations completed successfully"
        else
            echo "❌ Migration failed"
            exit 1
        fi
    else
        echo "⚠️  Database might already exist or creation failed"
    fi
fi

echo ""
echo "================================="
echo "✅ Setup completed!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Visit http://localhost:5000 to see the API"
echo ""
echo "For more information, see README.md"
