#!/bin/bash

# Digital Ocean Deployment Helper Script
# This script helps you prepare and deploy your application

set -e  # Exit on error

echo "🚀 HopeGestion Deployment Helper"
echo "================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo "ℹ️  $1"
}

# Check if required tools are installed
check_requirements() {
    print_info "Checking requirements..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        print_error "git is not installed"
        exit 1
    fi
    
    print_success "All requirements met"
}

# Generate JWT secret
generate_jwt_secret() {
    print_info "Generating JWT secret..."
    node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
}

# Build backend
build_backend() {
    print_info "Building backend..."
    cd backend
    npm install
    npm run build
    cd ..
    print_success "Backend built successfully"
}

# Build frontend
build_frontend() {
    print_info "Building frontend..."
    cd frontend
    npm install
    npm run build
    cd ..
    print_success "Frontend built successfully"
}

# Test builds locally
test_builds() {
    print_info "Testing builds..."
    
    # Test backend
    if [ ! -d "backend/dist" ]; then
        print_error "Backend build failed - dist folder not found"
        exit 1
    fi
    
    # Test frontend
    if [ ! -d "frontend/dist" ]; then
        print_error "Frontend build failed - dist folder not found"
        exit 1
    fi
    
    print_success "Builds tested successfully"
}

# Check environment files
check_env_files() {
    print_info "Checking environment files..."
    
    if [ ! -f ".env.production.example" ]; then
        print_warning ".env.production.example not found"
    else
        print_success "Environment template found"
    fi
}

# Git status check
check_git_status() {
    print_info "Checking git status..."
    
    if [ -n "$(git status --porcelain)" ]; then
        print_warning "You have uncommitted changes"
        git status --short
        echo ""
        read -p "Do you want to commit these changes? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            read -p "Enter commit message: " commit_msg
            git add .
            git commit -m "$commit_msg"
            print_success "Changes committed"
        fi
    else
        print_success "Working directory clean"
    fi
}

# Push to GitHub
push_to_github() {
    print_info "Pushing to GitHub..."
    
    current_branch=$(git branch --show-current)
    print_info "Current branch: $current_branch"
    
    read -p "Push to GitHub? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git push origin $current_branch
        print_success "Pushed to GitHub"
    else
        print_warning "Skipped GitHub push"
    fi
}

# Display deployment checklist
show_checklist() {
    echo ""
    echo "📋 Pre-Deployment Checklist"
    echo "============================"
    echo ""
    echo "Digital Ocean Setup:"
    echo "  [ ] Created PostgreSQL database"
    echo "  [ ] Created Spaces bucket"
    echo "  [ ] Generated Spaces access keys"
    echo "  [ ] Noted all connection strings"
    echo ""
    echo "App Platform Configuration:"
    echo "  [ ] Connected GitHub repository"
    echo "  [ ] Configured backend component"
    echo "  [ ] Configured frontend component"
    echo "  [ ] Set all environment variables"
    echo "  [ ] Configured routes for frontend"
    echo ""
    echo "Database:"
    echo "  [ ] Exported local database"
    echo "  [ ] Ready to import to production"
    echo ""
    echo "Code:"
    echo "  [ ] All changes committed"
    echo "  [ ] Pushed to GitHub"
    echo "  [ ] Backend builds successfully"
    echo "  [ ] Frontend builds successfully"
    echo ""
}

# Main menu
show_menu() {
    echo ""
    echo "What would you like to do?"
    echo "1) Generate JWT Secret"
    echo "2) Build Backend"
    echo "3) Build Frontend"
    echo "4) Build Both (Backend + Frontend)"
    echo "5) Test Builds"
    echo "6) Check Git Status"
    echo "7) Push to GitHub"
    echo "8) Full Pre-Deployment (Build + Test + Push)"
    echo "9) Show Deployment Checklist"
    echo "0) Exit"
    echo ""
    read -p "Enter your choice: " choice
    
    case $choice in
        1) generate_jwt_secret ;;
        2) build_backend ;;
        3) build_frontend ;;
        4) build_backend && build_frontend ;;
        5) test_builds ;;
        6) check_git_status ;;
        7) push_to_github ;;
        8) 
            build_backend
            build_frontend
            test_builds
            check_git_status
            push_to_github
            print_success "Pre-deployment complete!"
            ;;
        9) show_checklist ;;
        0) exit 0 ;;
        *) print_error "Invalid choice" ;;
    esac
    
    show_menu
}

# Main execution
main() {
    check_requirements
    check_env_files
    show_menu
}

main
