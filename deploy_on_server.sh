#!/bin/bash

# Apex Platform - Deployment Script for Server
# Run this script on your Linux server

echo "🚀 Starting Deployment on Server..."

# 1. Install Core Dependencies & Setup DB
echo "📦 Installing Core Dependencies..."
cd packages/core
npm install

echo "🗄️ Generating Prisma Client..."
npx prisma generate

echo "🔄 Running Database Migration..."
# Only run this if you have the DB credentials in your .env on the server
npx prisma migrate dev --name storefront-final

# 2. Install Storefront Dependencies & Build
echo "📦 Installing Storefront Dependencies..."
cd ../storefront
npm install

echo "🏗️ Building Storefront..."
npm run build

echo "✅ Deployment Preparation Complete!"
echo "To start the servers:"
echo "1. Core: cd packages/core && npm run start:prod"
echo "2. Storefront: cd packages/storefront && npm start"
