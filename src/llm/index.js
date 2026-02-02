/**
 * LLM Provider — Gemini 2.5 Pro Only
 *
 * Uses @google/generative-ai with:
 *   - Google Search Grounding for fact-checking
 *   - Temperature = 0 for deterministic output
 *   - Structured JSON output
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = process.env.GOOGLE_API_KEY;
let genAI = null;
let model = null;

function initGemini() {
  if (!genAI && API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      generationConfig: {
        temperature: 0,
        topP: 0.95,
        maxOutputTokens: 65536,
        responseMimeType: 'application/json'
      }
    });
  }
  return model;
}

/**
 * Generate content with Gemini (JSON mode)
 */
async function generateCourseContent(prompt, options = {}) {
  const { maxRetries = 3, baseDelay = 5000 } = options;

  const m = initGemini();
  if (!m) {
    throw new Error('GOOGLE_API_KEY not set. Get one from https://aistudio.google.com/apikey');
  }

  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`   Gemini request (attempt ${attempt}/${maxRetries})...`);
      const result = await m.generateContent(prompt);
      const text = result.response.text();

      return {
        success: true,
        response: text,
        provider: 'gemini-2.5-pro',
        tokensUsed: {
          prompt: result.response.usageMetadata?.promptTokenCount || 0,
          response: result.response.usageMetadata?.candidatesTokenCount || 0,
          total: result.response.usageMetadata?.totalTokenCount || 0
        }
      };
    } catch (error) {
      lastError = error;
      console.error(`   Gemini attempt ${attempt} failed: ${error.message}`);
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`   Retrying in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  return { success: false, error: lastError?.message || 'All retries failed', provider: null };
}

/**
 * Generate with Golden Bullet Prompt — returns parsed JSON
 */
async function generateWithGoldenBullet(goldenBulletPrompt) {
  console.log('\n   Using Golden Bullet Prompt (Gemini 2.5 Pro)...');

  const result = await generateCourseContent(goldenBulletPrompt);
  if (!result.success) {
    throw new Error(`Golden Bullet generation failed: ${result.error}`);
  }

  try {
    const parsed = JSON.parse(result.response);
    return { ...result, parsedContent: parsed };
  } catch {
    // Try extracting JSON from response
    const jsonMatch = result.response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return { ...result, parsedContent: parsed };
      } catch {}
    }
    console.error('   JSON parse error, returning raw response');
    return { ...result, parsedContent: null, rawResponse: result.response };
  }
}

/**
 * Quality review using Gemini
 */
async function qualityReview(content, reviewPrompt) {
  const fullPrompt = `${reviewPrompt}\n\nContent to Review:\n${JSON.stringify(content, null, 2)}`;
  return generateCourseContent(fullPrompt);
}

module.exports = {
  generateCourseContent,
  generateWithGoldenBullet,
  qualityReview
};
