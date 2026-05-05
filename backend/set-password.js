#!/usr/bin/env node
// Run this script on the VM to change the shared app password.
// Usage: node set-password.js
const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');
const readline = require('readline');

const ENV_FILE = path.join(__dirname, '.env');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('סיסמה חדשה: ', (password) => {
  rl.close();
  if (!password.trim()) {
    console.error('סיסמה ריקה — לא בוצע שינוי.');
    process.exit(1);
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password.trim(), salt, 64).toString('hex');
  const entry = `APP_PASSWORD_HASH=${salt}:${hash}`;

  let envContent = fs.readFileSync(ENV_FILE, 'utf8');
  if (envContent.includes('APP_PASSWORD_HASH=')) {
    envContent = envContent.replace(/APP_PASSWORD_HASH=.*/g, entry);
  } else {
    envContent = envContent.trimEnd() + '\n' + entry + '\n';
  }
  fs.writeFileSync(ENV_FILE, envContent, 'utf8');
  console.log('✓ הסיסמה עודכנה. יש לאתחל את השרת כדי שהשינוי יכנס לתוקף.');
});
