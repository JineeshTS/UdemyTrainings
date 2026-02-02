/**
 * Batch Runner — Runs N courses, cron-friendly
 *
 * Usage:
 *   node batchRunner.js                # Run 5 courses (default)
 *   node batchRunner.js --count=10     # Run 10 courses
 *   node batchRunner.js --category="AI" --count=3
 *
 * Cron example (run 5 courses every 6 hours):
 *   0 */6 * * * cd /home/udemycrores && node src/scripts/batchRunner.js --count=5 >> logs/cron.log 2>&1
 */

require('dotenv').config();
const { orchestrateBatch } = require('./courseOrchestrator');
const { getStatistics } = require('../apollo/curriculum');
const { sendDailyReport } = require('./emailNotifier');
const fs = require('fs');
const path = require('path');

async function main() {
  const args = process.argv.slice(2);
  let count = 5;
  let category = null;

  args.forEach(arg => {
    if (arg.startsWith('--count=')) count = parseInt(arg.split('=')[1]) || 5;
    if (arg.startsWith('--category=')) category = arg.split('=')[1];
  });

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('   BATCH RUNNER');
  console.log('═══════════════════════════════════════════════════════════════');

  const stats = getStatistics();
  console.log(`   Catalog: ${stats.total} total | ${stats.completed} done | ${stats.pending} pending`);
  console.log(`   This run: ${count} courses${category ? ` (${category})` : ''}`);

  if (stats.pending === 0) {
    console.log('   All courses complete!');
    return;
  }

  count = Math.min(count, stats.pending);

  const result = await orchestrateBatch(count, { category });

  // Send daily report
  try {
    await sendDailyReport({
      coursesGenerated: result.results.map(r => ({
        title: r.course?.title,
        category: r.course?.category,
        qualityScore: r.qualityScore,
        success: r.success
      })),
      successCount: result.successful,
      failedCount: result.failed
    });
  } catch {}

  // Cleanup temp files
  const logsDir = path.join(__dirname, '../../logs');
  const logFiles = fs.readdirSync(logsDir).filter(f => f.endsWith('.log'));
  if (logFiles.length > 100) {
    logFiles.sort().slice(0, logFiles.length - 50).forEach(f => {
      try { fs.unlinkSync(path.join(logsDir, f)); } catch {}
    });
  }

  console.log(`\n   Batch complete: ${result.successful}/${count}`);
  const updatedStats = getStatistics();
  console.log(`   Overall: ${updatedStats.completed}/${updatedStats.total} (${updatedStats.completionRate})`);
}

main().catch(err => {
  console.error('Batch runner error:', err);
  process.exit(1);
});
