/**
 * SCRIPTWRITER — Course Content Generation via Gemini
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { generateWithGoldenBullet } = require('../llm');
const { buildGoldenBulletPrompt } = require('../llm/prompts/goldenBulletPrompt');

async function generateCourse(course, options = {}) {
  const { maxRetries = 3, outputDir = null } = options;

  console.log('\n   SCRIPTWRITER: Generating course content...');
  console.log(`   Course: ${course.title}`);

  let bestContent = null;
  let attempts = 0;

  while (!bestContent && attempts < maxRetries) {
    attempts++;
    console.log(`   Attempt ${attempts}/${maxRetries}...`);

    try {
      const prompt = buildGoldenBulletPrompt(course);
      const result = await generateWithGoldenBullet(prompt);

      if (result.parsedContent) {
        bestContent = result.parsedContent;
        bestContent._meta = {
          courseId: course.id,
          generatedAt: new Date().toISOString(),
          provider: result.provider,
          attempts
        };

        if (!validateCourseStructure(bestContent)) {
          console.log('   Invalid structure, retrying...');
          bestContent = null;
          continue;
        }
        console.log('   Content generated successfully');
      } else {
        console.log('   Failed to parse JSON response');
      }
    } catch (error) {
      console.error(`   Generation error: ${error.message}`);
    }
  }

  if (!bestContent) {
    throw new Error('Failed to generate course content after all retries');
  }

  if (outputDir) {
    await saveCourseContent(bestContent, outputDir);
  }

  return bestContent;
}

function validateCourseStructure(content) {
  if (!content.metadata?.title) { console.log('   Missing: metadata.title'); return false; }
  if (!content.sections || content.sections.length === 0) { console.log('   Missing: sections'); return false; }
  const totalLectures = content.sections.reduce((sum, s) => sum + (s.lectures?.length || 0), 0);
  if (totalLectures < 5) { console.log(`   Too few lectures: ${totalLectures}`); return false; }
  return true;
}

async function saveCourseContent(content, outputDir) {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const contentPath = path.join(outputDir, 'content.json');
  fs.writeFileSync(contentPath, JSON.stringify(content, null, 2));
  console.log(`   Saved content.json to ${outputDir}`);
}

function extractScriptText(lecture) {
  if (!lecture.script) return '';
  const parts = [];
  if (lecture.script.opening) parts.push(lecture.script.opening);
  if (lecture.script.mainContent) {
    for (const section of lecture.script.mainContent) {
      if (section.content) parts.push(section.content);
    }
  }
  if (lecture.script.summary) parts.push(lecture.script.summary);
  if (lecture.script.callToAction) parts.push(lecture.script.callToAction);
  return parts.join('\n\n');
}

function calculateDuration(text) {
  const wordCount = text.split(/\s+/).filter(w => w).length;
  return { wordCount, estimatedMinutes: Math.round((wordCount / 150) * 10) / 10 };
}

if (require.main === module) {
  const testCourse = { id: 'test-001', title: 'Introduction to Process Improvement', category: 'Process Analysis', subcategory: 'Basics', targetAudience: 'Business professionals', skillLevel: 'Beginner', duration: 60, objectives: ['Understand fundamentals'], prerequisites: [] };
  generateCourse(testCourse).then(c => {
    console.log(`\n   Generated: ${c.metadata?.title} — ${c.sections?.length} sections`);
  }).catch(e => { console.error('Error:', e.message); process.exit(1); });
}

module.exports = {
  generateCourse, extractScriptText, calculateDuration,
  saveCourseContent, validateCourseStructure
};
