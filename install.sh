#!/bin/bash

# TimeTask Installation Script
# This script helps with initial setup and installation

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Header
echo "======================================"
echo "   TimeTask Installation Script"
echo "======================================"
echo ""

# Check Node.js version
print_status "Checking Node.js installation..."
if command_exists node; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        print_status "Node.js version $(node -v) detected ✓"
    else
        print_error "Node.js version 18 or higher is required. Current version: $(node -v)"
        exit 1
    fi
else
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check npm
print_status "Checking npm installation..."
if command_exists npm; then
    print_status "npm version $(npm -v) detected ✓"
else
    print_error "npm is not installed."
    exit 1
fi

# Check PostgreSQL (optional check)
print_status "Checking PostgreSQL..."
if command_exists psql; then
    print_status "PostgreSQL detected ✓"
else
    print_warning "PostgreSQL not found. Make sure you have PostgreSQL installed and running."
    echo "    You can install PostgreSQL from: https://www.postgresql.org/download/"
fi

# Clean previous installations (optional)
if [ -d "node_modules" ] || [ -d "server/node_modules" ] || [ -d "client/node_modules" ]; then
    read -p "Found existing node_modules. Clean install? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Cleaning previous installation..."
        rm -rf node_modules server/node_modules client/node_modules
        rm -rf server/dist client/dist
    fi
fi

# Install dependencies
print_status "Installing root dependencies..."
npm install

print_status "Installing server dependencies..."
cd server
npm install
cd ..

print_status "Installing client dependencies..."
cd client
npm install
cd ..

# Setup environment files
print_status "Setting up environment files..."
if [ ! -f server/.env ]; then
    cp server/.env.example server/.env
    print_warning "Created server/.env - Please configure database and JWT settings"
fi

if [ ! -f client/.env ]; then
    cp client/.env.example client/.env
    print_status "Created client/.env with default settings"
fi

# Create necessary directories
print_status "Creating required directories..."
mkdir -p server/uploads
mkdir -p server/logs
mkdir -p backups

# Database setup prompt
echo ""
echo "======================================"
echo "   Database Setup"
echo "======================================"
read -p "Do you want to set up the database now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Setting up database..."
    
    # Check if database URL is configured
    if grep -q "DATABASE_URL=\"postgresql://username:password@localhost:5432/timetask" server/.env; then
        print_error "Please configure DATABASE_URL in server/.env first!"
        echo "    Edit server/.env and update the DATABASE_URL with your PostgreSQL credentials"
        exit 1
    fi
    
    cd server
    
    # Generate Prisma client
    print_status "Generating Prisma client..."
    npx prisma generate
    
    # Run migrations
    print_status "Running database migrations..."
    npx prisma migrate dev --name init
    
    # Seed database
    read -p "Do you want to seed the database with sample data? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Seeding database..."
        npm run db:seed
    fi
    
    cd ..
fi

# Final instructions
echo ""
echo "======================================"
echo "   Installation Complete!"
echo "======================================"
echo ""
print_status "Installation successful!"
echo ""
echo "Next steps:"
echo "1. Configure your database in server/.env"
echo "2. Update JWT secrets in server/.env"
echo "3. Run: npm run dev"
echo ""
echo "Default accounts:"
echo "  Admin:    admin@timetask.com / admin123"
echo "  Employee: employee@timetask.com / employee123"
echo "  Client:   client@timetask.com / client123"
echo ""
print_warning "Remember to change default passwords in production!"
echo ""
echo "To start the application, run:"
echo "  npm run dev"
echo ""