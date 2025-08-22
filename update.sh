#!/bin/bash

# Pull latest changes from git
git pull

# Build the project
npm run build

# Restart PM2 process 0
pm2 restart 0