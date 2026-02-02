/**
 * Quality Gates — 4-Gate Udemy-Specific Validation
 */

const { evaluateCourseQuality, THRESHOLD_MINIMUM } = require('./qualityEngine');
const fs = require('fs');

function extractScriptText(lecture) {
  const parts = [];
  if (lecture.script?.opening) parts.push(lecture.script.opening);
  if (lecture.script?.mainContent) lecture.script.mainContent.forEach(m => parts.push(m.content || ''));
  if (lecture.script?.summary) parts.push(lecture.script.summary);
  return parts.join(' ');
}

async function gateCurriculum(courseContent) {
  console.log('\n   GATE 1: Curriculum');
  const r = { gate: 1, name: 'Curriculum', passed: true, checks: [], failures: [] };
  const meta = courseContent.metadata || {};
  const sections = courseContent.sections || [];

  const check = (cond, name, value, issue) => {
    if (cond) { r.checks.push({ name, status: 'pass', value }); }
    else { r.passed = false; r.failures.push({ name, issue }); }
  };

  check(meta.title?.length >= 10 && meta.title.length <= 80, 'Title', meta.title?.length + ' chars', 'Title 10-80 chars');
  check(meta.description?.length >= 200, 'Description', meta.description?.length + ' chars', 'Description 200+ chars');
  check(meta.objectives?.length >= 3, 'Objectives', meta.objectives?.length, 'Need 3+ objectives');
  check(sections.length >= 5, 'Sections', sections.length, `Need 5+ (have ${sections.length})`);

  const lectureCount = sections.reduce((s, sec) => s + (sec.lectures?.length || 0), 0);
  check(lectureCount >= 5, 'Lectures', lectureCount, `Need 5+ (have ${lectureCount})`);

  console.log(`   Gate 1: ${r.passed ? 'PASSED' : 'FAILED'}`);
  return r;
}

async function gateLectures(courseContent) {
  console.log('\n   GATE 2: Lectures');
  const r = { gate: 2, name: 'Lectures', passed: true, checks: [], failures: [] };
  const sections = courseContent.sections || [];
  let totalDuration = 0, issues = 0;

  for (const sec of sections) {
    for (const lec of sec.lectures || []) {
      const text = extractScriptText(lec);
      const words = text.split(/\s+/).filter(w => w).length;
      const slides = (lec.slides || []).length;
      totalDuration += lec.duration || 0;
      if (words < 200 || slides < 2) issues++;
    }
  }

  const total = sections.reduce((s, sec) => s + (sec.lectures?.length || 0), 0);
  if (issues / total > 0.3) { r.passed = false; r.failures.push({ name: 'Quality', issue: `${issues}/${total} lectures have issues` }); }
  else { r.checks.push({ name: 'Quality', status: 'pass', value: `${total - issues}/${total} OK` }); }

  if (totalDuration < 30 || totalDuration > 120) { r.passed = false; r.failures.push({ name: 'Duration', issue: `${totalDuration}min` }); }
  else { r.checks.push({ name: 'Duration', status: 'pass', value: `${totalDuration}min` }); }

  console.log(`   Gate 2: ${r.passed ? 'PASSED' : 'FAILED'}`);
  return r;
}

async function gateVideo(productionData) {
  console.log('\n   GATE 3: Production Files');
  const r = { gate: 3, name: 'Video', passed: true, checks: [], failures: [] };
  const { audioFiles = [], videoFiles = [] } = productionData;

  let audioOK = 0;
  for (const af of audioFiles) {
    const p = typeof af === 'string' ? af : af.audioPath;
    if (p && fs.existsSync(p)) audioOK++;
  }

  if (audioFiles.length > 0 && audioOK < audioFiles.length * 0.5) {
    r.passed = false;
    r.failures.push({ name: 'Audio', issue: `${audioOK}/${audioFiles.length} files exist` });
  } else {
    r.checks.push({ name: 'Audio', status: audioFiles.length > 0 ? 'pass' : 'skip', value: `${audioOK}/${audioFiles.length}` });
  }

  console.log(`   Gate 3: ${r.passed ? 'PASSED' : 'FAILED'}`);
  return r;
}

async function gateFinalAssembly(courseContent, productionData = {}) {
  console.log('\n   GATE 4: Final Assembly (7 Dimensions)');
  const evaluation = evaluateCourseQuality(courseContent, productionData);

  const r = { gate: 4, name: 'Final Assembly', passed: evaluation.passing, overall: evaluation.overall, checks: [], failures: [] };

  Object.entries(evaluation.scores).forEach(([dim, result]) => {
    if (result.score >= THRESHOLD_MINIMUM) {
      r.checks.push({ name: dim, status: 'pass', value: `${result.score}/100` });
    } else {
      r.failures.push({ name: dim, score: result.score, issues: result.issues });
    }
  });

  // Udemy compliance
  const desc = courseContent.metadata?.description || '';
  if (!desc.toLowerCase().includes('ai')) {
    r.passed = false;
    r.failures.push({ name: 'Udemy Compliance', issues: ['AI disclosure required'] });
  }

  console.log(`   Gate 4: ${r.passed ? 'PASSED' : 'FAILED'} (${evaluation.overall}/100)`);
  return r;
}

async function runAllGates(courseContent, productionData = {}) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('   QUALITY GATES');
  console.log('═══════════════════════════════════════════════════════════════');

  const results = { timestamp: new Date().toISOString(), passed: true, gates: {} };

  const g1 = await gateCurriculum(courseContent);
  results.gates.curriculum = g1;
  if (!g1.passed) { results.passed = false; results.failedAt = 1; return results; }

  const g2 = await gateLectures(courseContent);
  results.gates.lectures = g2;
  if (!g2.passed) { results.passed = false; results.failedAt = 2; return results; }

  if (productionData.audioFiles?.length || productionData.videoFiles?.length) {
    const g3 = await gateVideo(productionData);
    results.gates.video = g3;
    if (!g3.passed) { results.passed = false; results.failedAt = 3; return results; }
  }

  const g4 = await gateFinalAssembly(courseContent, productionData);
  results.gates.finalAssembly = g4;
  if (!g4.passed) { results.passed = false; results.failedAt = 4; return results; }

  results.overall = g4.overall;
  console.log(`\n   ALL GATES PASSED — Score: ${g4.overall}/100`);
  return results;
}

module.exports = { gateCurriculum, gateLectures, gateVideo, gateFinalAssembly, runAllGates };
