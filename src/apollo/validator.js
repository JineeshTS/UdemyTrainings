/**
 * VALIDATOR — Quick structure validation
 */

const fs = require('fs');

function validateCourseData(content) {
  const issues = [];
  if (!content.metadata?.title) issues.push('Missing title');
  if (!content.metadata?.description || content.metadata.description.length < 200) issues.push('Description too short');
  if (!content.metadata?.objectives?.length || content.metadata.objectives.length < 3) issues.push('Need 3+ objectives');
  if (!content.sections?.length || content.sections.length < 5) issues.push(`Need 5+ sections (have ${content.sections?.length || 0})`);

  const lectures = (content.sections || []).flatMap(s => s.lectures || []);
  if (lectures.length < 5) issues.push(`Need 5+ lectures (have ${lectures.length})`);

  return { valid: issues.length === 0, issues };
}

function validateProduction(outputDir) {
  const issues = [];
  const check = (file, label) => { if (!fs.existsSync(file)) issues.push(`Missing ${label}`); };

  const path = require('path');
  check(path.join(outputDir, 'content.json'), 'content.json');
  check(path.join(outputDir, 'slides', 'course.pptx'), 'slides/course.pptx');

  return { valid: issues.length === 0, issues };
}

module.exports = { validateCourseData, validateProduction };
