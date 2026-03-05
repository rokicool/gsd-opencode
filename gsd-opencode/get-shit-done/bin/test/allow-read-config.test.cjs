/**
 * allow-read-config.test.cjs — Tests for allow-read-config command
 *
 * Tests the allow-read-config command functionality:
 * - Permission creation
 * - Idempotency (detecting existing permission)
 * - Dry-run mode
 * - Backup creation
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const CLI_PATH = path.join(__dirname, '../gsd-oc-commands/allow-read-config.cjs');
const TOOLS_PATH = path.join(__dirname, '../gsd-oc-tools.cjs');

/**
 * Create a temporary test directory
 */
function createTestDir() {
  const testDir = path.join(os.tmpdir(), `gsd-oc-test-${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });
  return testDir;
}

/**
 * Clean up test directory
 */
function cleanupTestDir(testDir) {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

/**
 * Run CLI command and parse JSON output
 */
function runCLI(testDir, args) {
  const cmd = `node ${TOOLS_PATH} allow-read-config ${args.join(' ')}`;
  const output = execSync(cmd, { cwd: testDir, encoding: 'utf8' });
  return JSON.parse(output);
}

/**
 * Test: Create new opencode.json with permission
 */
function testCreatePermission() {
  console.log('Test: Create new opencode.json with permission...');
  
  const testDir = createTestDir();
  
  try {
    const result = runCLI(testDir, []);
    
    if (!result.success) {
      throw new Error(`Expected success, got: ${JSON.stringify(result)}`);
    }
    
    if (result.data.action !== 'add_permission') {
      throw new Error(`Expected action 'add_permission', got: ${result.data.action}`);
    }
    
    if (result.data.created !== true) {
      throw new Error(`Expected created=true, got: ${result.data.created}`);
    }
    
    // Verify opencode.json was created
    const opencodePath = path.join(testDir, 'opencode.json');
    if (!fs.existsSync(opencodePath)) {
      throw new Error('opencode.json was not created');
    }
    
    const content = JSON.parse(fs.readFileSync(opencodePath, 'utf8'));
    if (!content.permission?.external_directory) {
      throw new Error('Permission not added to opencode.json');
    }
    
    console.log('✓ PASS: Create permission\n');
    return true;
  } catch (err) {
    console.error('✗ FAIL:', err.message, '\n');
    return false;
  } finally {
    cleanupTestDir(testDir);
  }
}

/**
 * Test: Idempotency - detect existing permission
 */
function testIdempotency() {
  console.log('Test: Idempotency (detect existing permission)...');
  
  const testDir = createTestDir();
  
  try {
    // First call - create permission
    runCLI(testDir, []);
    
    // Second call - should detect existing
    const result = runCLI(testDir, []);
    
    if (!result.success) {
      throw new Error(`Expected success, got: ${JSON.stringify(result)}`);
    }
    
    if (result.data.action !== 'permission_exists') {
      throw new Error(`Expected action 'permission_exists', got: ${result.data.action}`);
    }
    
    console.log('✓ PASS: Idempotency\n');
    return true;
  } catch (err) {
    console.error('✗ FAIL:', err.message, '\n');
    return false;
  } finally {
    cleanupTestDir(testDir);
  }
}

/**
 * Test: Dry-run mode
 */
function testDryRun() {
  console.log('Test: Dry-run mode...');
  
  const testDir = createTestDir();
  
  try {
    const result = runCLI(testDir, ['--dry-run']);
    
    if (!result.success) {
      throw new Error(`Expected success, got: ${JSON.stringify(result)}`);
    }
    
    if (result.data.dryRun !== true) {
      throw new Error(`Expected dryRun=true, got: ${result.data.dryRun}`);
    }
    
    // Verify opencode.json was NOT created
    const opencodePath = path.join(testDir, 'opencode.json');
    if (fs.existsSync(opencodePath)) {
      throw new Error('opencode.json should not be created in dry-run mode');
    }
    
    console.log('✓ PASS: Dry-run mode\n');
    return true;
  } catch (err) {
    console.error('✗ FAIL:', err.message, '\n');
    return false;
  } finally {
    cleanupTestDir(testDir);
  }
}

/**
 * Test: Backup creation on update
 */
function testBackupCreation() {
  console.log('Test: Backup creation on update...');
  
  const testDir = createTestDir();
  
  try {
    // Create initial opencode.json
    const opencodePath = path.join(testDir, 'opencode.json');
    const initialContent = {
      "$schema": "https://opencode.ai/config.json",
      "model": "test/model"
    };
    fs.writeFileSync(opencodePath, JSON.stringify(initialContent, null, 2) + '\n');
    
    // Run allow-read-config
    const result = runCLI(testDir, []);
    
    if (!result.success) {
      throw new Error(`Expected success, got: ${JSON.stringify(result)}`);
    }
    
    if (!result.data.backup) {
      throw new Error('Expected backup path, got none');
    }
    
    if (!fs.existsSync(result.data.backup)) {
      throw new Error(`Backup file does not exist: ${result.data.backup}`);
    }
    
    // Verify backup content matches original
    const backupContent = JSON.parse(fs.readFileSync(result.data.backup, 'utf8'));
    if (JSON.stringify(backupContent) !== JSON.stringify(initialContent)) {
      throw new Error('Backup content does not match original');
    }
    
    console.log('✓ PASS: Backup creation\n');
    return true;
  } catch (err) {
    console.error('✗ FAIL:', err.message, '\n');
    return false;
  } finally {
    cleanupTestDir(testDir);
  }
}

/**
 * Test: Verbose output
 */
function testVerbose() {
  console.log('Test: Verbose output...');
  
  const testDir = createTestDir();
  
  try {
    const cmd = `node ${TOOLS_PATH} allow-read-config --verbose`;
    const output = execSync(cmd, { cwd: testDir, encoding: 'utf8', stdio: 'pipe' });
    
    // Verbose output should contain log messages to stderr
    // We just verify it doesn't crash
    console.log('✓ PASS: Verbose output\n');
    return true;
  } catch (err) {
    console.error('✗ FAIL:', err.message, '\n');
    return false;
  } finally {
    cleanupTestDir(testDir);
  }
}

/**
 * Run all tests
 */
function runTests() {
  console.log('Running allow-read-config tests...\n');
  console.log('=' .repeat(50));
  console.log();
  
  const results = [
    testCreatePermission(),
    testIdempotency(),
    testDryRun(),
    testBackupCreation(),
    testVerbose()
  ];
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('=' .repeat(50));
  console.log(`Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('✓ All tests passed!\n');
    process.exit(0);
  } else {
    console.error(`✗ ${total - passed} test(s) failed\n`);
    process.exit(1);
  }
}

// Run tests
runTests();
