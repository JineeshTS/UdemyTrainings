/**
 * Course Optimizer — Self-Healing Agent
 */

const { evaluateCourseQuality } = require('./qualityEngine');
const { generateCourseContent } = require('../llm');

async function analyzeCourse(courseContent, qualityEvaluation = null) {
  console.log('\n   OPTIMIZER: Analyzing...');
  if (!qualityEvaluation) qualityEvaluation = evaluateCourseQuality(courseContent);

  const issues = Object.entries(qualityEvaluation.scores)
    .filter(([, r]) => r.score < 85)
    .map(([dim, r]) => ({ dimension: dim, score: r.score, problems: r.issues || [] }));

  if (issues.length === 0) { console.log('   No issues found'); return { suggestions: [], issues: [] }; }

  return {
    courseName: courseContent.metadata?.title,
    currentScore: qualityEvaluation.overall,
    issues,
    suggestions: generateFallbackSuggestions(issues)
  };
}

function generateFallbackSuggestions(issues) {
  return issues.map(i => ({
    dimension: i.dimension,
    problem: i.problems[0] || 'Quality issue',
    fix: `Improve ${i.dimension} — address: ${i.problems.join('; ')}`,
    expectedImpact: 10,
    difficulty: 'medium',
    confidence: 0.7
  }));
}

module.exports = { analyzeCourse };
