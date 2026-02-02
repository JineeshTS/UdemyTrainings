/**
 * CURRICULUM — Course Catalog Manager
 *
 * Loads 500 micro-courses from Excel, tracks status, selects next course.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { format } = require('date-fns');

const DATA_DIR = path.join(__dirname, '../../data');
const COURSES_DIR = path.join(DATA_DIR, 'courses');
const STATUS_FILE = path.join(DATA_DIR, 'status.json');
const EXCEL_PATH = path.join(DATA_DIR, 'master-plan.xlsx');

[DATA_DIR, COURSES_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

let courseStatus = {};
if (fs.existsSync(STATUS_FILE)) {
  courseStatus = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
}

function saveStatus() {
  fs.writeFileSync(STATUS_FILE, JSON.stringify(courseStatus, null, 2));
}

function parseArrayField(field) {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  try { return JSON.parse(field); } catch { return field.split(',').map(s => s.trim()).filter(Boolean); }
}

function loadCoursesFromExcel(excelPath) {
  const filePath = excelPath || EXCEL_PATH;
  if (!fs.existsSync(filePath)) {
    console.log('   Excel not found, using default catalog');
    return getDefaultCatalog();
  }

  try {
    const workbook = xlsx.readFile(filePath);
    // Use '500 Course Topics' sheet if available
    const sheetName = workbook.SheetNames.find(s => s.includes('500')) || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet);

    // The Excel has header in row 0: #, CATEGORY, COURSE TITLE, DIFFICULTY, TARGET DURATION, STATUS
    // Column keys: '500 MICRO-COURSE TOPICS FOR UDEMY', '__EMPTY', '__EMPTY_1', '__EMPTY_2', '__EMPTY_3', '__EMPTY_4'
    const keys = Object.keys(rawData[0] || {});
    const colNum = keys[0];
    const colCategory = keys[1];
    const colTitle = keys[2];
    const colDifficulty = keys[3];
    const colDuration = keys[4];

    // Skip header row (row 0 contains column names)
    const data = rawData.filter(row => typeof row[colNum] === 'number');
    console.log(`   Loaded ${data.length} courses from Excel (${sheetName})`);

    return data.map((row) => {
      const num = row[colNum];
      const id = `course-${num}`;
      return {
        id,
        title: row[colTitle] || `Course ${num}`,
        category: row[colCategory] || 'General',
        subcategory: '',
        targetAudience: 'Working professionals across all industries',
        skillLevel: row[colDifficulty] || 'Beginner',
        duration: parseInt(String(row[colDuration] || '60').replace(/[^\d]/g, '')) || 60,
        objectives: [],
        prerequisites: [],
        keywords: [],
        priority: num,
        status: courseStatus[id]?.status || 'pending'
      };
    });
  } catch (error) {
    console.error(`   Excel load error: ${error.message}`);
    return getDefaultCatalog();
  }
}

function getDefaultCatalog() {
  return [
    { id: 'ai-001', title: 'Mastering Prompt Engineering Fundamentals', category: 'Generative AI & Prompt Engineering', subcategory: 'Prompt Engineering', targetAudience: 'Business professionals, content creators, developers', skillLevel: 'Beginner', duration: 60, objectives: ['Understand prompt engineering principles', 'Write effective prompts', 'Optimize AI outputs'], prerequisites: ['Basic understanding of AI tools'], priority: 1 },
    { id: 'rca-001', title: '5 Whys Analysis: Root Cause Problem Solving', category: 'Root Cause Analysis (RCA)', subcategory: '5 Whys', targetAudience: 'Quality professionals, managers, engineers', skillLevel: 'Beginner', duration: 60, objectives: ['Apply 5 Whys methodology', 'Identify root causes', 'Prevent problem recurrence'], prerequisites: [], priority: 2 },
    { id: 'sigma-001', title: 'Six Sigma Yellow Belt Fundamentals', category: 'Six Sigma & Statistical Tools', subcategory: 'Yellow Belt', targetAudience: 'Professionals seeking Six Sigma certification', skillLevel: 'Beginner', duration: 60, objectives: ['Understand Six Sigma methodology', 'Learn DMAIC process', 'Apply basic tools'], prerequisites: [], priority: 2 },
    { id: 'lean-001', title: 'Introduction to Lean Management', category: 'Lean Methods & Tools', subcategory: 'Lean Basics', targetAudience: 'Managers, team leaders, operations professionals', skillLevel: 'Beginner', duration: 60, objectives: ['Understand Lean principles', 'Identify waste', 'Implement improvements'], prerequisites: [], priority: 3 },
    { id: 'fmea-001', title: 'FMEA Fundamentals: Failure Mode Analysis', category: 'FMEA & Risk Analysis', subcategory: 'FMEA', targetAudience: 'Engineers, quality professionals, risk managers', skillLevel: 'Intermediate', duration: 60, objectives: ['Conduct FMEA analysis', 'Identify failure modes', 'Prioritize risks'], prerequisites: ['Basic quality concepts'], priority: 3 }
  ];
}

function getNextCourse(options = {}) {
  const { category = null, skipCompleted = true } = options;
  const courses = loadCoursesFromExcel();
  let available = courses.filter(c => {
    if (skipCompleted && courseStatus[c.id]?.status === 'completed') return false;
    if (skipCompleted && courseStatus[c.id]?.status === 'in_progress') return false;
    if (category && c.category !== category) return false;
    return true;
  });
  available.sort((a, b) => (a.priority || 5) - (b.priority || 5));
  return available[0] || null;
}

function getCourseById(courseId) {
  const courses = loadCoursesFromExcel();
  // Support numeric ID (--course=1 means first course)
  const numId = parseInt(courseId);
  if (!isNaN(numId) && numId > 0) {
    return courses[numId - 1] || null;
  }
  return courses.find(c => c.id === courseId) || null;
}

function getCoursesByCategory(category) {
  return loadCoursesFromExcel().filter(c => c.category === category);
}

function updateCourseStatus(courseId, status, metadata = {}) {
  courseStatus[courseId] = { status, updatedAt: new Date().toISOString(), ...metadata };
  saveStatus();
  console.log(`   Status: ${courseId} → ${status}`);
}

function getStatistics() {
  const courses = loadCoursesFromExcel();
  const total = courses.length;
  const completed = Object.values(courseStatus).filter(s => s.status === 'completed').length;
  const inProgress = Object.values(courseStatus).filter(s => s.status === 'in_progress').length;
  const failed = Object.values(courseStatus).filter(s => s.status === 'failed').length;
  return { total, completed, inProgress, failed, pending: total - completed - inProgress - failed, completionRate: ((completed / total) * 100).toFixed(1) + '%' };
}

function createCourseDirectory(course) {
  const slug = course.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').substring(0, 50);
  const courseDir = path.join(COURSES_DIR, `${course.id}-${slug}`);
  ['audio', 'videos', 'slides'].forEach(sub => {
    const dir = path.join(courseDir, sub);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
  return courseDir;
}

// CLI
if (require.main === module) {
  console.log('\n   CURRICULUM — Course Catalog Manager\n');
  const stats = getStatistics();
  console.log(`   Total: ${stats.total} | Completed: ${stats.completed} | Pending: ${stats.pending} | Failed: ${stats.failed}`);
  const next = getNextCourse();
  if (next) console.log(`   Next: [${next.id}] ${next.title}`);
}

module.exports = {
  loadCoursesFromExcel, getNextCourse, getCourseById, getCoursesByCategory,
  updateCourseStatus, getStatistics, createCourseDirectory, getDefaultCatalog
};
