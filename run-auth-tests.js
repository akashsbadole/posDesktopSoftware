#!/usr/bin/env node

/**
 * Authentication Test Runner
 *
 * This script runs the authentication tests with specific configuration
 * for the POS application.
 */

const { execSync, spawn } = require('child_process');
const path = require('path');

console.log('🚀 Running POS Authentication Tests\n');

async function runTests() {
  let serverProcess;

  try {
    // Ensure we're in the right directory
    process.chdir(__dirname);

    console.log('📦 Checking Playwright installation...');
    execSync('npx playwright --version', { stdio: 'inherit' });

    console.log('🌐 Starting dev server...');
    serverProcess = spawn('npm', ['run', 'dev'], {
      stdio: ['inherit', 'inherit', 'inherit'],
      detached: false
    });

    // Wait for server to be ready
    console.log('⏳ Waiting for server to start...');
    await new Promise((resolve, reject) => {
      let timeout = setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 30000);

      const checkServer = () => {
        try {
          const result = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000', { encoding: 'utf8' });
          if (result.trim() === '200') {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkServer, 1000);
          }
        } catch (e) {
          setTimeout(checkServer, 1000);
        }
      };

      setTimeout(checkServer, 2000);
    });

    console.log('✅ Server is ready!');
    console.log('🎭 Running authentication tests...');

    execSync('npx playwright test verification/auth_flow.spec.ts --reporter=line', {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    console.log('✅ Authentication tests completed successfully!');
  } catch (error) {
    console.error('❌ Authentication tests failed:', error.message);
    process.exit(1);
  } finally {
    if (serverProcess) {
      console.log('🛑 Stopping server...');
      serverProcess.kill();
    }
  }
}

runTests();