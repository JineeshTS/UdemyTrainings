/**
 * Quiz Generator — Assessment Content
 */

const { generateCourseContent } = require('../llm');
const { buildQuizPrompt } = require('../llm/prompts/goldenBulletPrompt');

async function generateSectionQuiz(section, questionCount = 5) {
  console.log(`   Quiz: ${section.title}`);
  const prompt = buildQuizPrompt(section, questionCount);

  try {
    const result = await generateCourseContent(prompt);
    if (result.success) {
      const parsed = JSON.parse(result.response);
      return { title: `${section.title} Quiz`, sectionNumber: section.sectionNumber, questions: parsed.questions || [], passingScore: 70 };
    }
  } catch {}

  return generateFallbackQuiz(section, questionCount);
}

async function generateFinalAssessment(courseContent, questionCount = 15) {
  console.log(`   Generating final assessment (${questionCount} questions)...`);
  const topics = (courseContent.sections || []).map(s => `- ${s.title}: ${(s.lectures || []).map(l => l.title).join(', ')}`);

  const prompt = `Generate a final assessment quiz. Return ONLY valid JSON.
COURSE: ${courseContent.metadata?.title || 'Course'}
TOPICS:\n${topics.join('\n')}
OBJECTIVES:\n${(courseContent.metadata?.objectives || []).join('\n')}

Generate ${questionCount} questions: 10 MCQ, 3 True/False, 2 Scenario-based.
Difficulty: 5 easy, 7 medium, 3 hard.
Include explanations for all answers.

Return: { "questions": [{ "questionNumber": 1, "question": "...", "type": "mcq|truefalse|scenario", "options": ["A)","B)","C)","D)"], "correctAnswer": "A", "explanation": "...", "difficulty": "easy|medium|hard", "conceptTested": "..." }] }`;

  try {
    const result = await generateCourseContent(prompt);
    if (result.success) {
      const parsed = JSON.parse(result.response);
      return { title: 'Final Assessment', passingScore: 70, questions: parsed.questions || [] };
    }
  } catch {}

  return generateFallbackAssessment(courseContent, questionCount);
}

function generateFallbackQuiz(section, count) {
  return {
    title: `${section.title} Quiz`,
    sectionNumber: section.sectionNumber,
    questions: Array.from({ length: count }, (_, i) => ({
      questionNumber: i + 1, question: `Key concept from "${section.title}"?`,
      options: ['A) Correct', 'B) Incorrect', 'C) Incorrect', 'D) Incorrect'],
      correctAnswer: 'A', explanation: 'Review section material.', difficulty: i < 2 ? 'easy' : 'medium'
    })),
    passingScore: 70, needsReview: true
  };
}

function generateFallbackAssessment(courseContent, count) {
  const sections = courseContent.sections || [];
  return {
    title: 'Final Assessment', passingScore: 70,
    questions: Array.from({ length: count }, (_, i) => ({
      questionNumber: i + 1, question: `Question about ${sections[i % sections.length]?.title || 'course'}`,
      options: ['A) Correct', 'B) Incorrect', 'C) Incorrect', 'D) Incorrect'],
      correctAnswer: 'A', explanation: 'Review course material.',
      difficulty: i < 5 ? 'easy' : i < 12 ? 'medium' : 'hard'
    })),
    needsReview: true
  };
}

function validateQuiz(quiz) {
  const issues = [];
  if (!quiz.questions?.length) return { valid: false, issues: ['No questions'] };
  for (const q of quiz.questions) {
    if (!q.question || q.question.length < 10) issues.push(`Q${q.questionNumber}: Too short`);
    if (!q.options || q.options.length < 2) issues.push(`Q${q.questionNumber}: Need options`);
    if (!q.correctAnswer) issues.push(`Q${q.questionNumber}: No answer`);
  }
  return { valid: issues.length === 0, issues };
}

module.exports = { generateSectionQuiz, generateFinalAssessment, validateQuiz };
