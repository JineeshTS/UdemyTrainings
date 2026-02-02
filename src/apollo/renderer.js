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
  width: 3840,
  height: 2160,
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
  const tempDir = path.join(dir, `_temp_slides_${Date.now()}`);
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const slideFiles = [];
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const imgPath = path.join(tempDir, `slide-${String(i + 1).padStart(3, '0')}.png`);
    await createSlideImage(slide, imgPath, {
      courseTitle: slides._courseTitle || '',
      slideNum: i + 1,
      totalSlides: slides.length
    });
    slideFiles.push(imgPath);
  }

  // Create concat file
  const audioDuration = audioPath && fs.existsSync(audioPath) ? getAudioDuration(audioPath) : 60;
  const perSlide = audioDuration / slideFiles.length;
  const listFile = path.resolve(path.join(tempDir, 'slides.txt'));
  const content = slideFiles.map(f => `file '${path.resolve(f)}'\nduration ${perSlide}`).join('\n') + `\nfile '${path.resolve(slideFiles[slideFiles.length - 1])}'`;
  fs.writeFileSync(listFile, content);

  // Create video from slides
  const tempVideo = outputPath.replace('.mp4', '-temp.mp4');
  execSync(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -vsync vfr -pix_fmt yuv420p -s ${VIDEO_CONFIG.width}x${VIDEO_CONFIG.height} -c:v ${VIDEO_CONFIG.codec} -crf ${VIDEO_CONFIG.crf} "${tempVideo}"`, { stdio: 'pipe' });

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

async function createSlideImage(slide, outputPath, meta = {}) {
  const W = 3840, H = 2160;
  const title = escapeXml(slide.title || '').substring(0, 70);
  const bullets = (slide.content || []).slice(0, 7).map(b => escapeXml(b).substring(0, 100));
  const courseTitle = escapeXml(meta.courseTitle || '');
  const slideNum = meta.slideNum || '';
  const totalSlides = meta.totalSlides || '';

  // Decorative background circles (abstract geometry)
  const decoCircles = [
    `<circle cx="3400" cy="400" r="500" fill="#7c3aed" opacity="0.07"/>`,
    `<circle cx="3600" cy="1800" r="350" fill="#2563eb" opacity="0.06"/>`,
    `<circle cx="300" cy="1900" r="400" fill="#7c3aed" opacity="0.05"/>`,
    `<circle cx="1920" cy="1080" r="700" fill="#1e40af" opacity="0.03"/>`,
  ].join('\n');

  // Bullet items with glass-style cards
  const bulletsSvg = bullets.map((b, i) => {
    const y = 700 + i * 170;
    return `
      <rect x="200" y="${y - 55}" width="3440" height="130" rx="20" fill="#ffffff" opacity="0.05"/>
      <rect x="200" y="${y - 55}" width="6" height="130" rx="3" fill="#a78bfa"/>
      <circle cx="260" cy="${y + 10}" r="12" fill="#8b5cf6"/>
      <text x="310" y="${y + 20}" font-family="Segoe UI, Helvetica, Arial" font-size="58" fill="#ddd6fe">${b}</text>`;
  }).join('\n');

  // Progress bar at bottom based on slide position
  const progressWidth = totalSlides ? Math.round((slideNum / totalSlides) * W) : 0;

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0%" stop-color="#0f0c29"/>
        <stop offset="40%" stop-color="#1a1145"/>
        <stop offset="100%" stop-color="#120e2e"/>
      </linearGradient>
      <linearGradient id="headerGrad" x1="0" y1="0" x2="1" y2="0.5">
        <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#1e40af" stop-opacity="0.15"/>
      </linearGradient>
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#8b5cf6"/>
        <stop offset="100%" stop-color="#3b82f6"/>
      </linearGradient>
      <linearGradient id="progressGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#7c3aed"/>
        <stop offset="100%" stop-color="#2563eb"/>
      </linearGradient>
    </defs>

    <!-- Background -->
    <rect width="100%" height="100%" fill="url(#bg)"/>
    ${decoCircles}

    <!-- Header zone -->
    <rect x="0" y="0" width="${W}" height="500" fill="url(#headerGrad)"/>
    <rect x="0" y="490" width="${W}" height="2" fill="#8b5cf6" opacity="0.3"/>

    <!-- Accent bar under title -->
    <rect x="200" y="420" width="320" height="8" rx="4" fill="url(#accent)"/>

    <!-- Title -->
    <text x="200" y="340" font-family="Segoe UI, Helvetica, Arial" font-size="96" font-weight="bold" fill="#ffffff" letter-spacing="-1">${title}</text>

    <!-- Slide number badge -->
    ${slideNum ? `
    <rect x="${W - 320}" y="60" width="220" height="80" rx="40" fill="#ffffff" opacity="0.08"/>
    <text x="${W - 210}" y="115" font-family="Segoe UI, Helvetica, Arial" font-size="40" fill="#a5b4fc" text-anchor="middle">${slideNum} / ${totalSlides}</text>
    ` : ''}

    <!-- Bullet content -->
    ${bulletsSvg}

    <!-- Footer -->
    <rect x="0" y="${H - 100}" width="${W}" height="100" fill="#0a0820" opacity="0.6"/>
    ${courseTitle ? `<text x="200" y="${H - 42}" font-family="Segoe UI, Helvetica, Arial" font-size="38" fill="#6366a0">${courseTitle}</text>` : ''}

    <!-- Progress bar -->
    <rect x="0" y="${H - 8}" width="${W}" height="8" fill="#1e1b4b"/>
    ${progressWidth > 0 ? `<rect x="0" y="${H - 8}" width="${progressWidth}" height="8" fill="url(#progressGrad)"/>` : ''}
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
      slides._courseTitle = courseContent.title || '';
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
