import type { Question, Quiz, QuizAttempt, StudentAnswerRecord } from '../types';

/**
 * Pure grading functions (no side effects, immutable inputs)
 * mirroring Step 4 (Functional Programming & Comprehensions).
 */

export function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function evaluateQuestion(
  question: Question,
  submittedAnswer: string
): StudentAnswerRecord {
  const normalizedSubmitted = normalizeAnswer(submittedAnswer || '');
  const normalizedCorrect = normalizeAnswer(question.correctAnswer);
  const isCorrect =
    normalizedSubmitted.length > 0 && normalizedSubmitted === normalizedCorrect;

  return {
    questionId: question.id,
    submittedAnswer: submittedAnswer ?? '',
    isCorrect,
    earnedPoints: isCorrect ? question.points : 0,
  };
}

export function calculatePercentage(score: number, totalPoints: number): number {
  if (totalPoints <= 0) {
    throw new Error('لا يمكن القسمة على صفر: مجموع درجات الاختبار يجب أن يكون أكبر من 0.');
  }
  return Math.round((score / totalPoints) * 1000) / 10;
}

export function getArabicGradeLabel(percentage: number): string {
  if (percentage >= 90) return 'ممتاز';
  if (percentage >= 80) return 'جيد جداً';
  if (percentage >= 65) return 'جيد';
  if (percentage >= 50) return 'مقبول';
  return 'يحتاج إلى دعم';
}

export function gradeQuizPure(
  quiz: Quiz,
  studentInfo: { id: string; name: string; classroom: string },
  submittedAnswers: Record<string, string>
): QuizAttempt {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const answerRecords: StudentAnswerRecord[] = quiz.questions.map((q) =>
    evaluateQuestion(q, submittedAnswers[q.id] ?? '')
  );

  const totalPoints = quiz.questions.reduce((acc, q) => acc + q.points, 0);
  const score = answerRecords.reduce((acc, r) => acc + r.earnedPoints, 0);
  const percentage = calculatePercentage(score, totalPoints);
  const gradeLabel = getArabicGradeLabel(percentage);
  const passed = percentage >= 50;

  const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const executionTimeMs = Math.max(0.1, Math.round((end - start) * 100) / 100);

  return {
    id: `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    quizId: quiz.id,
    quizTitle: quiz.title,
    studentId: studentInfo.id,
    studentName: studentInfo.name,
    classroom: studentInfo.classroom,
    score,
    totalPoints,
    percentage,
    gradeLabel,
    passed,
    executionTimeMs,
    submittedAt: new Date().toISOString(),
    answers: answerRecords,
  };
}

export function computeAverageScore(attempts: readonly QuizAttempt[]): number {
  if (attempts.length === 0) return 0;
  const percentages = attempts.map((a) => a.percentage);
  const sum = percentages.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / percentages.length) * 10) / 10;
}

export function filterPassingAttempts(attempts: readonly QuizAttempt[]): QuizAttempt[] {
  return attempts.filter((a) => a.percentage >= 50);
}

export function extractHonorRollStudents(
  attempts: readonly QuizAttempt[],
  threshold = 85
): Array<{ studentName: string; percentage: number; quizTitle: string }> {
  return attempts
    .filter((a) => a.percentage >= threshold)
    .map((a) => ({
      studentName: a.studentName,
      percentage: a.percentage,
      quizTitle: a.quizTitle,
    }));
}

export function buildGradeDistribution(
  attempts: readonly QuizAttempt[]
): Record<string, number> {
  const categories = ['ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'يحتاج إلى دعم'];
  const distribution: Record<string, number> = {};
  for (const cat of categories) {
    distribution[cat] = attempts.filter((a) => a.gradeLabel === cat).length;
  }
  return distribution;
}
