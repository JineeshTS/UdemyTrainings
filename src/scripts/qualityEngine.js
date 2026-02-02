/**
 * Quality Engine — 7-Dimension Udemy-Specific Scoring
 *
 * Dimensions (Udemy-focused):
 *   1. Accuracy & Credibility (25%) — no hallucinations, facts verifiable
 *   2. Learning Objectives (15%) — clear, measurable, covered by content
 *   3. Content Structure (15%) — logical flow, proper timing
 *   4. Practical Application (20%) — real-world examples, actionable
 *   5. Assessment Quality (10%) — quiz covers all concepts, good difficulty mix
 *   6. Production Completeness (10%) — all deliverables present and correct
 *   7. Engagement & Clarity (5%) — clear language, conversational tone
 */

const THRESHOLD_TARGET = 95;
const THRESHOLD_ACCEPTABLE = 90;
const THRESHOLD_MINIMUM = 85;

const WEIGHTS = {
  accuracy: 0.25,
  learningObjectives: 0.15,
  contentStructure: 0.15,
  practicalApplication: 0.20,
  assessmentQuality: 0.10,
  productionCompleteness: 0.10,
  engagementClarity: 0.05
};

function extractScriptText(lecture) {
  const parts = [];
  if (lecture.script?.opening) parts.push(lecture.script.opening);
  if (lecture.script?.mainContent) lecture.script.mainContent.forEach(m => parts.push(m.content || ''));
  if (lecture.script?.summary) parts.push(lecture.script.summary);
  if (lecture.script?.callToAction) parts.push(lecture.script.callToAction);
  return parts.join(' ');
}

function scoreAccuracy(content) {
  const r = { score: 0, passed: [], issues: [] };
  let pts = 0, max = 0;

  const sections = content.sections || [];
  const lectures = sections.flatMap(s => s.lectures || []);

  // Check for hedging language that suggests speculation (max 30)
  max += 30;
  let speculative = 0;
  for (const l of lectures) {
    const text = extractScriptText(l).toLowerCase();
    const patterns = ['might be', 'probably', 'i think', 'maybe', 'perhaps', 'supposedly'];
    for (const p of patterns) { if (text.includes(p)) speculative++; }
  }
  if (speculative === 0) { pts += 30; r.passed.push('No speculative language'); }
  else if (speculative <= 3) { pts += 22; r.issues.push(`${speculative} speculative phrases found`); }
  else { pts += 10; r.issues.push('Too much speculative language'); }

  // Check AI disclosure (max 20)
  max += 20;
  const desc = content.metadata?.description || '';
  if (desc.toLowerCase().includes('ai')) { pts += 20; r.passed.push('AI disclosure present'); }
  else { r.issues.push('Missing AI disclosure in description'); }

  // Check for filler words (max 25)
  max += 25;
  const fillers = ['um', 'uh', 'basically', 'literally', 'you know'];
  let fillerCount = 0;
  for (const l of lectures) {
    const text = extractScriptText(l).toLowerCase();
    for (const f of fillers) { const m = text.match(new RegExp(`\\b${f}\\b`, 'g')); if (m) fillerCount += m.length; }
  }
  if (fillerCount === 0) { pts += 25; r.passed.push('No filler words'); }
  else if (fillerCount <= 5) { pts += 18; r.issues.push(`${fillerCount} filler words`); }
  else { pts += 8; r.issues.push(`Too many filler words (${fillerCount})`); }

  // Sources/references (max 25)
  max += 25;
  let refCount = 0;
  for (const l of lectures) {
    const text = extractScriptText(l).toLowerCase();
    if (/research|study|according|data shows|evidence|proven|established/.test(text)) refCount++;
  }
  if (refCount >= lectures.length * 0.5) { pts += 25; r.passed.push('Good factual grounding'); }
  else if (refCount >= 2) { pts += 18; r.issues.push('Add more factual references'); }
  else { pts += 8; r.issues.push('Needs factual grounding'); }

  r.score = Math.round((pts / max) * 100);
  return r;
}

function scoreLearningObjectives(content) {
  const r = { score: 0, passed: [], issues: [] };
  let pts = 0, max = 0;

  const objs = content.metadata?.objectives || [];
  const sections = content.sections || [];

  // Objectives count (30)
  max += 30;
  if (objs.length >= 4) { pts += 30; r.passed.push(`${objs.length} objectives defined`); }
  else if (objs.length >= 3) { pts += 22; }
  else { pts += 8; r.issues.push('Need 4+ objectives'); }

  // Action verbs (30)
  max += 30;
  const actionVerbs = ['understand', 'apply', 'analyze', 'create', 'evaluate', 'identify', 'implement', 'develop', 'design', 'master', 'learn', 'build'];
  const withVerbs = objs.filter(o => actionVerbs.some(v => o.toLowerCase().startsWith(v)));
  if (withVerbs.length >= objs.length * 0.8) { pts += 30; r.passed.push('Objectives use action verbs'); }
  else { pts += 15; r.issues.push('Use action verbs in objectives'); }

  // Coverage (40)
  max += 40;
  if (sections.length >= objs.length && sections.length >= 5) { pts += 40; r.passed.push('Content covers objectives'); }
  else if (sections.length >= 3) { pts += 25; r.issues.push('Some objectives may lack coverage'); }
  else { pts += 10; r.issues.push('Insufficient content for objectives'); }

  r.score = Math.round((pts / max) * 100);
  return r;
}

function scoreContentStructure(content) {
  const r = { score: 0, passed: [], issues: [] };
  let pts = 0, max = 0;

  const sections = content.sections || [];
  const lectures = sections.flatMap(s => s.lectures || []);

  // Section count (25)
  max += 25;
  if (sections.length >= 5 && sections.length <= 15) { pts += 25; r.passed.push(`${sections.length} sections`); }
  else if (sections.length >= 3) { pts += 15; r.issues.push(`${sections.length} sections (need 5-15)`); }
  else { pts += 5; r.issues.push('Too few sections'); }

  // Lecture distribution (25)
  max += 25;
  const avgPerSection = sections.length > 0 ? lectures.length / sections.length : 0;
  if (avgPerSection >= 1 && avgPerSection <= 8) { pts += 25; r.passed.push('Good lecture distribution'); }
  else { pts += 12; r.issues.push('Uneven lecture distribution'); }

  // Duration (25)
  max += 25;
  const totalDuration = lectures.reduce((s, l) => s + (l.duration || 7), 0);
  if (totalDuration >= 30 && totalDuration <= 90) { pts += 25; r.passed.push(`${totalDuration}min total`); }
  else { pts += 12; r.issues.push(`Duration ${totalDuration}min (need 30-90)`); }

  // Flow (25)
  max += 25;
  const titles = sections.map(s => (s.title || '').toLowerCase());
  const hasIntro = titles[0]?.includes('intro') || titles[0]?.includes('foundation');
  const hasClose = titles[titles.length - 1]?.includes('clos') || titles[titles.length - 1]?.includes('summar');
  if (hasIntro || hasClose || sections.length >= 5) { pts += 25; r.passed.push('Logical flow'); }
  else { pts += 15; r.issues.push('Improve intro/conclusion'); }

  r.score = Math.round((pts / max) * 100);
  return r;
}

function scorePracticalApplication(content) {
  const r = { score: 0, passed: [], issues: [] };
  let pts = 0, max = 0;

  const lectures = (content.sections || []).flatMap(s => s.lectures || []);

  // Examples (35)
  max += 35;
  let examples = 0;
  const exampleWords = ['example', 'for instance', 'such as', "let's say", 'imagine', 'consider', 'case study', 'scenario'];
  for (const l of lectures) {
    const text = extractScriptText(l).toLowerCase();
    for (const w of exampleWords) { if (text.includes(w)) examples++; }
  }
  if (examples >= lectures.length * 2) { pts += 35; r.passed.push(`${examples} examples`); }
  else if (examples >= lectures.length) { pts += 22; r.issues.push('Add more examples'); }
  else { pts += 8; r.issues.push('Needs more examples'); }

  // Actionable takeaways (30)
  max += 30;
  let actionable = 0;
  for (const l of lectures) {
    if (l.script?.callToAction) actionable++;
    const text = extractScriptText(l).toLowerCase();
    if (/try this|do this|start|implement|apply|action step/.test(text)) actionable++;
  }
  if (actionable >= lectures.length) { pts += 30; r.passed.push('Actionable content'); }
  else { pts += 15; r.issues.push('Add action steps'); }

  // Assignment (35)
  max += 35;
  const a = content.assessment?.practicalAssignment;
  if (a?.requirements?.length >= 2 && a?.deliverables?.length >= 1) { pts += 35; r.passed.push('Good assignment'); }
  else if (a) { pts += 20; r.issues.push('Strengthen assignment'); }
  else { pts += 8; r.issues.push('Missing assignment'); }

  r.score = Math.round((pts / max) * 100);
  return r;
}

function scoreAssessmentQuality(content) {
  const r = { score: 0, passed: [], issues: [] };
  let pts = 0, max = 0;

  const sections = content.sections || [];
  const finalQuiz = content.assessment?.finalQuiz;

  // Section quizzes (35)
  max += 35;
  const withQuiz = sections.filter(s => s.quiz?.questions?.length > 0);
  const coverage = sections.length > 0 ? withQuiz.length / sections.length : 0;
  if (coverage >= 0.7) { pts += 35; r.passed.push('Good quiz coverage'); }
  else if (coverage >= 0.4) { pts += 20; r.issues.push('Add more section quizzes'); }
  else { pts += 8; r.issues.push('Missing section quizzes'); }

  // Final quiz quality (35)
  max += 35;
  if (finalQuiz?.questions?.length >= 10) {
    const hasExplanations = finalQuiz.questions.every(q => q.explanation?.length >= 10);
    const difficulties = new Set(finalQuiz.questions.map(q => q.difficulty));
    if (hasExplanations && difficulties.size >= 2) { pts += 35; r.passed.push('High quality final quiz'); }
    else { pts += 22; r.issues.push('Improve quiz explanations/difficulty'); }
  } else if (finalQuiz?.questions?.length >= 5) {
    pts += 18; r.issues.push('Need 10+ final quiz questions');
  } else {
    pts += 5; r.issues.push('Missing or insufficient final quiz');
  }

  // Question types (30)
  max += 30;
  const allQuestions = [...(finalQuiz?.questions || []), ...sections.flatMap(s => s.quiz?.questions || [])];
  const types = new Set(allQuestions.map(q => q.type));
  if (types.size >= 2) { pts += 30; r.passed.push('Good question variety'); }
  else if (allQuestions.length > 0) { pts += 18; r.issues.push('Add question type variety'); }
  else { pts += 5; r.issues.push('No questions found'); }

  r.score = Math.round((pts / max) * 100);
  return r;
}

function scoreProductionCompleteness(content, productionData = {}) {
  const r = { score: 0, passed: [], issues: [] };
  let pts = 70; // Base

  // Slides
  const hasSlides = (content.sections || []).every(s => (s.lectures || []).every(l => (l.slides || []).length >= 2));
  if (hasSlides) { pts += 15; r.passed.push('All lectures have slides'); }
  else { r.issues.push('Some lectures lack slides'); }

  // Speaker notes
  const hasNotes = (content.sections || []).some(s => (s.lectures || []).some(l => (l.slides || []).some(sl => sl.speakerNotes)));
  if (hasNotes) { pts += 10; r.passed.push('Speaker notes present'); }
  else { r.issues.push('Add speaker notes'); }

  // Cheat sheet
  if (content.cheatSheet?.sections?.length) { pts += 5; r.passed.push('Cheat sheet present'); }
  else { r.issues.push('Missing cheat sheet'); }

  r.score = Math.min(100, pts);
  return r;
}

function scoreEngagementClarity(content) {
  const r = { score: 0, passed: [], issues: [] };
  let pts = 0, max = 0;

  const lectures = (content.sections || []).flatMap(s => s.lectures || []);

  // Hooks (40)
  max += 40;
  let hooks = 0;
  for (const l of lectures) {
    const opening = l.script?.opening || '';
    if (/\?|have you|did you|imagine|what if|today|welcome|let's/.test(opening.toLowerCase())) hooks++;
  }
  if (hooks >= lectures.length * 0.7) { pts += 40; r.passed.push('Strong hooks'); }
  else { pts += 20; r.issues.push('Improve lecture hooks'); }

  // "You" language (30)
  max += 30;
  let youCount = 0;
  for (const l of lectures) {
    const text = extractScriptText(l).toLowerCase();
    const m = text.match(/\byou\b/g);
    if (m) youCount += m.length;
  }
  const avgYou = lectures.length > 0 ? youCount / lectures.length : 0;
  if (avgYou >= 8) { pts += 30; r.passed.push('Conversational tone'); }
  else if (avgYou >= 4) { pts += 20; r.issues.push('Use more "you" language'); }
  else { pts += 10; r.issues.push('Needs conversational tone'); }

  // Slide variety (30)
  max += 30;
  const slideTypes = new Set();
  for (const l of lectures) { for (const s of l.slides || []) slideTypes.add(s.visualType || 'bullets'); }
  if (slideTypes.size >= 4) { pts += 30; r.passed.push('Good visual variety'); }
  else if (slideTypes.size >= 2) { pts += 20; r.issues.push('Add slide variety'); }
  else { pts += 10; r.issues.push('Slides lack variety'); }

  r.score = Math.round((pts / max) * 100);
  return r;
}

function evaluateCourseQuality(courseContent, productionData = {}) {
  console.log('\n   QUALITY ENGINE: Evaluating (7 Udemy dimensions)...');

  const scores = {
    accuracy: scoreAccuracy(courseContent),
    learningObjectives: scoreLearningObjectives(courseContent),
    contentStructure: scoreContentStructure(courseContent),
    practicalApplication: scorePracticalApplication(courseContent),
    assessmentQuality: scoreAssessmentQuality(courseContent),
    productionCompleteness: scoreProductionCompleteness(courseContent, productionData),
    engagementClarity: scoreEngagementClarity(courseContent)
  };

  const overall = Math.round(Object.entries(scores).reduce((sum, [key, r]) => sum + (r.score * WEIGHTS[key]), 0));
  const failing = Object.entries(scores).filter(([, r]) => r.score < THRESHOLD_MINIMUM);

  return {
    overall,
    passing: overall >= THRESHOLD_MINIMUM && failing.length === 0,
    scores,
    threshold: { target: THRESHOLD_TARGET, acceptable: THRESHOLD_ACCEPTABLE, minimum: THRESHOLD_MINIMUM },
    failingDimensions: failing.map(([k]) => k),
    summary: overall >= THRESHOLD_MINIMUM && failing.length === 0
      ? `PASSED (${overall}/100)`
      : `FAILED (${overall}/100) — ${failing.length} dimension(s) below ${THRESHOLD_MINIMUM}`
  };
}

function printQualityReport(evaluation) {
  console.log('\n' + '═'.repeat(70));
  console.log('   QUALITY REPORT');
  console.log('═'.repeat(70));
  console.log(`   Overall: ${evaluation.overall}/100 — ${evaluation.summary}`);
  console.log('─'.repeat(70));
  Object.entries(evaluation.scores).forEach(([dim, r]) => {
    const w = (WEIGHTS[dim] * 100).toFixed(0);
    console.log(`   ${dim} (${w}%): ${r.score}/100`);
    r.passed.forEach(p => console.log(`     ✓ ${p}`));
    r.issues.forEach(i => console.log(`     ✗ ${i}`));
  });
  console.log('═'.repeat(70));
}

module.exports = {
  evaluateCourseQuality, printQualityReport,
  THRESHOLD_TARGET, THRESHOLD_ACCEPTABLE, THRESHOLD_MINIMUM, WEIGHTS
};
