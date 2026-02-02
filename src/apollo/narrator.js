/**
 * NARRATOR — Voice Generation via Chatterbox (Colab) + Edge TTS fallback
 *
 * Primary: Chatterbox TTS Server (user's cloned voice via ngrok)
 * Fallback: Edge TTS (free Microsoft TTS, no clone)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const CHATTERBOX_URL = process.env.CHATTERBOX_API_URL || 'http://localhost:8000';
const VOICE_REF = path.join(__dirname, '../../data/voice-reference.wav');

/**
 * Check if Chatterbox server is available
 */
async function isChatterboxAvailable() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${CHATTERBOX_URL}/health`, { signal: controller.signal, headers: { 'ngrok-skip-browser-warning': 'true' } });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Split text into chunks of ~400 words at sentence boundaries
 */
function splitTextIntoChunks(text, maxWords = 250) {
  const sentences = text.replace(/\n\n/g, '. ').split(/(?<=[.!?])\s+/);
  const chunks = [];
  let current = [];
  let wordCount = 0;

  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).length;
    if (wordCount + words > maxWords && current.length > 0) {
      chunks.push(current.join(' '));
      current = [sentence];
      wordCount = words;
    } else {
      current.push(sentence);
      wordCount += words;
    }
  }
  if (current.length > 0) chunks.push(current.join(' '));
  return chunks;
}

/**
 * Generate narration via Chatterbox (OpenAI-compatible API)
 * Splits long text into chunks and concatenates audio
 */
async function generateWithChatterbox(text, outputPath) {
  const { execSync } = require('child_process');
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const chunks = splitTextIntoChunks(text);
  const wavParts = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`     Chunk ${i + 1}/${chunks.length} (${chunks[i].split(/\s+/).length} words)...`);
    const res = await fetch(`${CHATTERBOX_URL}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({
        model: 'chatterbox',
        input: chunks[i],
        voice: 'reference',
        response_format: 'wav',
        exaggeration: 0.3,
        cfg: 5.0
      })
    });

    if (!res.ok) throw new Error(`Chatterbox: ${res.status} ${res.statusText}`);

    const buffer = Buffer.from(await res.arrayBuffer());
    const partPath = outputPath.replace('.mp3', `-part${i}.wav`);
    fs.writeFileSync(partPath, buffer);
    wavParts.push(partPath);
    // Wait between chunks to avoid GPU overload
    if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 2000));
  }

  // Concatenate WAV parts and convert to MP3
  const wavPath = outputPath.replace('.mp3', '.wav');
  if (wavParts.length === 1) {
    fs.renameSync(wavParts[0], wavPath);
  } else {
    // First normalize all WAV parts to same format (16kHz mono 16-bit) for reliable concat
    const normalizedParts = [];
    for (let j = 0; j < wavParts.length; j++) {
      const normPath = wavParts[j].replace('.wav', '-norm.wav');
      try {
        execSync(`ffmpeg -y -i "${wavParts[j]}" -ar 22050 -ac 1 -sample_fmt s16 "${normPath}"`, { stdio: 'pipe' });
        normalizedParts.push(normPath);
      } catch (e) {
        console.error(`     Failed to normalize chunk ${j}: ${e.message}`);
        normalizedParts.push(wavParts[j]); // Use original as fallback
      }
    }

    const listFile = outputPath.replace('.mp3', '-list.txt');
    fs.writeFileSync(listFile, normalizedParts.map(p => `file '${path.resolve(p)}'`).join('\n'));
    try {
      execSync(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${wavPath}"`, { stdio: 'pipe' });
      const duration = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${wavPath}"`, { encoding: 'utf-8' }).trim());
      console.log(`     Concatenated ${normalizedParts.length} chunks → ${duration.toFixed(1)}s`);
    } catch (e) {
      console.error(`     Concat failed: ${e.message}, using first chunk only`);
      fs.copyFileSync(normalizedParts[0], wavPath);
    }
    try { fs.unlinkSync(listFile); } catch {}
    for (const p of [...wavParts, ...normalizedParts]) { try { fs.unlinkSync(p); } catch {} }
  }

  try {
    execSync(`ffmpeg -y -i "${wavPath}" -codec:a libmp3lame -b:a 192k "${outputPath}"`, { stdio: 'pipe' });
    const mp3Duration = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`, { encoding: 'utf-8' }).trim());
    console.log(`     Final audio: ${mp3Duration.toFixed(1)}s`);
    fs.unlinkSync(wavPath);
  } catch {
    fs.renameSync(wavPath, outputPath);
  }

  const stats = fs.statSync(outputPath);
  return { success: true, audioPath: outputPath, fileSize: stats.size, method: 'chatterbox' };
}

/**
 * Generate narration via Edge TTS (fallback — free, no voice clone)
 */
async function generateWithEdgeTTS(text, outputPath) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  try {
    // Use the edge-tts npm package
    const { ttsSave } = await import('edge-tts');
    await ttsSave(text, outputPath, { voice: 'en-US-GuyNeural' });

    const stats = fs.statSync(outputPath);
    return { success: true, audioPath: outputPath, fileSize: stats.size, method: 'edge-tts' };
  } catch (error) {
    throw new Error(`Edge TTS failed: ${error.message}`);
  }
}

/**
 * Generate narration for a single lecture
 */
async function generateNarration(options) {
  const { text, outputPath } = options;

  if (!text || text.length < 50) {
    return { success: false, error: 'Text too short' };
  }

  console.log(`   NARRATOR: Generating audio (~${estimateAudioDuration(text)} min)...`);

  const chatterboxReady = await isChatterboxAvailable();

  try {
    if (chatterboxReady) {
      return await generateWithChatterbox(text, outputPath);
    } else {
      console.log('   Chatterbox unavailable, using Edge TTS');
      return await generateWithEdgeTTS(text, outputPath);
    }
  } catch (error) {
    console.error(`   Primary TTS failed: ${error.message}`);
    if (chatterboxReady) {
      try {
        console.log('   Trying Edge TTS fallback...');
        return await generateWithEdgeTTS(text, outputPath);
      } catch (e2) {
        return { success: false, error: e2.message };
      }
    }
    return { success: false, error: error.message };
  }
}

/**
 * Generate narration for entire course
 */
async function generateCourseNarration(courseContent, outputDir, options = {}) {
  console.log('\n   NARRATOR: Generating course narration...');

  const results = {
    totalLectures: 0, successfulLectures: 0, failedLectures: 0,
    totalDuration: 0, audioFiles: []
  };

  const audioDir = path.join(outputDir, 'audio');
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

  let lectureIndex = 1;

  for (const section of courseContent.sections || []) {
    for (const lecture of section.lectures || []) {
      results.totalLectures++;
      const scriptText = extractFullScript(lecture);

      if (!scriptText || scriptText.length < 50) {
        console.log(`   Skipping lecture ${lectureIndex}: No script`);
        results.failedLectures++;
        lectureIndex++;
        continue;
      }

      const outputPath = path.join(audioDir, `lecture-${String(lectureIndex).padStart(2, '0')}.mp3`);

      try {
        const result = await generateNarration({ text: scriptText, outputPath });
        if (result.success) {
          const duration = estimateAudioDurationSecs(scriptText);
          results.successfulLectures++;
          results.totalDuration += duration;
          results.audioFiles.push({
            lectureIndex, lectureTitle: lecture.title,
            audioPath: outputPath, duration, method: result.method
          });
        } else {
          results.failedLectures++;
        }
      } catch (error) {
        console.error(`   Error lecture ${lectureIndex}: ${error.message}`);
        results.failedLectures++;
      }

      lectureIndex++;
      // Wait between lectures to let GPU cool down
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  console.log(`\n   Narration: ${results.successfulLectures}/${results.totalLectures} lectures, ~${(results.totalDuration / 60).toFixed(1)} min`);
  return results;
}

function extractFullScript(lecture) {
  if (!lecture.script) return '';
  const parts = [];
  if (lecture.script.opening) parts.push(lecture.script.opening);
  if (lecture.script.mainContent) {
    for (const s of lecture.script.mainContent) { if (s.content) parts.push(s.content); }
  }
  if (lecture.script.summary) parts.push(lecture.script.summary);
  if (lecture.script.callToAction) parts.push(lecture.script.callToAction);
  return parts.join('\n\n');
}

function estimateAudioDuration(text) {
  return (text.split(/\s+/).filter(w => w).length / 150).toFixed(1);
}

function estimateAudioDurationSecs(text) {
  return (text.split(/\s+/).filter(w => w).length / 150) * 60;
}

if (require.main === module) {
  console.log('\n   NARRATOR — Voice Generation Module\n');
  isChatterboxAvailable().then(ok => {
    console.log(`   Chatterbox: ${ok ? 'Available' : 'Unavailable'}`);
    console.log(`   Voice reference: ${fs.existsSync(VOICE_REF) ? 'Found' : 'Not found'}`);
    console.log('   Fallback: Edge TTS (en-US-GuyNeural)');
  });
}

module.exports = {
  generateNarration, generateCourseNarration, extractFullScript,
  estimateAudioDuration, isChatterboxAvailable
};
