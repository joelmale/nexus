#!/usr/bin/env node
/**
 * Railway Environment Variable Generator
 *
 * This script generates a secure SESSION_SECRET and provides templates
 * for Railway environment variable configuration.
 */

import crypto from 'crypto';

// Generate a secure random session secret
const generateSessionSecret = () => {
  return crypto.randomBytes(32).toString('base64');
};

console.log('🚂 Railway Environment Variable Setup for Nexus VTT\n');
console.log('=' .repeat(60));

const sessionSecret = generateSessionSecret();

console.log('\n📋 BACKEND SERVICE ENVIRONMENT VARIABLES\n');
console.log('Copy these variables to your Railway backend service:\n');

console.log('# Required Variables');
console.log('DATABASE_URL=${postgres.DATABASE_URL}');
console.log(`SESSION_SECRET=${sessionSecret}`);
console.log('PORT=${{RAILWAY_PORT}}');
console.log('NODE_ENV=production');
console.log('');

console.log('# CORS Configuration');
console.log('# Replace <your-frontend-domain> with actual Railway frontend domain');
console.log('CORS_ORIGIN=https://<your-frontend-domain>.up.railway.app');
console.log('FRONTEND_URL=https://<your-frontend-domain>.up.railway.app');
console.log('');

console.log('# Google OAuth (get from https://console.cloud.google.com)');
console.log('GOOGLE_CLIENT_ID=<your-google-client-id>');
console.log('GOOGLE_CLIENT_SECRET=<your-google-client-secret>');
console.log('');

console.log('# Discord OAuth (get from https://discord.com/developers)');
console.log('DISCORD_CLIENT_ID=<your-discord-client-id>');
console.log('DISCORD_CLIENT_SECRET=<your-discord-client-secret>');

console.log('\n' + '=' .repeat(60));
console.log('\n📋 FRONTEND SERVICE ENVIRONMENT VARIABLES\n');
console.log('Copy these variables to your Railway frontend service:\n');

console.log('# WebSocket Configuration');
console.log('VITE_WS_PORT=443');
console.log('# Replace <your-backend-domain> with actual Railway backend domain');
console.log('VITE_ASSET_SERVER_URL=https://<your-backend-domain>.up.railway.app');

console.log('\n' + '=' .repeat(60));
console.log('\n📝 DEPLOYMENT STEPS:\n');
console.log('1. Create Railway project from GitHub repo');
console.log('2. Add PostgreSQL database');
console.log('3. Generate domains for both services');
console.log('4. Add environment variables to each service');
console.log('5. Update OAuth redirect URLs in provider consoles:');
console.log('   - Google: https://<backend-domain>/auth/google/callback');
console.log('   - Discord: https://<backend-domain>/auth/discord/callback');
console.log('6. Redeploy services after updating variables');
console.log('\n✅ See docs/RAILWAY_SETUP.md for detailed instructions\n');
