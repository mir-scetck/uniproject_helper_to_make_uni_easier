import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePercentage,
  getArabicGradeLabel,
  gradeQuizPure,
  computeAverageScore,
  filterPassingAttempts,
  extractHonorRollStudents,
  buildGradeDistribution,
} from './grading';
import {
  validateEmail,
  validateTextLength,
  validatePositiveNumber,
  validateQuestionInput,
} from './validators';
import { importQuestionsFromCsv, exportGradebookToCsv } from './csvGenerator';
import { classifyWithKnn, evaluateKnnAccuracy, trainTestSplit } from './knnModel';
import {
  getQuizzesForStudent,
  resolveOrCreateStudentFromEntry,
  validateStudentEntry,
  validateTeacherEntry,
} from './userSession';
import { SEED_QUIZZES } from '../data/seedData';
import type { Quiz, Student } from '../types';

const SAMPLE_QUIZ: Quiz = {
  id: 'q-test',
  title: 'اختبار تجريبي',
  description: 'وصف اختبار',
  subject: 'بايثون',
  teacherName: 'د/ صفاء العطوى',
  academicYear: 'الفرقة الثانية',
  durationMinutes: 15,
  createdAt: '2026-11-20',
  isActive: true,
  questions: [
    {
      id: 'q1',
      type: 'mcq',
      prompt: 'ما الدالة التي تستدعي الفئة الأب؟',
      options: ['super()', 'self()', 'init()'],
      correctAnswer: 'super()',
      points: 5,
    },
    {
      id: 'q2',
      type: 'true_false',
      prompt: 'الدالة الخالصة لا تغير الحالة الخارجية.',
      options: ['صح', 'خطأ'],
      correctAnswer: 'صح',
      points: 5,
    },
  ],
};

test('calculatePercentage throws on zero totalPoints and calculates accurately otherwise', () => {
  assert.throws(() => calculatePercentage(5, 0), /القسمة على صفر/);
  assert.equal(calculatePercentage(9, 10), 90);
  assert.equal(calculatePercentage(7, 10), 70);
});

test('getArabicGradeLabel returns correct Arabic tiers', () => {
  assert.equal(getArabicGradeLabel(95), 'ممتاز');
  assert.equal(getArabicGradeLabel(82), 'جيد جداً');
  assert.equal(getArabicGradeLabel(70), 'جيد');
  assert.equal(getArabicGradeLabel(55), 'مقبول');
  assert.equal(getArabicGradeLabel(40), 'يحتاج إلى دعم');
});

test('gradeQuizPure does not mutate inputs and computes full results', () => {
  const answers = { q1: 'super()', q2: 'صح' };
  const attempt = gradeQuizPure(
    SAMPLE_QUIZ,
    { id: 's1', name: 'أحمد علي', classroom: 'أ' },
    answers
  );
  assert.equal(attempt.score, 10);
  assert.equal(attempt.percentage, 100);
  assert.equal(attempt.passed, true);
  assert.equal(attempt.gradeLabel, 'ممتاز');

  const partial = gradeQuizPure(
    SAMPLE_QUIZ,
    { id: 's2', name: 'سارة محمد', classroom: 'ب' },
    { q1: 'super()', q2: 'خطأ' }
  );
  assert.equal(partial.score, 5);
  assert.equal(partial.percentage, 50);

  const avg = computeAverageScore([attempt, partial]);
  assert.equal(avg, 75);
  assert.equal(filterPassingAttempts([attempt, partial]).length, 2);
  assert.equal(extractHonorRollStudents([attempt, partial], 85).length, 1);
  const dist = buildGradeDistribution([attempt, partial]);
  assert.equal(dist['ممتاز'], 1);
  assert.equal(dist['مقبول'], 1);
});

test('validators reject invalid emails, short text, and out-of-range numbers', () => {
  assert.equal(validateEmail('student@damietta.edu.eg').valid, true);
  assert.equal(validateEmail('invalid-email').valid, false);
  assert.equal(validateTextLength('أب', 'العنوان', 5, 50).valid, false);
  assert.equal(validatePositiveNumber('-5', 'الدرجة', 1, 50).valid, false);
  assert.equal(validatePositiveNumber('10', 'الدرجة', 1, 50).valid, true);

  assert.equal(
    validateQuestionInput({
      type: 'mcq',
      prompt: 'سؤال صحيح حول بايثون؟',
      options: ['خيار أ', 'خيار ب'],
      correctAnswer: 'خيار ج',
      points: 2,
    }).valid,
    false
  );
});

test('CSV generator parses questions and exports UTF-8 BOM gradebook', () => {
  const csv = [
    'type,prompt,options,correct,points,ref',
    'mcq,ما الكلمة المستخدمة للمولدات؟,return|yield|pass,yield,2,ص 5',
    'true_false,تستخدم with لإغلاق الملفات تلقائياً,صح|خطأ,صح,2,ص 13',
  ].join('\n');

  const outcome = importQuestionsFromCsv(csv);
  assert.equal(outcome.errors.length, 0);
  assert.equal(outcome.questions.length, 2);
  assert.equal(outcome.questions[0].correctAnswer, 'yield');

  const attempt = gradeQuizPure(
    SAMPLE_QUIZ,
    { id: 's1', name: 'نور الهدى', classroom: 'أ' },
    { q1: 'super()', q2: 'صح' }
  );
  const exported = exportGradebookToCsv([attempt]);
  assert.ok(exported.startsWith('\uFEFF'));
  assert.ok(exported.includes('نور الهدى'));
});

test('KNN model splits data and classifies support-needed students accurately', () => {
  const split = trainTestSplit(
    [
      { avgScore: 90, attendanceRate: 95, quizCount: 4, needsSupport: 0 },
      { avgScore: 85, attendanceRate: 90, quizCount: 4, needsSupport: 0 },
      { avgScore: 40, attendanceRate: 50, quizCount: 1, needsSupport: 1 },
      { avgScore: 45, attendanceRate: 55, quizCount: 1, needsSupport: 1 },
    ],
    0.25
  );
  assert.equal(split.train.length, 3);
  assert.equal(split.test.length, 1);

  const highRisk = classifyWithKnn(
    { avgScore: 42, attendanceRate: 52, quizCount: 1 },
    [
      { avgScore: 90, attendanceRate: 95, quizCount: 4, needsSupport: 0 },
      { avgScore: 85, attendanceRate: 90, quizCount: 4, needsSupport: 0 },
      { avgScore: 40, attendanceRate: 50, quizCount: 1, needsSupport: 1 },
      { avgScore: 45, attendanceRate: 55, quizCount: 1, needsSupport: 1 },
      { avgScore: 38, attendanceRate: 48, quizCount: 1, needsSupport: 1 },
    ],
    3
  );
  assert.equal(highRisk.needsSupport, true);
  assert.ok(evaluateKnnAccuracy(3) >= 75);
});

test('userSession validates student and teacher entry inputs and resolves student profile', () => {
  assert.equal(
    validateStudentEntry({
      fullName: 'ميرام نبهان',
      classroom: 'شعبة أ',
      academicYear: 'الفرقة الثانية',
    }).valid,
    true
  );
  assert.equal(
    validateStudentEntry({
      fullName: 'م',
      classroom: 'شعبة أ',
      academicYear: 'الفرقة الثانية',
    }).valid,
    false
  );

  assert.equal(
    validateTeacherEntry({
      fullName: 'د/ صفاء العطوى',
      subjectName: 'برمجة البايثون 2',
      academicYear: 'الفرقة الثانية',
    }).valid,
    true
  );
  assert.equal(
    validateTeacherEntry({
      fullName: 'د/ صفاء العطوى',
      subjectName: '',
      academicYear: 'الفرقة الثانية',
    }).valid,
    false
  );

  const existing: Student[] = [
    {
      id: 'stu-1',
      firstName: 'عمر',
      lastName: 'عادل',
      email: 'omar@damietta.edu.eg',
      role: 'student',
      academicYear: 'الفرقة الثانية',
      classroom: 'حاسب آلي',
      parentEmail: 'p@mail.eg',
    },
  ];
  const matched = resolveOrCreateStudentFromEntry(
    { fullName: 'عمر عادل', classroom: 'حاسب آلي', academicYear: 'الفرقة الثانية' },
    existing
  );
  assert.equal(matched.isNew, false);
  assert.equal(matched.student.id, 'stu-1');

  const created = resolveOrCreateStudentFromEntry(
    { fullName: 'ميرام نبهان', classroom: 'موسيقية', academicYear: 'الفرقة الثالثة' },
    existing
  );
  assert.equal(created.isNew, true);
  assert.equal(created.student.firstName, 'ميرام');
  assert.equal(created.student.lastName, 'نبهان');
  assert.equal(created.student.classroom, 'موسيقية');
  assert.equal(created.student.academicYear, 'الفرقة الثالثة');
});

test('New Damietta curriculum enforces unique specialized courses per dept/year and 3 shared pedagogical courses per year', () => {
  const csY3 = getQuizzesForStudent(SEED_QUIZZES, 'حاسب آلي', 'الفرقة الثالثة');
  const musY3 = getQuizzesForStudent(SEED_QUIZZES, 'موسيقية', 'الفرقة الثالثة');
  const medY3 = getQuizzesForStudent(SEED_QUIZZES, 'إعلام', 'الفرقة الثالثة');
  const csY2 = getQuizzesForStudent(SEED_QUIZZES, 'حاسب آلي', 'الفرقة الثانية');

  // CS Year 3 must include the 5 specified specialized subjects
  assert.deepEqual(
    csY3.specialized.map((q) => q.subject),
    ['برمجة 2', 'روبوتات', 'الرسم بالحاسب', 'النظم الذكية', 'الوسائط المتعددة']
  );

  // All 3 departments in Year 3 have distinct specialized courses
  assert.equal(musY3.specialized.length, 4);
  assert.equal(medY3.specialized.length, 4);
  assert.notEqual(csY3.specialized[0].subject, musY3.specialized[0].subject);
  assert.notEqual(musY3.specialized[0].subject, medY3.specialized[0].subject);

  // All 3 departments in Year 3 share the exact same 3 pedagogical courses
  assert.equal(csY3.pedagogical.length, 3);
  assert.deepEqual(
    csY3.pedagogical.map((q) => q.subject),
    musY3.pedagogical.map((q) => q.subject)
  );
  assert.deepEqual(
    csY3.pedagogical.map((q) => q.subject),
    medY3.pedagogical.map((q) => q.subject)
  );

  // Different academic years have different pedagogical courses
  assert.equal(csY2.pedagogical.length, 3);
  assert.notDeepEqual(
    csY2.pedagogical.map((q) => q.subject),
    csY3.pedagogical.map((q) => q.subject)
  );
});

