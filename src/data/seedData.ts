import type {
  AttendanceRecord,
  NotificationItem,
  Quiz,
  QuizAttempt,
  Student,
  Teacher,
} from '../types';
import {
  CS_SPECIALIZED_QUIZZES,
  PEDAGOGICAL_QUIZZES,
} from './curriculumCatalog';
import {
  MEDIA_SPECIALIZED_QUIZZES,
  MUSIC_SPECIALIZED_QUIZZES,
} from './artsMediaCatalog';

export const SEED_TEACHER: Teacher = {
  id: 'teacher-1',
  firstName: 'صفاء',
  lastName: 'العطوى',
  email: 'safaa.elatwy@damietta.edu.eg',
  role: 'teacher',
  subjectName: 'برمجة البايثون 2 وواجهات المستخدم الرسومية',
  academicYear: 'الفرقة الثانية',
};

export const SEED_STUDENTS: Student[] = [
  {
    id: 'stu-1',
    firstName: 'ميرام',
    lastName: 'نبهان',
    email: 'miram.nabhan@damietta.edu.eg',
    role: 'student',
    academicYear: 'الفرقة الثالثة',
    classroom: 'حاسب آلي',
    parentEmail: 'parent.miram@mail.eg',
  },
  {
    id: 'stu-2',
    firstName: 'عمر',
    lastName: 'عادل',
    email: 'omar.adel@damietta.edu.eg',
    role: 'student',
    academicYear: 'الفرقة الثانية',
    classroom: 'حاسب آلي',
    parentEmail: 'parent.omar@mail.eg',
  },
  {
    id: 'stu-3',
    firstName: 'سلمى',
    lastName: 'إبراهيم',
    email: 'salma.ibrahim@damietta.edu.eg',
    role: 'student',
    academicYear: 'الفرقة الثالثة',
    classroom: 'موسيقية',
    parentEmail: 'parent.salma@mail.eg',
  },
  {
    id: 'stu-4',
    firstName: 'يوسف',
    lastName: 'محمود',
    email: 'youssef.mahmoud@damietta.edu.eg',
    role: 'student',
    academicYear: 'الفرقة الثالثة',
    classroom: 'إعلام',
    parentEmail: 'parent.youssef@mail.eg',
  },
  {
    id: 'stu-5',
    firstName: 'مريم',
    lastName: 'حسن',
    email: 'mariam.hassan@damietta.edu.eg',
    role: 'student',
    academicYear: 'الفرقة الأولى',
    classroom: 'موسيقية',
    parentEmail: 'parent.mariam@mail.eg',
  },
  {
    id: 'stu-6',
    firstName: 'كريم',
    lastName: 'طارق',
    email: 'kareem.tarek@damietta.edu.eg',
    role: 'student',
    academicYear: 'الفرقة الرابعة',
    classroom: 'إعلام',
    parentEmail: 'parent.kareem@mail.eg',
  },
];

const featuredBookQuiz = CS_SPECIALIZED_QUIZZES.find(
  (q) => q.id === 'quiz-python2-book'
);
const otherCsQuizzes = CS_SPECIALIZED_QUIZZES.filter(
  (q) => q.id !== 'quiz-python2-book'
);

export const SEED_QUIZZES: Quiz[] = [
  ...(featuredBookQuiz ? [featuredBookQuiz] : []),
  ...otherCsQuizzes,
  ...MUSIC_SPECIALIZED_QUIZZES,
  ...MEDIA_SPECIALIZED_QUIZZES,
  ...PEDAGOGICAL_QUIZZES,
];

export const SEED_ATTEMPTS: QuizAttempt[] = [
  {
    id: 'att-1',
    quizId: 'cs-y3-1',
    quizTitle: 'اختبار مادة: برمجة 2',
    studentId: 'stu-1',
    studentName: 'ميرام نبهان',
    classroom: 'حاسب آلي',
    score: 10,
    totalPoints: 10,
    percentage: 100,
    gradeLabel: 'ممتاز',
    passed: true,
    executionTimeMs: 0.34,
    submittedAt: '2026-11-21T10:15:00.000Z',
    answers: [],
  },
  {
    id: 'att-2',
    quizId: 'quiz-python2-book',
    quizTitle: 'الاختبار الشامل: واجهات المستخدم الرسومية وبرمجة البايثون 2',
    studentId: 'stu-2',
    studentName: 'عمر عادل',
    classroom: 'حاسب آلي',
    score: 18,
    totalPoints: 20,
    percentage: 90,
    gradeLabel: 'ممتاز',
    passed: true,
    executionTimeMs: 0.42,
    submittedAt: '2026-11-21T11:05:00.000Z',
    answers: [],
  },
  {
    id: 'att-3',
    quizId: 'mus-y3-4',
    quizTitle: 'اختبار مادة: الموسيقى العربية والمقامات الشرقية',
    studentId: 'stu-3',
    studentName: 'سلمى إبراهيم',
    classroom: 'موسيقية',
    score: 8,
    totalPoints: 10,
    percentage: 80,
    gradeLabel: 'جيد جداً',
    passed: true,
    executionTimeMs: 0.31,
    submittedAt: '2026-11-22T09:10:00.000Z',
    answers: [],
  },
  {
    id: 'att-4',
    quizId: 'med-y3-1',
    quizTitle: 'اختبار مادة: المونتاج الرقمي وصناعة الفيديو التعليمي',
    studentId: 'stu-4',
    studentName: 'يوسف محمود',
    classroom: 'إعلام',
    score: 4,
    totalPoints: 10,
    percentage: 40,
    gradeLabel: 'يحتاج إلى دعم',
    passed: false,
    executionTimeMs: 0.38,
    submittedAt: '2026-11-22T12:20:00.000Z',
    answers: [],
  },
  {
    id: 'att-5',
    quizId: 'mus-y1-1',
    quizTitle: 'اختبار مادة: مبادئ النظريات الموسيقية والصولفيج 1',
    studentId: 'stu-5',
    studentName: 'مريم حسن',
    classroom: 'موسيقية',
    score: 9,
    totalPoints: 10,
    percentage: 90,
    gradeLabel: 'ممتاز',
    passed: true,
    executionTimeMs: 0.25,
    submittedAt: '2026-11-23T14:00:00.000Z',
    answers: [],
  },
  {
    id: 'att-6',
    quizId: 'med-y4-3',
    quizTitle: 'اختبار مادة: صحافة البيانات والإنفوجرافيك التربوي',
    studentId: 'stu-6',
    studentName: 'كريم طارق',
    classroom: 'إعلام',
    score: 7,
    totalPoints: 10,
    percentage: 70,
    gradeLabel: 'جيد',
    passed: true,
    executionTimeMs: 0.28,
    submittedAt: '2026-11-24T10:45:00.000Z',
    answers: [],
  },
];

export const SEED_ATTENDANCE: AttendanceRecord[] = [
  { id: 'att-rec-1', studentId: 'stu-1', studentName: 'ميرام نبهان', classroom: 'حاسب آلي', date: '2026-11-24', status: 'present' },
  { id: 'att-rec-2', studentId: 'stu-2', studentName: 'عمر عادل', classroom: 'حاسب آلي', date: '2026-11-24', status: 'present' },
  { id: 'att-rec-3', studentId: 'stu-3', studentName: 'سلمى إبراهيم', classroom: 'موسيقية', date: '2026-11-24', status: 'present' },
  { id: 'att-rec-4', studentId: 'stu-4', studentName: 'يوسف محمود', classroom: 'إعلام', date: '2026-11-24', status: 'absent', notes: 'غياب عن المحاضرة العملية' },
  { id: 'att-rec-5', studentId: 'stu-5', studentName: 'مريم حسن', classroom: 'موسيقية', date: '2026-11-24', status: 'present' },
  { id: 'att-rec-6', studentId: 'stu-6', studentName: 'كريم طارق', classroom: 'إعلام', date: '2026-11-24', status: 'late', notes: 'تأخر 15 دقيقة' },
];

export const SEED_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    recipientName: 'ميرام نبهان وولي الأمر',
    recipientEmail: 'parent.miram@mail.eg',
    audience: 'both',
    eventType: 'grade_published',
    title: 'نشر درجة مادة برمجة 2',
    message: 'حصلت الطالبة ميرام نبهان (حاسب آلي — الفرقة الثالثة) على 10/10 (100% — تقدير: ممتاز).',
    createdAt: '2026-11-21T10:20:00.000Z',
    read: false,
  },
  {
    id: 'notif-2',
    recipientName: 'ولي أمر الطالب يوسف محمود',
    recipientEmail: 'parent.youssef@mail.eg',
    audience: 'parent',
    eventType: 'absence_alert',
    title: 'تنبيه غياب وتوصية دعم إضافي',
    message: 'تم تسجيل غياب الطالب يوسف محمود (إعلام — الفرقة الثالثة) بتاريخ 2026-11-24.',
    createdAt: '2026-11-24T09:30:00.000Z',
    read: false,
  },
];

export const SAMPLE_CSV_TEMPLATE = `type,prompt,options,correct,points,ref
mcq,أي عنصر تحكم في Tkinter يعرض قائمة نصية قابلة للاختيار؟,Listbox|Scale|Spinbox|Label,Listbox,2,ص 61
true_false,تسمح دالة train_test_split بتقسيم البيانات إلى تدريب واختبار.,صح|خطأ,صح,2,ص 20
fill_blank,تُستخدم دالة ........ لإغلاق النوافذ المنبثقة Toplevel برمجياً.,destroy,2,ص 79`;
