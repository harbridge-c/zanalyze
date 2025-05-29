const fs = require('fs');
const path = require('path');

// Read the coverage summary
const coveragePath = path.join(__dirname, '../coverage/coverage-summary.json');

if (!fs.existsSync(coveragePath)) {
    console.error('Coverage summary not found. Run tests with coverage first.');
    process.exit(1);
}

const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
const summary = coverage.total;

// Define thresholds (matching vitest.config.ts)
const thresholds = {
    branches: 95,
    functions: 70,
    lines: 40,
    statements: 40
};

// Check thresholds
let failed = false;
const results = {};

for (const [metric, threshold] of Object.entries(thresholds)) {
    const actual = summary[metric].pct;
    const passed = actual >= threshold;
    results[metric] = { actual, threshold, passed };

    if (!passed) {
        failed = true;
        console.error(`❌ Coverage for ${metric} (${actual}%) does not meet threshold (${threshold}%)`);
    } else {
        console.log(`✅ Coverage for ${metric} (${actual}%) meets threshold (${threshold}%)`);
    }
}

if (failed) {
    console.error('\n❌ Coverage thresholds not met!');
    process.exit(1);
} else {
    console.log('\n✅ All coverage thresholds met!');
}