/**
 * CHEATSHEET — PDF generation via pdf-lib
 */

const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

function sanitize(text) {
  // Strip non-WinAnsi characters (keep ASCII + common Latin-1 range)
  return String(text || '').replace(/[^\x20-\x7E\xA0-\xFF]/g, '').trim();
}

async function generateCheatsheet(courseContent, outputDir) {
  console.log('\n   CHEATSHEET: Generating PDF...');

  const cheatSheet = courseContent.cheatSheet;
  if (!cheatSheet) {
    console.log('   No cheat sheet data, skipping');
    return { success: false, error: 'No cheat sheet data' };
  }

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612; // Letter
  const pageHeight = 792;
  const margin = 50;
  const lineHeight = 16;
  const contentWidth = pageWidth - 2 * margin;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Helper to add text
  function addText(rawText, options = {}) {
    const text = sanitize(rawText);
    if (!text) return;
    const { size = 10, bold = false, color = rgb(0.2, 0.2, 0.2), indent = 0 } = options;
    const f = bold ? fontBold : font;

    if (y < margin + 40) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }

    // Word wrap
    const maxWidth = contentWidth - indent;
    const words = text.split(' ');
    let line = '';

    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      const width = f.widthOfTextAtSize(test, size);
      if (width > maxWidth && line) {
        page.drawText(line, { x: margin + indent, y, size, font: f, color });
        y -= lineHeight;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) {
      page.drawText(line, { x: margin + indent, y, size, font: f, color });
      y -= lineHeight;
    }
  }

  // Title
  const title = cheatSheet.title || `${courseContent.metadata?.title || 'Course'} - Quick Reference`;
  page.drawRectangle({ x: 0, y: pageHeight - 80, width: pageWidth, height: 80, color: rgb(0.1, 0.1, 0.18) });
  page.drawText(title, { x: margin, y: pageHeight - 55, size: 20, font: fontBold, color: rgb(1, 1, 1) });
  y = pageHeight - 100;

  // Sections
  for (const section of cheatSheet.sections || []) {
    y -= 10;
    addText(section.heading || 'Section', { size: 13, bold: true, color: rgb(0.1, 0.1, 0.18) });
    y -= 4;
    for (const item of section.items || []) {
      addText(`• ${item}`, { size: 10, indent: 10 });
    }
  }

  // Do's and Don'ts
  if (cheatSheet.doList?.length || cheatSheet.dontList?.length) {
    y -= 12;
    addText("DO'S AND DON'TS", { size: 13, bold: true, color: rgb(0.1, 0.1, 0.18) });
    y -= 4;
    for (const item of cheatSheet.doList || []) {
      addText(`+ ${item}`, { size: 10, indent: 10, color: rgb(0, 0.5, 0) });
    }
    for (const item of cheatSheet.dontList || []) {
      addText(`- ${item}`, { size: 10, indent: 10, color: rgb(0.7, 0, 0) });
    }
  }

  // Checklist
  if (cheatSheet.checklist?.length) {
    y -= 12;
    addText('QUICK CHECKLIST', { size: 13, bold: true, color: rgb(0.1, 0.1, 0.18) });
    y -= 4;
    for (const item of cheatSheet.checklist) {
      addText(`[ ] ${item}`, { size: 10, indent: 10 });
    }
  }

  // Tips
  if (cheatSheet.tips?.length) {
    y -= 12;
    addText('PRO TIPS', { size: 13, bold: true, color: rgb(0.1, 0.1, 0.18) });
    y -= 4;
    for (const item of cheatSheet.tips) {
      addText(`💡 ${item}`, { size: 10, indent: 10 });
    }
  }

  // Common mistakes (legacy field)
  if (cheatSheet.commonMistakes?.length) {
    y -= 12;
    addText('COMMON MISTAKES TO AVOID', { size: 13, bold: true, color: rgb(0.1, 0.1, 0.18) });
    y -= 4;
    for (const item of cheatSheet.commonMistakes) {
      addText(`⚠ ${item}`, { size: 10, indent: 10 });
    }
  }

  const pdfBytes = await pdfDoc.save();
  const outputPath = path.join(outputDir, 'cheatsheet.pdf');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, pdfBytes);

  console.log(`   Cheatsheet: ${outputPath}`);
  return { success: true, outputPath };
}

module.exports = { generateCheatsheet };
