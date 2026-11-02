/**
 * Discord User Flags Calculator
 * Decodes Discord API bitwise public_flags into matching badge definitions.
 */

const fs = require('fs');
const path = require('path');

const badgesPath = path.join(__dirname, '..', 'data', 'badges.json');
const badges = JSON.parse(fs.readFileSync(badgesPath, 'utf8'));

// Filter all badges with a defined public flag
const FLAG_BADGES = badges
  .filter((b) => typeof b.flag === 'number' && b.flag > 0)
  .sort((a, b) => a.flag - b.flag);

/**
 * Calculates which badges correspond to a given Discord user flags bitmask integer.
 * @param {number|string|BigInt} flags - The public_flags integer from Discord API
 * @returns {Array<object>} Array of matching badge objects
 */
function calculateBadges(flags) {
  const numericFlags = typeof flags === 'bigint' ? flags : BigInt(flags || 0);
  if (numericFlags <= 0n) {
    return [];
  }

  const matches = [];
  for (const badge of FLAG_BADGES) {
    const badgeFlag = BigInt(badge.flag);
    if ((numericFlags & badgeFlag) === badgeFlag) {
      matches.push(badge);
    }
  }

  return matches;
}

// CLI support: node scripts/calculate-flags.js <flags>
if (require.main === module) {
  const arg = process.argv[2];
  if (!arg || isNaN(Number(arg))) {
    console.log('Usage: node scripts/calculate-flags.js <flags_integer>');
    console.log('Example: node scripts/calculate-flags.js 4194368');
    process.exit(1);
  }

  const results = calculateBadges(arg);
  console.log(`\nDecoding flags: ${arg}`);
  console.log(`Found ${results.length} matching badge(s):\n`);

  if (results.length === 0) {
    console.log('No badges match this flags value.');
  } else {
    for (const b of results) {
      console.log(`- [${b.flag_name || 'FLAG'}] ${b.name} (Flag value: ${b.flag})`);
      console.log(`  Asset: ${b.asset_path}`);
      console.log(`  Earned: ${b.earned_by}\n`);
    }
  }
}

module.exports = {
  calculateBadges,
  FLAG_BADGES,
};
