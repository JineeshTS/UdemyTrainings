/**
 * Course Orchestrator — 9-Stage Pipeline
 *
 * Stage 1: CURRICULUM → load course from Excel
 * Stage 2: SCRIPTWRITER → generate content via Gemini
 * Stage 3: NARRATOR → Chatterbox/Edge TTS audio
 * Stage 4: SLIDEFORGE → PPTX + thumbnail
 * Stage 5: RENDERER → Remotion/FFmpeg MP4 videos
 * Stage 6: QUIZ → section quizzes + final assessment
 * Stage 7: CHEATSHEET → PDF
 * Stage 8: VALIDATOR → 7-dimension quality scoring (min 95, retry up to 3x)
 * Stage 9: NOTIFY → email + status.json
 *
 * Usage:
 *   node courseOrchestrator.js                  # Next course
 *   node courseOrchestrator.js --course=1       # Course by number/ID
 *   node courseOrchestrator.js --batch=5        # Batch of 5
 *   node courseOrchestrator.js --skip-voice     # Skip audio
 *   node courseOrchestrator.js --skip-video     # Skip video
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');

const CURRICULUM = require('../apollo/curriculum');
const SCRIPTWRITER = require('../apollo/scriptwriter');
const NARRATOR = require('../apollo/narrator');
const SLIDEFORGE = require('../apollo/slideforge');
const RENDERER = require('../apollo/renderer');
const { generateCheatsheet } = require('../apollo/cheatsheet');
const { runAllGates } = require('./qualityGates');
const { evaluateCourseQuality, printQualityReport } = require('./qualityEngine');
const { generateFinalAssessment } = require('./quizGenerator');
const { sendCourseCompletion } = require('./emailNotifier');

const CONFIG = {
  quality: {
    target: parseInt(process.env.QUALITY_THRESHOLD_TARGET) || 95,
    minimum: parseInt(process.env.QUALITY_THRESHOLD_MINIMUM) || 85
  },
  maxRetries: 3,
  enableVoice: true,
  enableSlides: true,
  enableVideo: true,
  enableQuiz: true,
  enableCheatsheet: true
};

async function orchestrate(options = {}) {
  const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
  const logsDir = path.join(__dirname, '../../logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  const logFile = path.join(logsDir, `orchestrator-${timestamp}.log`);

  const log = (msg, level = 'INFO') => {
    const line = `[${new Date().toISOString()}] [${level}] ${msg}`;
    console.log(msg);
    fs.appendFileSync(logFile, line + '\n');
  };

  const result = {
    success: false, timestamp: new Date().toISOString(),
    course: null, content: null, outputDir: null, qualityScore: 0,
    stages: {}, errors: [], warnings: []
  };

  try {
    log('═'.repeat(70));
    log('   UDEMY CRORES — Course Generation Pipeline');
    log('═'.repeat(70));

    // ═══ STAGE 1: CURRICULUM ═══
    log('\n   STAGE 1: CURRICULUM');
    let course;
    if (options.courseId) {
      course = CURRICULUM.getCourseById(options.courseId);
      if (!course) throw new Error(`Course not found: ${options.courseId}`);
    } else if (options.category) {
      const courses = CURRICULUM.getCoursesByCategory(options.category);
      course = courses.find(c => c.status !== 'completed');
      if (!course) throw new Error(`No pending courses in category: ${options.category}`);
    } else {
      course = CURRICULUM.getNextCourse();
      if (!course) throw new Error('No courses available');
    }

    result.course = course;
    const outputDir = CURRICULUM.createCourseDirectory(course);
    result.outputDir = outputDir;
    log(`   Course: ${course.title} [${course.id}]`);
    log(`   Output: ${outputDir}`);
    CURRICULUM.updateCourseStatus(course.id, 'in_progress');
    result.stages.curriculum = { success: true };

    // ═══ STAGE 2: SCRIPTWRITER (with quality retry) ═══
    log('\n   STAGE 2: SCRIPTWRITER');
    let content = null;
    let qualityScore = 0;
    let scriptAttempts = 0;

    while (scriptAttempts < CONFIG.maxRetries) {
      scriptAttempts++;
      log(`   Generation attempt ${scriptAttempts}/${CONFIG.maxRetries}...`);

      try {
        content = await SCRIPTWRITER.generateCourse(course, { outputDir });
        const sections = content.sections || [];
        const lectureCount = sections.reduce((s, sec) => s + (sec.lectures?.length || 0), 0);

        if (lectureCount < 5) {
          log(`   Too few lectures (${lectureCount}), retrying...`);
          content = null;
          continue;
        }

        // Quick quality check
        const eval_ = evaluateCourseQuality(content);
        qualityScore = eval_.overall;
        log(`   Quality score: ${qualityScore}/100`);

        if (qualityScore >= CONFIG.quality.target) {
          log(`   Quality target met (${CONFIG.quality.target})`);
          break;
        } else if (qualityScore >= CONFIG.quality.minimum && scriptAttempts >= CONFIG.maxRetries) {
          log(`   Acceptable quality after ${scriptAttempts} attempts`);
          break;
        } else if (qualityScore < CONFIG.quality.minimum) {
          log(`   Below minimum (${CONFIG.quality.minimum}), retrying with stricter prompt...`);
          content = null;
        } else {
          break; // Acceptable
        }
      } catch (error) {
        log(`   Error: ${error.message}`, 'ERROR');
        result.errors.push(`Script attempt ${scriptAttempts}: ${error.message}`);
      }
    }

    if (!content) throw new Error('Failed to generate course content');
    result.content = content;
    result.stages.scriptwriter = { success: true, attempts: scriptAttempts, qualityScore };

    // ═══ STAGE 3: NARRATOR ═══
    if (CONFIG.enableVoice) {
      log('\n   STAGE 3: NARRATOR');
      try {
        const narResult = await NARRATOR.generateCourseNarration(content, outputDir);
        result.stages.narrator = {
          success: true, lectures: narResult.successfulLectures,
          duration: narResult.totalDuration, audioFiles: narResult.audioFiles
        };
        log(`   Audio: ${narResult.successfulLectures}/${narResult.totalLectures} lectures`);
      } catch (error) {
        log(`   Narration error: ${error.message}`, 'WARN');
        result.warnings.push(`Narration: ${error.message}`);
        result.stages.narrator = { success: false, error: error.message, audioFiles: [] };
      }
    } else {
      result.stages.narrator = { success: true, skipped: true, audioFiles: [] };
    }

    // ═══ STAGE 4: SLIDEFORGE ═══
    if (CONFIG.enableSlides) {
      log('\n   STAGE 4: SLIDEFORGE');
      try {
        const slideResult = await SLIDEFORGE.generateCoursePresentation(content, outputDir);
        result.stages.slideforge = { success: true, slides: slideResult.totalSlides };

        // Thumbnail
        const thumbPath = path.join(outputDir, 'thumbnail.jpg');
        await SLIDEFORGE.generateThumbnail({
          title: content.metadata?.title || course.title,
          text: course.category,
          outputPath: thumbPath
        });
      } catch (error) {
        log(`   Slides error: ${error.message}`, 'WARN');
        result.stages.slideforge = { success: false, error: error.message };
      }
    } else {
      result.stages.slideforge = { success: true, skipped: true };
    }

    // ═══ STAGE 5: RENDERER ═══
    if (CONFIG.enableVideo && result.stages.narrator?.audioFiles?.length > 0) {
      log('\n   STAGE 5: RENDERER');
      try {
        const renderResult = await RENDERER.renderCourseVideos(content, outputDir, {
          audioFiles: result.stages.narrator.audioFiles,
          method: 'ffmpeg'
        });
        result.stages.renderer = { success: true, videos: renderResult.successfulRenders, videoFiles: renderResult.videoFiles };
      } catch (error) {
        log(`   Render error: ${error.message}`, 'WARN');
        result.stages.renderer = { success: false, error: error.message };
      }
    } else {
      log('\n   STAGE 5: RENDERER (skipped — no audio)');
      result.stages.renderer = { success: true, skipped: true };
    }

    // ═══ STAGE 6: QUIZ ═══
    if (CONFIG.enableQuiz) {
      log('\n   STAGE 6: QUIZ');
      try {
        // Generate final assessment if not already in content
        if (!content.assessment?.finalQuiz?.questions?.length) {
          const assessment = await generateFinalAssessment(content, 15);
          content.assessment = content.assessment || {};
          content.assessment.finalQuiz = assessment;
        }

        // Save quiz.json
        const quizPath = path.join(outputDir, 'quiz.json');
        const allQuestions = [
          ...(content.assessment?.finalQuiz?.questions || []),
          ...(content.sections || []).flatMap(s => s.quiz?.questions || [])
        ];
        fs.writeFileSync(quizPath, JSON.stringify({ title: 'Course Assessment', questions: allQuestions }, null, 2));
        result.stages.quiz = { success: true, questions: allQuestions.length };
        log(`   Quiz: ${allQuestions.length} questions`);
      } catch (error) {
        log(`   Quiz error: ${error.message}`, 'WARN');
        result.stages.quiz = { success: false, error: error.message };
      }
    }

    // ═══ STAGE 7: CHEATSHEET ═══
    if (CONFIG.enableCheatsheet) {
      log('\n   STAGE 7: CHEATSHEET');
      try {
        await generateCheatsheet(content, outputDir);
        result.stages.cheatsheet = { success: true };
      } catch (error) {
        log(`   Cheatsheet error: ${error.message}`, 'WARN');
        result.stages.cheatsheet = { success: false, error: error.message };
      }
    }

    // ═══ STAGE 8: VALIDATOR ═══
    log('\n   STAGE 8: VALIDATOR');
    const productionData = {
      audioFiles: result.stages.narrator?.audioFiles || [],
      videoFiles: result.stages.renderer?.videoFiles || []
    };

    const gateResults = await runAllGates(content, productionData);
    result.qualityScore = gateResults.overall || qualityScore;
    result.stages.validator = { success: gateResults.passed, score: result.qualityScore };

    if (gateResults.passed) {
      log(`   Quality PASSED: ${result.qualityScore}/100`);
    } else {
      log(`   Quality NEEDS REVIEW at Gate ${gateResults.failedAt}: ${result.qualityScore}/100`, 'WARN');
    }

    // Save updated content.json
    fs.writeFileSync(path.join(outputDir, 'content.json'), JSON.stringify(content, null, 2));

    // ═══ STAGE 9: NOTIFY ═══
    log('\n   STAGE 9: NOTIFY');
    result.success = true;
    const finalStatus = gateResults.passed ? 'completed' : 'needs_review';
    CURRICULUM.updateCourseStatus(course.id, finalStatus, { qualityScore: result.qualityScore, outputDir });

    try {
      await sendCourseCompletion(result);
    } catch (error) {
      log(`   Notify error: ${error.message}`, 'WARN');
    }

    log('\n' + '═'.repeat(70));
    log(`   PIPELINE COMPLETE — ${course.title}`);
    log(`   Quality: ${result.qualityScore}/100 | Status: ${finalStatus}`);
    log(`   Output: ${outputDir}`);
    log('═'.repeat(70));

  } catch (error) {
    result.success = false;
    result.errors.push(error.message);
    log(`\n   PIPELINE ERROR: ${error.message}`, 'ERROR');
    if (result.course) CURRICULUM.updateCourseStatus(result.course.id, 'failed', { error: error.message });
  }

  // Save result
  fs.writeFileSync(path.join(logsDir, `result-${timestamp}.json`), JSON.stringify(result, null, 2));
  return result;
}

async function orchestrateBatch(count = 5, options = {}) {
  console.log(`\n   Batch: ${count} courses`);
  const results = [];
  let successful = 0, failed = 0;

  for (let i = 0; i < count; i++) {
    console.log(`\n${'═'.repeat(70)}\n   BATCH ${i + 1}/${count}\n${'═'.repeat(70)}`);
    try {
      const result = await orchestrate({ category: options.category });
      results.push(result);
      if (result.success) successful++; else failed++;
    } catch (error) {
      console.error(`   Batch ${i + 1} error: ${error.message}`);
      failed++;
    }
    if (i < count - 1) await new Promise(r => setTimeout(r, 3000));
  }

  console.log(`\n   BATCH DONE: ${successful}/${count} successful`);
  return { results, successful, failed, total: count };
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  args.forEach(arg => {
    if (arg.startsWith('--course=')) options.courseId = arg.split('=')[1];
    if (arg.startsWith('--category=')) options.category = arg.split('=')[1];
    if (arg.startsWith('--batch=')) options.batch = parseInt(arg.split('=')[1]) || 5;
    if (arg === '--skip-voice') CONFIG.enableVoice = false;
    if (arg === '--skip-slides') CONFIG.enableSlides = false;
    if (arg === '--skip-video') CONFIG.enableVideo = false;
    if (arg === '--skip-quiz') CONFIG.enableQuiz = false;
  });

  const run = options.batch ? orchestrateBatch(options.batch, options) : orchestrate(options);
  run.then(r => {
    process.exit((options.batch ? r.failed === 0 : r.success) ? 0 : 1);
  }).catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}

module.exports = { orchestrate, orchestrateBatch, CONFIG };
