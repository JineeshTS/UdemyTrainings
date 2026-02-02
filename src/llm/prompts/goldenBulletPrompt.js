/**
 * Golden Bullet Prompt — Complete Course Generation
 *
 * Merged with the 9-section timing structure from the reference prompt.
 * Generates everything in one shot as structured JSON.
 */

function buildGoldenBulletPrompt(course) {
  const {
    title,
    category,
    subcategory,
    targetAudience,
    skillLevel,
    duration = 60,
    objectives = [],
    prerequisites = []
  } = course;

  return `You are an expert Udemy course creator with 15+ years of experience in instructional design, adult learning theory, and creating bestselling online courses. Generate a COMPLETE ${duration}-minute micro-course ready for Udemy.

CRITICAL RULES (follow strictly):
1. ACCURACY: Only include verifiable facts about established, well-documented methodologies. Never fabricate statistics, studies, company names, or historical events. If unsure about a fact, describe the general principle instead.
2. COMPLETENESS: Every script section must have substantial narration text (150 words/minute pace). Do not use placeholders like "[explain more here]" or "[add details]".
3. ENGAGEMENT: Write in second person ("you will learn..."). Start each lecture with a compelling hook (question, surprising fact, or relatable scenario). End with clear next steps.
4. PRACTICAL VALUE: Every core concept section MUST include at least 2 real-world examples, a step-by-step walkthrough, and common mistakes to avoid.
5. SLIDE QUALITY: Each slide must have 3-4 concise bullets (max 8 words each). Use variety: title, bullets, code, diagram, comparison, quote types.
6. QUIZ QUALITY: Generate exactly 15 assessment questions: 10 MCQ (4 options each), 3 True/False, 2 Scenario-based. Every question MUST have a detailed explanation (2+ sentences).
7. JSON ONLY: Return ONLY valid JSON. No markdown code fences, no text before or after the JSON object.

═══════════════════════════════════════════════════════════════
COURSE DETAILS
═══════════════════════════════════════════════════════════════

Title: "${title}"
Category: ${category}
Subcategory: ${subcategory || 'General'}
Target Audience: ${targetAudience || 'Professionals looking to upskill'}
Skill Level: ${skillLevel || 'Beginner to Intermediate'}
Duration: ${duration} minutes
${objectives.length > 0 ? `Objectives: ${objectives.join(', ')}` : ''}
${prerequisites.length > 0 ? `Prerequisites: ${prerequisites.join(', ')}` : ''}

═══════════════════════════════════════════════════════════════
9-SECTION TIMING STRUCTURE (follow exactly)
═══════════════════════════════════════════════════════════════

Section 1: INTRODUCTION (3 min)
  - [0:00-0:30] Hook — compelling question/statistic/scenario
  - [0:30-1:30] What You Will Learn — 3-4 clear outcomes
  - [1:30-3:00] Why This Matters — real-world relevance

Section 2: FOUNDATION (4 min)
  - [3:00-5:00] Definition & Context
  - [5:00-7:00] Brief History/Evolution

Section 3: CORE CONCEPT 1 (10 min)
  - [7:00-9:00] Concept Explanation
  - [9:00-12:00] Step-by-Step Breakdown
  - [12:00-15:00] Example 1 — real-world walkthrough
  - [15:00-17:00] Common Mistakes

Section 4: CORE CONCEPT 2 (10 min)
  - [17:00-19:00] Concept Explanation
  - [19:00-22:00] Step-by-Step Breakdown
  - [22:00-25:00] Example 2 — different context
  - [25:00-27:00] Pro Tips

Section 5: CORE CONCEPT 3 (10 min)
  - [27:00-29:00] Concept Explanation
  - [29:00-32:00] Step-by-Step Breakdown
  - [32:00-35:00] Example 3 — complex application
  - [35:00-37:00] Best Practices

Section 6: PRACTICAL APPLICATION (8 min)
  - [37:00-40:00] Complete Walkthrough
  - [40:00-43:00] Template/Framework
  - [43:00-45:00] Customization Tips

Section 7: SUMMARY & CHEAT SHEET (5 min)
  - [45:00-47:00] Key Takeaways (5-7 points)
  - [47:00-49:00] Quick Reference Review
  - [49:00-50:00] Additional Resources

Section 8: ASSESSMENT (2 min)
  - [50:00-51:00] Quiz Overview
  - [51:00-52:00] Tips for Success

Section 9: CLOSING (3 min)
  - [52:00-53:00] Congratulations
  - [53:00-54:00] Next Steps
  - [54:00-55:00] Call to Action

═══════════════════════════════════════════════════════════════
JSON SCHEMA (return exactly this structure)
═══════════════════════════════════════════════════════════════

{
  "metadata": {
    "title": "Course title (max 60 chars)",
    "subtitle": "Subtitle (max 120 chars, benefit-focused)",
    "description": "Full description (2000+ chars, SEO optimized, must include AI disclosure statement)",
    "objectives": ["4-6 items starting with action verbs"],
    "prerequisites": ["2-3 items"],
    "targetAudience": ["3-4 specific professional roles"],
    "keywords": ["10 SEO keywords"],
    "category": "${category}",
    "level": "${skillLevel || 'Beginner'}"
  },

  "sections": [
    {
      "sectionNumber": 1,
      "title": "Section title",
      "objective": "What students achieve",
      "lectures": [
        {
          "lectureNumber": 1,
          "title": "Lecture title",
          "duration": 8,
          "type": "video",
          "learningObjective": "Specific outcome",
          "script": {
            "opening": "Hook/intro (30 seconds, ~75 words)",
            "mainContent": [
              {
                "timestamp": "0:30",
                "topic": "Topic heading",
                "content": "Detailed narration (~150 words/minute)",
                "visualCue": "What to show on screen"
              }
            ],
            "summary": "Key takeaways (30 seconds)",
            "callToAction": "What to do next"
          },
          "slides": [
            {
              "slideNumber": 1,
              "title": "Slide title",
              "content": ["Bullet 1 (max 8 words)", "Bullet 2", "Bullet 3"],
              "speakerNotes": "What to say while showing this slide",
              "visualType": "title|bullets|image|diagram|code|comparison|quote"
            }
          ]
        }
      ],
      "quiz": {
        "title": "Section Quiz",
        "questions": [
          {
            "question": "Question text",
            "type": "mcq",
            "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
            "correctAnswer": "A",
            "explanation": "Why this is correct",
            "difficulty": "easy"
          }
        ]
      }
    }
  ],

  "assessment": {
    "finalQuiz": {
      "title": "Final Assessment",
      "passingScore": 70,
      "questions": [
        {
          "questionNumber": 1,
          "question": "Question text",
          "type": "mcq|truefalse|scenario",
          "options": ["A)", "B)", "C)", "D)"],
          "correctAnswer": "A",
          "explanation": "Detailed explanation",
          "difficulty": "easy|medium|hard",
          "conceptTested": "Which concept"
        }
      ]
    },
    "practicalAssignment": {
      "title": "Course Project",
      "description": "Hands-on assignment",
      "requirements": ["Requirement 1"],
      "deliverables": ["What to submit"],
      "evaluationCriteria": ["How assessed"]
    }
  },

  "cheatSheet": {
    "title": "Quick Reference Guide",
    "sections": [
      { "heading": "Key Definitions", "items": ["Term: Definition"] },
      { "heading": "Core Concept 1 Summary", "items": ["Key point"] },
      { "heading": "Core Concept 2 Summary", "items": ["Key point"] },
      { "heading": "Core Concept 3 Summary", "items": ["Key point"] }
    ],
    "doList": ["Best practice 1"],
    "dontList": ["Common mistake 1"],
    "checklist": ["Step 1: Action"],
    "tips": ["Pro tip 1"]
  },

  "thumbnailSuggestions": [
    {
      "concept": "Visual concept",
      "text": "3-4 words max",
      "colors": ["#primary", "#accent"],
      "style": "professional|creative|bold|minimal"
    }
  ],

  "promotionalContent": {
    "promoVideo": {
      "script": "2-minute promo script",
      "keyPoints": ["Highlight 1", "Highlight 2"]
    },
    "welcomeMessage": "Welcome message for students"
  }
}

═══════════════════════════════════════════════════════════════
QUALITY REQUIREMENTS
═══════════════════════════════════════════════════════════════

1. SCRIPTS: Conversational, ~150 words/minute, ~9000 words total, use "you" language
2. SLIDES: 30 total, max 4 bullets/slide, max 8 words/bullet, visual variety
3. QUIZZES: 15 questions total — 10 MCQ, 3 True/False, 2 Scenario — with explanations
4. CONTENT: Real-world examples in every section, actionable takeaways
5. AI DISCLOSURE: Include in description: "This course was created with AI assistance"
6. ACCURACY: Only verifiable facts about established methodologies

Return ONLY valid JSON.`;
}

function buildLectureRegenerationPrompt(lecture, feedback) {
  return `Regenerate this lecture based on quality feedback. Return ONLY valid JSON.

ORIGINAL LECTURE:
${JSON.stringify(lecture, null, 2)}

QUALITY FEEDBACK:
${feedback}

Fix all issues. Maintain structure. Keep duration consistent. Improve engagement.`;
}

function buildQuizPrompt(sectionContent, questionCount = 5) {
  return `Generate ${questionCount} quiz questions for this section. Return ONLY valid JSON.

SECTION:
${JSON.stringify(sectionContent, null, 2)}

Return: { "questions": [{ "question": "...", "type": "mcq|truefalse", "options": ["A)","B)","C)","D)"], "correctAnswer": "A", "explanation": "...", "difficulty": "easy|medium|hard" }] }`;
}

module.exports = {
  buildGoldenBulletPrompt,
  buildLectureRegenerationPrompt,
  buildQuizPrompt
};
