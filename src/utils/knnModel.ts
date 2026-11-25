import type {
  AttendanceRecord,
  KnnPredictionResult,
  QuizAttempt,
  Student,
} from '../types';
import { computeAttendanceRate } from './analytics';

export interface LabeledTrainingSample {
  avgScore: number;
  attendanceRate: number;
  quizCount: number;
  needsSupport: 0 | 1;
}

// Reference training dataset grounded in historical academic performance patterns
const HISTORICAL_TRAINING_DATA: LabeledTrainingSample[] = [
  { avgScore: 92, attendanceRate: 96, quizCount: 5, needsSupport: 0 },
  { avgScore: 88, attendanceRate: 92, quizCount: 4, needsSupport: 0 },
  { avgScore: 81, attendanceRate: 88, quizCount: 4, needsSupport: 0 },
  { avgScore: 76, attendanceRate: 90, quizCount: 3, needsSupport: 0 },
  { avgScore: 72, attendanceRate: 85, quizCount: 4, needsSupport: 0 },
  { avgScore: 68, attendanceRate: 82, quizCount: 3, needsSupport: 0 },
  { avgScore: 62, attendanceRate: 78, quizCount: 3, needsSupport: 0 },
  { avgScore: 54, attendanceRate: 65, quizCount: 2, needsSupport: 1 },
  { avgScore: 48, attendanceRate: 60, quizCount: 2, needsSupport: 1 },
  { avgScore: 42, attendanceRate: 55, quizCount: 1, needsSupport: 1 },
  { avgScore: 35, attendanceRate: 50, quizCount: 2, needsSupport: 1 },
  { avgScore: 58, attendanceRate: 58, quizCount: 2, needsSupport: 1 },
  { avgScore: 51, attendanceRate: 70, quizCount: 1, needsSupport: 1 },
  { avgScore: 85, attendanceRate: 95, quizCount: 5, needsSupport: 0 },
  { avgScore: 79, attendanceRate: 84, quizCount: 3, needsSupport: 0 },
  { avgScore: 45, attendanceRate: 68, quizCount: 1, needsSupport: 1 },
];

export function euclideanDistance(
  a: { avgScore: number; attendanceRate: number; quizCount: number },
  b: { avgScore: number; attendanceRate: number; quizCount: number }
): number {
  const dScore = (a.avgScore - b.avgScore) / 100;
  const dAtt = (a.attendanceRate - b.attendanceRate) / 100;
  const dCount = (a.quizCount - b.quizCount) / 10;
  return Math.sqrt(dScore * dScore + dAtt * dAtt + dCount * dCount);
}

export function trainTestSplit(
  samples: readonly LabeledTrainingSample[],
  testRatio = 0.25
): { train: LabeledTrainingSample[]; test: LabeledTrainingSample[] } {
  const splitIdx = Math.max(1, Math.floor(samples.length * (1 - testRatio)));
  return {
    train: samples.slice(0, splitIdx),
    test: samples.slice(splitIdx),
  };
}

export function classifyWithKnn(
  features: { avgScore: number; attendanceRate: number; quizCount: number },
  trainingSet: readonly LabeledTrainingSample[],
  k = 3
): { needsSupport: boolean; confidence: number } {
  const effectiveK = Math.max(1, Math.min(k, trainingSet.length));
  const ranked = trainingSet
    .map((sample) => ({
      sample,
      distance: euclideanDistance(features, sample),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, effectiveK);

  const supportVotes = ranked.filter((r) => r.sample.needsSupport === 1).length;
  const needsSupport = supportVotes > effectiveK / 2;
  const winningVotes = needsSupport ? supportVotes : effectiveK - supportVotes;
  const confidence = Math.round((winningVotes / effectiveK) * 100);

  return { needsSupport, confidence };
}

export function evaluateKnnAccuracy(k = 3): number {
  const { train, test } = trainTestSplit(HISTORICAL_TRAINING_DATA, 0.25);
  if (test.length === 0) return 100;
  let correct = 0;
  for (const item of test) {
    const pred = classifyWithKnn(item, train, k);
    if ((pred.needsSupport ? 1 : 0) === item.needsSupport) {
      correct += 1;
    }
  }
  return Math.round((correct / test.length) * 1000) / 10;
}

export function predictStudentsSupport(
  students: readonly Student[],
  attempts: readonly QuizAttempt[],
  attendance: readonly AttendanceRecord[],
  k = 3
): KnnPredictionResult[] {
  return students.map((student) => {
    const studentAttempts = attempts.filter((a) => a.studentId === student.id);
    const studentAtt = attendance.filter((rec) => rec.studentId === student.id);

    const avgScore =
      studentAttempts.length > 0
        ? Math.round(
            (studentAttempts.reduce((s, a) => s + a.percentage, 0) /
              studentAttempts.length) *
              10
          ) / 10
        : 0;
    const attendanceRate = computeAttendanceRate(studentAtt);
    const quizCount = studentAttempts.length;

    const { needsSupport, confidence } = classifyWithKnn(
      { avgScore, attendanceRate, quizCount },
      HISTORICAL_TRAINING_DATA,
      k
    );

    return {
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      classroom: student.classroom,
      avgScore,
      attendanceRate,
      quizCount,
      needsSupport,
      confidence,
      neighborsUsed: k,
    };
  });
}
