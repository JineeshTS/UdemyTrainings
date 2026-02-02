/**
 * Re-render course videos with improved 4K slides
 * Usage: node reRenderCourse.js <course-dir>
 * Example: node reRenderCourse.js course-1-gen-ai-for-complete-beginners
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const RENDERER = require('../apollo/renderer');

async function reRender(courseDirName) {
  const baseDir = path.join(__dirname, '../../data/courses');
  const courseDir = path.join(baseDir, courseDirName);

  if (!fs.existsSync(courseDir)) {
    console.error(`Course dir not found: ${courseDir}`);
    process.exit(1);
  }

  const contentPath = path.join(courseDir, 'content.json');
  if (!fs.existsSync(contentPath)) {
    console.error('No content.json found');
    process.exit(1);
  }

  const content = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
  console.log(`Re-rendering: ${content.metadata?.title || courseDirName}`);

  // Collect existing audio files
  const audioDir = path.join(courseDir, 'audio');
  const audioFiles = [];
  let idx = 1;
  for (const section of content.sections || []) {
    for (const lecture of section.lectures || []) {
      const audioPath = path.join(audioDir, `lecture-${String(idx).padStart(2, '0')}.mp3`);
      if (fs.existsSync(audioPath)) {
        audioFiles.push({ lectureIndex: idx, audioPath });
      } else {
        audioFiles.push({ lectureIndex: idx, audioPath: null });
      }
      idx++;
    }
  }

  console.log(`Found ${audioFiles.filter(a => a.audioPath).length} audio files`);

  // Remove old videos
  const videosDir = path.join(courseDir, 'videos');
  if (fs.existsSync(videosDir)) {
    fs.rmSync(videosDir, { recursive: true, force: true });
  }

  const result = await RENDERER.renderCourseVideos(content, courseDir, {
    audioFiles,
    method: 'ffmpeg'
  });

  console.log(`\nDone: ${result.successfulRenders}/${result.totalLectures} videos rendered`);

  // Verify durations
  const { execSync } = require('child_process');
  for (const vf of result.videoFiles || []) {
    try {
      const dur = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${vf.videoPath}"`, { encoding: 'utf-8' }).trim();
      console.log(`  ${path.basename(vf.videoPath)}: ${parseFloat(dur).toFixed(1)}s`);
    } catch {}
  }
}

const courseName = process.argv[2] || 'course-1-gen-ai-for-complete-beginners';
reRender(courseName).catch(e => { console.error('Error:', e); process.exit(1); });
