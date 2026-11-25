import type { AttendanceRecord, QuizAttempt } from '../types';

export interface DescriptiveStats {
  count: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  passRate: number;
  attendanceRate: number;
}

export function computeDescriptiveStats(
  attempts: readonly QuizAttempt[],
  attendance: readonly AttendanceRecord[]
): DescriptiveStats {
  const attendanceRate = computeAttendanceRate(attendance);

  if (attempts.length === 0) {
    return {
      count: 0,
      mean: 0,
      median: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      passRate: 0,
      attendanceRate,
    };
  }

  const scores = attempts.map((a) => a.percentage).sort((a, b) => a - b);
  const count = scores.length;
  const sum = scores.reduce((acc, s) => acc + s, 0);
  const mean = Math.round((sum / count) * 10) / 10;

  const mid = Math.floor(count / 2);
  const median =
    count % 2 === 0
      ? Math.round(((scores[mid - 1] + scores[mid]) / 2) * 10) / 10
      : scores[mid];

  const variance =
    scores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / count;
  const stdDev = Math.round(Math.sqrt(variance) * 10) / 10;

  const passCount = attempts.filter((a) => a.passed).length;
  const passRate = Math.round((passCount / count) * 1000) / 10;

  return {
    count,
    mean,
    median,
    stdDev,
    min: scores[0],
    max: scores[count - 1],
    passRate,
    attendanceRate,
  };
}

export function computeAttendanceRate(attendance: readonly AttendanceRecord[]): number {
  if (attendance.length === 0) return 100;
  const presentWeight = attendance.reduce((acc, rec) => {
    if (rec.status === 'present') return acc + 1;
    if (rec.status === 'late') return acc + 0.75;
    return acc;
  }, 0);
  return Math.round((presentWeight / attendance.length) * 1000) / 10;
}

export function computeClassroomAverages(
  attempts: readonly QuizAttempt[]
): Array<{ classroom: string; average: number; count: number }> {
  const grouped = new Map<string, number[]>();
  for (const a of attempts) {
    const list = grouped.get(a.classroom) ?? [];
    list.push(a.percentage);
    grouped.set(a.classroom, list);
  }

  return Array.from(grouped.entries()).map(([classroom, scores]) => {
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    return {
      classroom,
      average: Math.round(avg * 10) / 10,
      count: scores.length,
    };
  });
}

export function computeStudentProgressSeries(
  attempts: readonly QuizAttempt[],
  studentId?: string
): Array<{ label: string; score: number; date: string }> {
  const filtered = studentId
    ? attempts.filter((a) => a.studentId === studentId)
    : attempts;

  return [...filtered]
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
    .slice(-8)
    .map((a, idx) => ({
      label: a.quizTitle.length > 18 ? `${a.quizTitle.slice(0, 18)}…` : a.quizTitle || `اختبار ${idx + 1}`,
      score: a.percentage,
      date: a.submittedAt.slice(0, 10),
    }));
}
