/**
 * RENDERER — Video Compilation via Remotion or FFmpeg
 *
 * Renders animated slides + audio → MP4 per lecture.
 * Primary: Remotion (animated React components)
 * Fallback: FFmpeg (static slideshow)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VIDEO_CONFIG = {
  width: 1920,
  height: 1080,
  fps: 30,
  codec: 'libx264',
  audioCodec: 'aac',
  audioBitrate: '192k',
  crf: 18,
  preset: 'medium'
};

/**
 * Render video for a lecture using Remotion
 */
async function renderWithRemotion(slideJson, audioPath, outputPath) {
  const remotionRoot = path.join(__dirname, '../remotion/Root.tsx');
  if (!fs.existsSync(remotionRoot)) {
    throw new Error('Remotion Root.tsx not found');
  }

  const propsPath = outputPath.replace('.mp4', '-props.json');
  fs.writeFileSync(propsPath, JSON.stringify({
    slideData: slideJson,
    audioPath: audioPath || '',
    fps: VIDEO_CONFIG.fps,
    width: VIDEO_CONFIG.width,
    height: VIDEO_CONFIG.height
  }, null, 2));

  try {
    execSync([
      'npx', 'remotion', 'render',
      remotionRoot, 'CourseSlides', outputPath,
      '--props', propsPath,
      '--codec', 'h264',
      '--crf', VIDEO_CONFIG.crf.toString()
    ].join(' '), { cwd: path.join(__dirname, '../..'), stdio: 'pipe', timeout: 300000 });

    return { success: true, outputPath, method: 'remotion' };
  } finally {
    if (fs.existsSync(propsPath)) fs.unlinkSync(propsPath);
  }
}

/**
 * Render video with FFmpeg (fallback — static slides)
 */
async function renderWithFFmpeg(slides, audioPath, outputPath) {
  try { execSync('ffmpeg -version', { stdio: 'pipe' }); } catch {
    throw new Error('FFmpeg not found');
  }

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Create slide images from text using sharp
  const tempDir = path.join(dir, '_temp_slides');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const slideFiles = [];
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const imgPath = path.join(tempDir, `slide-${String(i + 1).padStart(3, '0')}.png`);
    await createSlideImage(slide, imgPath);
    slideFiles.push(imgPath);
  }

  // Create concat file
  const audioDuration = audioPath && fs.existsSync(audioPath) ? getAudioDuration(audioPath) : 60;
  const perSlide = audioDuration / slideFiles.length;
  const listFile = path.join(tempDir, 'slides.txt');
  const content = slideFiles.map(f => `file '${f}'\nduration ${perSlide}`).join('\n') + `\nfile '${slideFiles[slideFiles.length - 1]}'`;
  fs.writeFileSync(listFile, content);

  // Create video from slides
  const tempVideo = outputPath.replace('.mp4', '-temp.mp4');
  execSync(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -vsync vfr -pix_fmt yuv420p -c:v ${VIDEO_CONFIG.codec} -crf ${VIDEO_CONFIG.crf} "${tempVideo}"`, { stdio: 'pipe' });

  // Add audio
  if (audioPath && fs.existsSync(audioPath)) {
    execSync(`ffmpeg -y -i "${tempVideo}" -i "${audioPath}" -c:v copy -c:a ${VIDEO_CONFIG.audioCodec} -b:a ${VIDEO_CONFIG.audioBitrate} -shortest "${outputPath}"`, { stdio: 'pipe' });
    fs.unlinkSync(tempVideo);
  } else {
    fs.renameSync(tempVideo, outputPath);
  }

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });

  return { success: true, outputPath, method: 'ffmpeg' };
}

async function createSlideImage(slide, outputPath) {
  const title = escapeXml(slide.title || '').substring(0, 60);
  const bullets = (slide.content || []).slice(0, 6).map(b => escapeXml(b).substring(0, 80));
  const bulletsSvg = bullets.map((b, i) => `<text x="120" y="${380 + i * 70}" font-family="Arial" font-size="36" fill="#333333">• ${b}</text>`).join('\n');

  const svg = `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#FFFFFF"/>
    <rect x="0" y="0" width="1920" height="200" fill="#1a1a2e"/>
    <text x="100" y="130" font-family="Arial" font-size="52" font-weight="bold" fill="white">${title}</text>
    ${bulletsSvg}
  </svg>`;

  await require('sharp')(Buffer.from(svg)).png().toFile(outputPath);
}

function escapeXml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getAudioDuration(audioPath) {
  try {
    const result = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return parseFloat(result.trim());
  } catch { return 60; }
}

/**
 * Render all lecture videos for a course
 */
async function renderCourseVideos(courseContent, outputDir, options = {}) {
  const { audioFiles = [], method = 'ffmpeg' } = options;

  console.log('\n   RENDERER: Rendering course videos...');

  const videosDir = path.join(outputDir, 'videos');
  if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });

  const results = { totalLectures: 0, successfulRenders: 0, failedRenders: 0, videoFiles: [] };
  let lectureIndex = 1;

  for (const section of courseContent.sections || []) {
    for (const lecture of section.lectures || []) {
      results.totalLectures++;
      const slides = lecture.slides || [];
      if (slides.length === 0) {
        console.log(`   Skip lecture ${lectureIndex}: no slides`);
        results.failedRenders++;
        lectureIndex++;
        continue;
      }

      const audioPath = audioFiles[lectureIndex - 1]?.audioPath || null;
      const outputPath = path.join(videosDir, `lecture-${String(lectureIndex).padStart(2, '0')}.mp4`);

      try {
        let result;
        if (method === 'remotion') {
          result = await renderWithRemotion(slides, audioPath, outputPath);
        } else {
          result = await renderWithFFmpeg(slides, audioPath, outputPath);
        }

        if (result.success) {
          results.successfulRenders++;
          results.videoFiles.push({ lectureIndex, lectureTitle: lecture.title, videoPath: outputPath });
        } else {
          results.failedRenders++;
        }
      } catch (error) {
        console.error(`   Render error lecture ${lectureIndex}: ${error.message}`);
        results.failedRenders++;
      }

      lectureIndex++;
    }
  }

  console.log(`   Rendered: ${results.successfulRenders}/${results.totalLectures} lectures`);
  return results;
}

module.exports = { renderWithRemotion, renderWithFFmpeg, renderCourseVideos, VIDEO_CONFIG };
