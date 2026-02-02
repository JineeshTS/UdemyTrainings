/**
 * SLIDEFORGE — PPTX Generation + Thumbnail
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pptxgen = require('pptxgenjs');
const sharp = require('sharp');

const COLORS = {
  primary: '1a1a2e',
  secondary: '16213e',
  accent: 'f4a261',
  text: '333333',
  light: 'FFFFFF'
};

async function generateCoursePresentation(courseContent, outputDir, options = {}) {
  console.log('\n   SLIDEFORGE: Generating PPTX...');

  const pptx = new pptxgen();
  pptx.title = courseContent.metadata?.title || 'Course';
  pptx.author = 'UdemyCrores';
  pptx.defineLayout({ name: 'UDEMY', width: 10, height: 5.625 });
  pptx.layout = 'UDEMY';

  let totalSlides = 0;

  // Title slide
  addTitleSlide(pptx, courseContent.metadata?.title || 'Course', courseContent.metadata?.subtitle || '');
  totalSlides++;

  // Objectives slide
  if (courseContent.metadata?.objectives?.length) {
    addBulletsSlide(pptx, 'What You Will Learn', courseContent.metadata.objectives);
    totalSlides++;
  }

  // Section slides
  for (const section of courseContent.sections || []) {
    addTitleSlide(pptx, section.title, section.objective || '');
    totalSlides++;

    for (const lecture of section.lectures || []) {
      for (const slide of lecture.slides || []) {
        addContentSlide(pptx, slide);
        totalSlides++;
      }
    }
  }

  // Takeaways
  if (courseContent.cheatSheet?.tips?.length) {
    addBulletsSlide(pptx, 'Key Takeaways', courseContent.cheatSheet.tips.slice(0, 6));
    totalSlides++;
  }

  // Thank you
  addTitleSlide(pptx, 'Thank You!', 'Questions? Leave them in the Q&A section.');
  totalSlides++;

  const slidesDir = path.join(outputDir, 'slides');
  if (!fs.existsSync(slidesDir)) fs.mkdirSync(slidesDir, { recursive: true });

  const outputPath = path.join(slidesDir, 'course.pptx');
  await pptx.writeFile({ fileName: outputPath });

  console.log(`   PPTX: ${outputPath} (${totalSlides} slides)`);
  return { success: true, outputPath, totalSlides };
}

function addTitleSlide(pptx, title, subtitle) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.primary };
  slide.addText(title, { x: 0.5, y: '35%', w: '90%', h: 1.5, fontSize: 40, color: COLORS.light, align: 'center', bold: true });
  if (subtitle) {
    slide.addText(subtitle, { x: 0.5, y: '55%', w: '90%', h: 1, fontSize: 22, color: 'AAAAAA', align: 'center' });
  }
}

function addBulletsSlide(pptx, title, bullets, notes) {
  const slide = pptx.addSlide();
  slide.background = { color: 'FFFFFF' };
  slide.addText(title, { x: 0.5, y: 0.4, w: '90%', h: 0.8, fontSize: 28, color: COLORS.primary, bold: true });
  slide.addText(bullets.map(b => ({ text: b, options: { bullet: true } })), { x: 0.5, y: 1.4, w: '90%', h: 4, fontSize: 18, color: COLORS.text, valign: 'top' });
  if (notes) slide.addNotes(notes);
}

function addContentSlide(pptx, slideData) {
  const slide = pptx.addSlide();
  const type = slideData.visualType || 'bullets';

  switch (type) {
    case 'title':
      slide.background = { color: COLORS.primary };
      slide.addText(slideData.title || '', { x: 0.5, y: '40%', w: '90%', h: 1.5, fontSize: 36, color: COLORS.light, align: 'center', bold: true });
      break;
    case 'code':
      slide.background = { color: '1e1e1e' };
      slide.addText(slideData.title || '', { x: 0.5, y: 0.3, w: '90%', h: 0.5, fontSize: 22, color: 'FFFFFF', bold: true });
      slide.addText(Array.isArray(slideData.content) ? slideData.content.join('\n') : (slideData.content || ''), { x: 0.3, y: 1, w: 9.4, h: 4.3, fontSize: 14, color: '00FF00', fontFace: 'Courier New', fill: { color: '0d0d0d' }, valign: 'top' });
      break;
    case 'quote':
      slide.background = { color: COLORS.accent };
      const quoteText = Array.isArray(slideData.content) ? slideData.content.join(' ') : (slideData.content || '');
      slide.addText(`"${quoteText}"`, { x: 0.5, y: '30%', w: '90%', h: 2, fontSize: 28, color: 'FFFFFF', align: 'center', italic: true });
      break;
    default: // bullets, comparison, diagram, image
      slide.background = { color: 'FFFFFF' };
      slide.addText(slideData.title || '', { x: 0.5, y: 0.4, w: '90%', h: 0.7, fontSize: 26, color: COLORS.primary, bold: true });
      if (Array.isArray(slideData.content)) {
        slide.addText(slideData.content.map(b => ({ text: b, options: { bullet: true } })), { x: 0.5, y: 1.3, w: '90%', h: 4, fontSize: 18, color: COLORS.text, valign: 'top' });
      }
      break;
  }

  if (slideData.speakerNotes) slide.addNotes(slideData.speakerNotes);
}

async function generateThumbnail(contentOrOptions, outputDir) {
  // Support both: generateThumbnail(content, outputDir) and generateThumbnail({title, text, outputPath})
  let title, text, outputPath, width = 2048, height = 1152;
  if (outputDir) {
    title = contentOrOptions.metadata?.title || contentOrOptions.title || 'Course';
    text = contentOrOptions.metadata?.subtitle || '';
    outputPath = path.join(outputDir, 'thumbnail.jpg');
  } else {
    ({ title, text, outputPath, width = 2048, height = 1152 } = contentOrOptions);
  }
  console.log('   Generating thumbnail...');

  try {
    const safeTitle = escapeXml(title || '').substring(0, 40);
    const safeText = escapeXml(text || '').substring(0, 60);
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#${COLORS.primary};stop-opacity:1"/>
        <stop offset="100%" style="stop-color:#${COLORS.secondary};stop-opacity:1"/>
      </linearGradient></defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <text x="50%" y="40%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="80" font-weight="bold" fill="white">${safeTitle}</text>
      <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="40" fill="#AAAAAA">${safeText}</text>
    </svg>`;

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toFile(outputPath);
    console.log(`   Thumbnail: ${path.basename(outputPath)}`);
    return { success: true, outputPath };
  } catch (error) {
    console.error(`   Thumbnail error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

function escapeXml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = { generateCoursePresentation, generateThumbnail };
