#!/usr/bin/env node

import { execSync } from 'child_process';
import { exit } from 'process';

try {
  console.log('Running IpcWrapper tests...\n');
  
  // Run only the IpcWrapper tests to avoid the process.exit issue in coordinatorAgent.test.js
  const result = execSync('npx vitest run tests/IpcWrapper.test.js', {
    stdio: 'inherit',
    encoding: 'utf-8'
  });
  
  console.log('\n✅ IpcWrapper tests completed successfully!');
} catch (error) {
  console.error('\n❌ Some tests failed!');
  exit(1);
}