export type QuestionType = 'mcq' | 'true_false' | 'fill_blank';

export type UserRole = 'student' | 'teacher';

export type DepartmentName = 'حاسب آلي' | 'موسيقية' | 'إعلام';

export type AcademicYearName =
  | 'الفرقة الأولى'
  | 'الفرقة الثانية'
  | 'الفرقة الثالثة'
  | 'الفرقة الرابعة';

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Student extends Person {
  role: 'student';
  academicYear: string;
  classroom: string;
  parentEmail: string;
}

export interface Teacher extends Person {
  role: 'teacher';
  subjectName: string;
  academicYear: string;
}

export interface StudentSessionProfile {
  role: 'student';
  studentId: string;
  fullName: string;
  classroom: string;
  academicYear: string;
}

export interface TeacherSessionProfile {
  role: 'teacher';
  fullName: string;
  subjectName: string;
  academicYear: string;
}

export type UserSessionProfile = StudentSessionProfile | TeacherSessionProfile;

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  correctAnswer: string;
  points: number;
  bookReference?: string;
  explanation?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  subject: string;
  department?: DepartmentName | 'تربوي مشترك';
  courseCategory?: 'specialized' | 'pedagogical';
  teacherName: string;
  academicYear: string;
  durationMinutes: number;
  createdAt: string;
  isActive: boolean;
  questions: Question[];
}

export interface StudentAnswerRecord {
  questionId: string;
  submittedAnswer: string;
  isCorrect: boolean;
  earnedPoints: number;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  studentId: string;
  studentName: string;
  classroom: string;
  score: number;
  totalPoints: number;
  percentage: number;
  gradeLabel: string;
  passed: boolean;
  executionTimeMs: number;
  submittedAt: string;
  answers: StudentAnswerRecord[];
}

export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  classroom: string;
  date: string;
  status: AttendanceStatus;
  notes?: string;
}

export interface NotificationItem {
  id: string;
  recipientName: string;
  recipientEmail: string;
  audience: 'student' | 'parent' | 'both';
  eventType: 'grade_published' | 'absence_alert' | 'support_alert';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface KnnPredictionResult {
  studentId: string;
  studentName: string;
  classroom: string;
  avgScore: number;
  attendanceRate: number;
  quizCount: number;
  needsSupport: boolean;
  confidence: number;
  neighborsUsed: number;
}
