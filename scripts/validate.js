/**
 * Validation Test Suite for Discord Badges
 * Verifies data integrity, asset paths, and flag calculations without external dependencies.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { calculateBadges, FLAG_BADGES } = require('./calculate-flags');

const ROOT_DIR = path.join(__dirname, '..');
const DATA_PATH = path.join(ROOT_DIR, 'data', 'badges.json');

let errors = 0;

function report(passed, description, detail = '') {
  if (passed) {
    console.log(`  ✓ ${description}`);
  } else {
    errors++;
    console.error(`  ✗ FAIL: ${description}`);
    if (detail) console.error(`    -> ${detail}`);
  }
}

console.log('--- 1. Testing data/badges.json Schema & Integrity ---');

if (!fs.existsSync(DATA_PATH)) {
  console.error(`Missing data file: ${DATA_PATH}`);
  process.exit(1);
}

const rawData = fs.readFileSync(DATA_PATH, 'utf8');
let badges = [];

try {
  badges = JSON.parse(rawData);
  report(Array.isArray(badges) && badges.length > 0, 'badges.json is valid JSON array', `Found ${badges.length} items`);
} catch (err) {
  report(false, 'badges.json parses as JSON', err.message);
  process.exit(1);
}

const seenIds = new Set();
const allowedCategories = new Set([
  'general',
  'bot',
  'gifting',
  'account_age',
  'streaming',
  'game_time',
  'game_variety',
  'nitro_subscription',
  'nitro_boost',
  'server',
  'special_flair',
  'tag_icon',
  'hall_of_fame'
]);

for (const badge of badges) {
  // Check required fields
  const hasFields =
    typeof badge.id === 'string' &&
    badge.id.trim() !== '' &&
    typeof badge.name === 'string' &&
    badge.name.trim() !== '' &&
    typeof badge.category === 'string' &&
    allowedCategories.has(badge.category) &&
    typeof badge.asset_path === 'string' &&
    typeof badge.earned_by === 'string';

  if (!hasFields) {
    report(false, `Badge ${badge.id || 'unknown'} has all required fields`, JSON.stringify(badge));
  }

  // Check unique IDs
  if (seenIds.has(badge.id)) {
    report(false, `Badge ID uniqueness: ${badge.id}`, `Duplicate ID detected: ${badge.id}`);
  }
  seenIds.add(badge.id);

  // Check asset paths exist on disk
  const assetKeys = ['asset_path', 'secondary_asset_path', 'asset_light_path', 'vector_path'];
  for (const key of assetKeys) {
    if (badge[key]) {
      const fullPath = path.join(ROOT_DIR, badge[key]);
      if (!fs.existsSync(fullPath)) {
        report(false, `Asset exists: ${badge[key]} (for ${badge.id})`, `File not found at ${fullPath}`);
      }
    }
  }

  // Check flag is power of 2 if present
  if (badge.flag !== null && badge.flag !== undefined) {
    const isPowerOfTwo = Number.isInteger(badge.flag) && badge.flag > 0 && (badge.flag & (badge.flag - 1)) === 0;
    if (!isPowerOfTwo) {
      report(false, `Flag is valid power of 2: ${badge.id} (flag: ${badge.flag})`);
    }
  }
}

report(seenIds.size === badges.length, 'All badge IDs are unique', `${seenIds.size} unique IDs`);

console.log('\n--- 2. Testing Discord Public Flags Calculator ---');

// Flag tests
const staffResult = calculateBadges(1);
report(
  staffResult.length === 1 && staffResult[0].id === 'discord-staff',
  'Flag 1 correctly identifies Discord Staff'
);

const comboResult = calculateBadges(4194304 | 64);
const comboIds = comboResult.map((b) => b.id).sort();
report(
  comboIds.length === 2 && comboIds[0] === 'active-developer' && comboIds[1] === 'hypesquad-bravery',
  'Combined flag (4194304 | 64) returns Active Developer and HypeSquad Bravery'
);

const zeroResult = calculateBadges(0);
report(zeroResult.length === 0, 'Flag 0 returns no badges');

const bigIntResult = calculateBadges(BigInt(16777216)); // Automod rule badge
report(
  bigIntResult.length === 1 && bigIntResult[0].id === 'uses-automod',
  'BigInt flag 16777216 correctly identifies Uses Automod'
);

console.log('\n--- 3. Testing README Assets Reference Integrity ---');

const readmeContent = fs.readFileSync(path.join(ROOT_DIR, 'README.md'), 'utf8');
const localAssetMatches = [...readmeContent.matchAll(/src="(\/assets\/[^"]+)"/g)];

let missingReadmeAssets = 0;
for (const match of localAssetMatches) {
  const relativePath = match[1].replace(/^\//, '');
  const fullPath = path.join(ROOT_DIR, relativePath);
  if (!fs.existsSync(fullPath)) {
    missingReadmeAssets++;
    report(false, `README asset reference exists: ${relativePath}`);
  }
}

if (missingReadmeAssets === 0) {
  report(true, `All ${localAssetMatches.length} local asset references in README.md exist on disk`);
}

console.log('\n----------------------------------------');
if (errors > 0) {
  console.error(`Validation failed with ${errors} error(s).`);
  process.exit(1);
} else {
  console.log(`Validation PASSED! All checks verified successfully.`);
  process.exit(0);
}
