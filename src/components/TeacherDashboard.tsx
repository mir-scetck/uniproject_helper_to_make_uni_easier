import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  BrainCircuit,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Plus,
  Search,
  Upload,
} from 'lucide-react';
import type {
  AttendanceRecord,
  AttendanceStatus,
  NotificationItem,
  Question,
  QuestionType,
  Quiz,
  QuizAttempt,
  Student,
  TeacherSessionProfile,
} from '../types';
import {
  buildGradeDistribution,
  extractHonorRollStudents,
} from '../utils/grading';
import {
  computeClassroomAverages,
  computeDescriptiveStats,
  computeStudentProgressSeries,
} from '../utils/analytics';
import { exportGradebookToCsv, importQuestionsFromCsv } from '../utils/csvGenerator';
import {
  classifyWithKnn,
  evaluateKnnAccuracy,
  predictStudentsSupport,
} from '../utils/knnModel';
import {
  validateEmail,
  validatePositiveNumber,
  validateQuestionInput,
  validateTextLength,
} from '../utils/validators';
import { SAMPLE_CSV_TEMPLATE } from '../data/seedData';
import {
  ACADEMIC_YEAR_OPTIONS,
  DEPARTMENT_OPTIONS,
  getQuizzesForStudent,
} from '../utils/userSession';
import { ClassroomBarChart, ProgressLineChart } from './AnalyticsCharts';

interface TeacherDashboardProps {
  quizzes: Quiz[];
  students: Student[];
  attempts: QuizAttempt[];
  attendance: AttendanceRecord[];
  notifications: NotificationItem[];
  activeTeacherProfile?: TeacherSessionProfile | null;
  onSwitchRole?: () => void;
  onAddQuiz: (quiz: Quiz) => void;
  onAddQuestionToQuiz: (quizId: string, questions: Question[]) => void;
  onRecordAttendance: (student: Student, status: AttendanceStatus, date: string) => void;
  onAddStudent: (student: Student) => void;
  onDispatchAsyncBatchNotifications: () => Promise<number>;
}

type TeacherTab = 'overview' | 'quizzes' | 'attendance' | 'knn';

interface TeacherTabConfig {
  id: TeacherTab;
  label: string;
  description: string;
  image: string;
  alt: string;
}

const TEACHER_TABS: TeacherTabConfig[] = [
  {
    id: 'overview',
    label: 'نظرة عامة والتحليلات',
    description: 'الرسوم البيانية، متوسط الشعب، لوحة المتفوقين، وتصدير كشف الدرجات CSV.',
    image: '/src/assets/images/cute_analytics_charts_1795629745117.jpg',
    alt: 'أيقونة مصورة للرسوم البيانية وتحليل درجات الطلاب',
  },
  {
    id: 'quizzes',
    label: 'الاختبارات والـ CSV',
    description: 'إنشاء اختبارات جديدة، إضافة أسئلة بمصنع الكائنات، واستيراد CSV بالمولدات.',
    image: '/src/assets/images/cute_csv_factory_1795629745358.jpg',
    alt: 'أيقونة مصورة لإنشاء الاختبارات واستيراد ملفات CSV',
  },
  {
    id: 'attendance',
    label: 'الحضور والإشعارات',
    description: 'تسجيل الحضور اليومي، إضافة طالب جديد، وإرسال إشعارات Observer الفورية.',
    image: '/src/assets/images/cute_attendance_bell_1795629746816.jpg',
    alt: 'أيقونة مصورة لسجل الحضور وجرس التنبيهات لأولياء الأمور',
  },
  {
    id: 'knn',
    label: 'تنبؤ الذكاء الاصطناعي',
    description: 'تصنيف الطلاب بنموذج KNN ومحاكي الدعم الأكاديمي التفاعلي.',
    image: '/src/assets/images/cute_ai_knn_1795629746760.jpg',
    alt: 'أيقونة مصورة لنموذج تصنيف KNN بالذكاء الاصطناعي',
  },
];

const STATUS_ARABIC: Record<AttendanceStatus, string> = {
  present: 'حاضر',
  absent: 'غائب',
  late: 'متأخر',
};

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  quizzes,
  students,
  attempts,
  attendance,
  notifications,
  activeTeacherProfile,
  onSwitchRole,
  onAddQuiz,
  onAddQuestionToQuiz,
  onRecordAttendance,
  onAddStudent,
  onDispatchAsyncBatchNotifications,
}) => {
  const [activeTab, setActiveTab] = useState<TeacherTab>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [knnK, setKnnK] = useState<number>(3);

  // Quiz & Question Builder State
  const [targetQuizId, setTargetQuizId] = useState<string>(quizzes[0]?.id ?? '');
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizSubject, setNewQuizSubject] = useState(
    activeTeacherProfile?.subjectName ?? ''
  );
  const [newQuizDepartment, setNewQuizDepartment] = useState<
    'حاسب آلي' | 'موسيقية' | 'إعلام' | 'تربوي مشترك'
  >('حاسب آلي');
  const [newQuizYear, setNewQuizYear] = useState<string>(
    activeTeacherProfile?.academicYear ?? ACADEMIC_YEAR_OPTIONS[2]
  );
  const [newQuizDuration, setNewQuizDuration] = useState('15');
  const [catalogDept, setCatalogDept] = useState<string>(DEPARTMENT_OPTIONS[0]);
  const [catalogYear, setCatalogYear] = useState<string>(ACADEMIC_YEAR_OPTIONS[2]);
  const [qType, setQType] = useState<QuestionType>('mcq');
  const [qPrompt, setQPrompt] = useState('');
  const [qOptionsRaw, setQOptionsRaw] = useState('');
  const [qCorrect, setQCorrect] = useState('');
  const [qPoints, setQPoints] = useState('2');
  const [csvText, setCsvText] = useState(SAMPLE_CSV_TEMPLATE);
  const [builderFeedback, setBuilderFeedback] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);

  // Student Registration Form State
  const [stuFirst, setStuFirst] = useState('');
  const [stuLast, setStuLast] = useState('');
  const [stuEmail, setStuEmail] = useState('');
  const [stuParentEmail, setStuParentEmail] = useState('');
  const [stuClass, setStuClass] = useState<string>(DEPARTMENT_OPTIONS[0]);
  const [stuYear, setStuYear] = useState<string>(ACADEMIC_YEAR_OPTIONS[2]);
  const [attendanceDate, setAttendanceDate] = useState('2026-11-25');
  const [asyncStatus, setAsyncStatus] = useState<string | null>(null);

  // KNN What-If Simulator State
  const [simScore, setSimScore] = useState('52');
  const [simAtt, setSimAtt] = useState('62');
  const [simCount, setSimCount] = useState('2');

  const stats = useMemo(
    () => computeDescriptiveStats(attempts, attendance),
    [attempts, attendance]
  );
  const classAverages = useMemo(
    () => computeClassroomAverages(attempts),
    [attempts]
  );
  const distribution = useMemo(
    () => buildGradeDistribution(attempts),
    [attempts]
  );
  const honorRoll = useMemo(
    () => extractHonorRollStudents(attempts, 85),
    [attempts]
  );
  const progressSeries = useMemo(
    () => computeStudentProgressSeries(attempts),
    [attempts]
  );

  const knnAccuracy = useMemo(() => evaluateKnnAccuracy(knnK), [knnK]);
  const knnPredictions = useMemo(
    () => predictStudentsSupport(students, attempts, attendance, knnK),
    [students, attempts, attendance, knnK]
  );

  const simPrediction = useMemo(() => {
    const scoreNum = Number(simScore) || 0;
    const attNum = Number(simAtt) || 0;
    const cntNum = Number(simCount) || 1;
    return classifyWithKnn(
      { avgScore: scoreNum, attendanceRate: attNum, quizCount: cntNum },
      [
        { avgScore: 92, attendanceRate: 96, quizCount: 5, needsSupport: 0 },
        { avgScore: 88, attendanceRate: 92, quizCount: 4, needsSupport: 0 },
        { avgScore: 81, attendanceRate: 88, quizCount: 4, needsSupport: 0 },
        { avgScore: 76, attendanceRate: 90, quizCount: 3, needsSupport: 0 },
        { avgScore: 72, attendanceRate: 85, quizCount: 4, needsSupport: 0 },
        { avgScore: 68, attendanceRate: 82, quizCount: 3, needsSupport: 0 },
        { avgScore: 54, attendanceRate: 65, quizCount: 2, needsSupport: 1 },
        { avgScore: 48, attendanceRate: 60, quizCount: 2, needsSupport: 1 },
        { avgScore: 42, attendanceRate: 55, quizCount: 1, needsSupport: 1 },
        { avgScore: 35, attendanceRate: 50, quizCount: 2, needsSupport: 1 },
      ],
      knnK
    );
  }, [simScore, simAtt, simCount, knnK]);

  const filteredAttempts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return attempts;
    return attempts.filter(
      (a) =>
        a.studentName.toLowerCase().includes(q) ||
        a.classroom.toLowerCase().includes(q) ||
        a.quizTitle.toLowerCase().includes(q)
    );
  }, [attempts, searchTerm]);

  const handleExportCsv = () => {
    const csvContent = exportGradebookToCsv(filteredAttempts);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gradebook_edu_platform.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    const titleCheck = validateTextLength(newQuizTitle, 'عنوان الاختبار', 5, 160);
    if (!titleCheck.valid) {
      setBuilderFeedback({ kind: 'error', text: titleCheck.error! });
      return;
    }
    const subjCheck = validateTextLength(newQuizSubject, 'اسم المادة', 3, 100);
    if (!subjCheck.valid) {
      setBuilderFeedback({ kind: 'error', text: subjCheck.error! });
      return;
    }
    const durCheck = validatePositiveNumber(newQuizDuration, 'مدة الاختبار', 5, 180);
    if (!durCheck.valid) {
      setBuilderFeedback({ kind: 'error', text: durCheck.error! });
      return;
    }

    const created: Quiz = {
      id: `quiz-${Date.now()}`,
      title: newQuizTitle.trim(),
      description: `اختبار مخصص في مادة ${newQuizSubject.trim()} (${newQuizDepartment} — ${newQuizYear})`,
      subject: newQuizSubject.trim(),
      department: newQuizDepartment,
      courseCategory:
        newQuizDepartment === 'تربوي مشترك' ? 'pedagogical' : 'specialized',
      teacherName: activeTeacherProfile?.fullName || 'د/ صفاء محمود العطوى',
      academicYear: newQuizYear,
      durationMinutes: Number(newQuizDuration),
      createdAt: new Date().toISOString().slice(0, 10),
      isActive: true,
      questions: [],
    };
    onAddQuiz(created);
    setTargetQuizId(created.id);
    setNewQuizTitle('');
    setNewQuizSubject('');
    setBuilderFeedback({
      kind: 'success',
      text: `تم إنشاء الاختبار "${created.title}" بنجاح. يمكنك الآن إضافة الأسئلة إليه.`,
    });
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetQuizId) {
      setBuilderFeedback({ kind: 'error', text: 'يرجى اختيار اختبار أولاً.' });
      return;
    }

    const optionsList =
      qType === 'mcq'
        ? qOptionsRaw
            .split('|')
            .map((o) => o.trim())
            .filter(Boolean)
        : qType === 'true_false'
          ? ['صح', 'خطأ']
          : [];

    const check = validateQuestionInput({
      type: qType,
      prompt: qPrompt,
      options: optionsList,
      correctAnswer: qCorrect,
      points: qPoints,
    });

    if (!check.valid) {
      setBuilderFeedback({ kind: 'error', text: check.error! });
      return;
    }

    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      type: qType,
      prompt: qPrompt.trim(),
      options: optionsList.length > 0 ? optionsList : undefined,
      correctAnswer: qCorrect.trim(),
      points: Number(qPoints),
    };

    onAddQuestionToQuiz(targetQuizId, [newQuestion]);
    setQPrompt('');
    setQOptionsRaw('');
    setQCorrect('');
    setBuilderFeedback({
      kind: 'success',
      text: 'تم إنشاء السؤال عبر Factory Method وإضافته للاختبار بنجاح.',
    });
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCsvText(reader.result);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleImportCsvQuestions = () => {
    if (!targetQuizId) {
      setBuilderFeedback({ kind: 'error', text: 'يرجى اختيار اختبار مستهدف للاستيراد.' });
      return;
    }
    const { questions, errors } = importQuestionsFromCsv(csvText);
    if (questions.length === 0) {
      setBuilderFeedback({
        kind: 'error',
        text: errors[0] || 'لم يتم العثور على أسئلة صالحة داخل ملف CSV.',
      });
      return;
    }
    onAddQuestionToQuiz(targetQuizId, questions);
    setBuilderFeedback({
      kind: 'success',
      text: `تم استيراد ${questions.length} أسئلة بنجاح عبر المولد (yield).${
        errors.length > 0 ? ` (تنبيهات: ${errors.length})` : ''
      }`,
    });
  };

  const handleRegisterStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const fCheck = validateTextLength(stuFirst, 'الاسم الأول', 2, 40);
    if (!fCheck.valid) {
      setAsyncStatus(fCheck.error!);
      return;
    }
    const lCheck = validateTextLength(stuLast, 'الاسم الأخير', 2, 40);
    if (!lCheck.valid) {
      setAsyncStatus(lCheck.error!);
      return;
    }
    const eCheck = validateEmail(stuEmail);
    if (!eCheck.valid) {
      setAsyncStatus(eCheck.error!);
      return;
    }
    const pCheck = validateEmail(stuParentEmail);
    if (!pCheck.valid) {
      setAsyncStatus(`بريد ولي الأمر: ${pCheck.error}`);
      return;
    }

    onAddStudent({
      id: `stu-${Date.now()}`,
      firstName: stuFirst.trim(),
      lastName: stuLast.trim(),
      email: stuEmail.trim(),
      role: 'student',
      academicYear: stuYear,
      classroom: stuClass,
      parentEmail: stuParentEmail.trim(),
    });
    setStuFirst('');
    setStuLast('');
    setStuEmail('');
    setStuParentEmail('');
    setAsyncStatus('تم تسجيل الطالب بنجاح.');
  };

  const handleBatchAsyncNotify = async () => {
    setAsyncStatus('جاري إرسال الإشعارات في الخلفية...');
    const count = await onDispatchAsyncBatchNotifications();
    setAsyncStatus(`اكتمل الإرسال غير المتزامن (asyncio) لـ ${count} إشعاراً بنجاح.`);
  };

  const currentTabConfig =
    TEACHER_TABS.find((t) => t.id === activeTab) ?? TEACHER_TABS[0];

  return (
    <div className="space-y-8">
      {/* Header & Illustrated Cute Visual Tabs */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold text-teal-800">
              {activeTeacherProfile
                ? `مرحباً ${activeTeacherProfile.fullName} · المادة: ${activeTeacherProfile.subjectName} · ${activeTeacherProfile.academicYear}`
                : 'لوحة المعلم والتحليلات · إعداد الطالبة ميرام نبهان'}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-slate-900">
              لوحة المعلم — الإدارة والتحليل بالذكاء الاصطناعي
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              اختر أحد التبويبات المصوّرة أدناه لمعرفة وظيفة كل قسم وإدارة المقرر بسهولة.
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-1.5">
            <span className="text-xs font-medium text-slate-500">
              التبويب النشط: <strong className="text-teal-800">{currentTabConfig.label}</strong>
            </span>
            {onSwitchRole && (
              <button
                type="button"
                onClick={onSwitchRole}
                className="text-xs font-semibold text-teal-800 hover:underline cursor-pointer"
              >
                تبديل الدور (طالب / معلم)
              </button>
            )}
          </div>
        </div>

        <div
          role="tablist"
          aria-label="أقسام لوحة المعلم"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {TEACHER_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-start gap-3 rounded-2xl border p-3.5 text-right transition-all cursor-pointer ${
                  isActive
                    ? 'border-teal-700 bg-teal-50/50 shadow-sm'
                    : 'border-slate-200 bg-slate-50/40 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <img
                  src={tab.image}
                  alt={tab.alt}
                  referrerPolicy="no-referrer"
                  className="h-16 w-20 shrink-0 rounded-xl object-cover border border-slate-200/80"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <span
                    className={`block font-display text-sm font-bold whitespace-nowrap truncate ${
                      isActive ? 'text-teal-900' : 'text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </span>
                  <span className="block text-[11px] leading-relaxed text-slate-600 line-clamp-2">
                    {tab.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* TAB 1: Overview & Analytics */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white sm:grid-cols-4 sm:divide-y-0 sm:divide-x sm:divide-x-reverse">
            <div className="p-5">
              <p className="text-xs font-medium text-slate-500">المتوسط الحسابي</p>
              <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
                {stats.mean}%
              </p>
              <p className="mt-1 text-xs text-slate-500 tabular-nums">
                الوسيط: {stats.median}%
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs font-medium text-slate-500">الانحراف المعياري</p>
              <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
                {stats.stdDev}
              </p>
              <p className="mt-1 text-xs text-slate-500 tabular-nums">
                النطاق: {stats.min}% – {stats.max}%
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs font-medium text-slate-500">نسبة النجاح</p>
              <p className="mt-2 font-display text-2xl font-bold text-emerald-700 tabular-nums">
                {stats.passRate}%
              </p>
              <p className="mt-1 text-xs text-slate-500 tabular-nums">
                من إجمالي {stats.count} محاولة
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs font-medium text-slate-500">نسبة الحضور العامة</p>
              <p className="mt-2 font-display text-2xl font-bold text-blue-700 tabular-nums">
                {stats.attendanceRate}%
              </p>
              <p className="mt-1 text-xs text-slate-500 tabular-nums">
                عدد الطلاب: {students.length}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ClassroomBarChart
              title="مقارنة متوسط الدرجات حسب الشعبة"
              items={classAverages.map((c) => ({
                label: c.classroom,
                value: c.average,
                sublabel: `${c.count} محاولة`,
              }))}
            />
            <ProgressLineChart
              title="تطور مستوى الأداء عبر المحاولات"
              series={progressSeries}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
              <h3 className="font-display text-base font-bold text-slate-900">
                توزيع التقديرات ولوحة المتفوقين (85% فأكثر)
              </h3>
              <div className="space-y-2 text-sm">
                {Object.entries(distribution).map(([tier, count]) => (
                  <div
                    key={tier}
                    className="flex items-center justify-between border-b border-slate-100 py-1.5"
                  >
                    <span className="text-slate-700">{tier}</span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <p className="text-xs font-semibold text-teal-800">
                  قائمة الطلاب المتفوقين:
                </p>
                {honorRoll.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-500">لا يوجد متفوقون بعد.</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-xs text-slate-700">
                    {honorRoll.map((h, i) => (
                      <li key={`${h.studentName}-${i}`} className="flex justify-between">
                        <span>{h.studentName}</span>
                        <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                          {h.percentage}%
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <h3 className="font-display text-base font-bold text-slate-900">
                  كشف درجات الطلاب
                </h3>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                    <input
                      type="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="ابحث باسم الطالب أو الشعبة..."
                      aria-label="بحث في كشف الدرجات"
                      className="rounded-lg border border-slate-300 py-1.5 pr-8 pl-3 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-800 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>تصدير CSV</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2.5 font-medium">الطالب</th>
                      <th className="py-2.5 font-medium">الشعبة</th>
                      <th className="py-2.5 font-medium">الاختبار</th>
                      <th className="py-2.5 font-medium">النسبة</th>
                      <th className="py-2.5 font-medium">التقدير</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAttempts.map((att) => (
                      <tr key={att.id} className="hover:bg-slate-50">
                        <td className="py-2.5 font-medium text-slate-900">
                          {att.studentName}
                        </td>
                        <td className="py-2.5 text-slate-600">{att.classroom}</td>
                        <td className="py-2.5 text-slate-600 max-w-[180px] truncate">
                          {att.quizTitle}
                        </td>
                        <td className="py-2.5 font-mono font-semibold text-slate-900 tabular-nums">
                          {att.percentage}%
                        </td>
                        <td
                          className={`py-2.5 font-semibold ${
                            att.passed ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {att.gradeLabel}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Quiz Builder & CSV Import */}
      {activeTab === 'quizzes' && (
        <div className="space-y-6">
          {builderFeedback && (
            <div
              role="alert"
              className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
                builderFeedback.kind === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-rose-200 bg-rose-50 text-rose-900'
              }`}
            >
              {builderFeedback.kind === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-700" aria-hidden="true" />
              )}
              <span>{builderFeedback.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Create New Quiz */}
            <form
              onSubmit={handleCreateQuiz}
              className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4"
            >
              <h2 className="font-display text-lg font-bold text-slate-900">
                إنشاء اختبار جديد
              </h2>
              <div className="space-y-3">
                <div>
                  <label htmlFor="quiz-title" className="mb-1 block text-xs font-medium text-slate-700">
                    عنوان الاختبار
                  </label>
                  <input
                    id="quiz-title"
                    type="text"
                    value={newQuizTitle}
                    onChange={(e) => setNewQuizTitle(e.target.value)}
                    placeholder="مثال: اختبار الفصل الأول في بايثون"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="quiz-subject" className="mb-1 block text-xs font-medium text-slate-700">
                      المادة
                    </label>
                    <input
                      id="quiz-subject"
                      type="text"
                      value={newQuizSubject}
                      onChange={(e) => setNewQuizSubject(e.target.value)}
                      placeholder="برمجة 2"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="quiz-dur" className="mb-1 block text-xs font-medium text-slate-700">
                      المدة (بالدقائق)
                    </label>
                    <input
                      id="quiz-dur"
                      type="number"
                      value={newQuizDuration}
                      onChange={(e) => setNewQuizDuration(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="quiz-dept" className="mb-1 block text-xs font-medium text-slate-700">
                      الشعبة / التصنيف
                    </label>
                    <select
                      id="quiz-dept"
                      value={newQuizDepartment}
                      onChange={(e) =>
                        setNewQuizDepartment(
                          e.target.value as
                            | 'حاسب آلي'
                            | 'موسيقية'
                            | 'إعلام'
                            | 'تربوي مشترك'
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-teal-700 focus:outline-none"
                    >
                      {DEPARTMENT_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                      <option value="تربوي مشترك">تربوي مشترك (كل الشعب)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="quiz-year" className="mb-1 block text-xs font-medium text-slate-700">
                      الفرقة الدراسية
                    </label>
                    <select
                      id="quiz-year"
                      value={newQuizYear}
                      onChange={(e) => setNewQuizYear(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-teal-700 focus:outline-none"
                    >
                      {ACADEMIC_YEAR_OPTIONS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>إنشاء الاختبار</span>
              </button>
            </form>

            {/* Add Question via Factory Method */}
            <form
              onSubmit={handleAddQuestion}
              className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4"
            >
              <h2 className="font-display text-lg font-bold text-slate-900">
                إضافة سؤال (Factory Method)
              </h2>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="target-quiz" className="mb-1 block text-xs font-medium text-slate-700">
                    الاختبار المستهدف
                  </label>
                  <select
                    id="target-quiz"
                    value={targetQuizId}
                    onChange={(e) => setTargetQuizId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-teal-700 focus:outline-none"
                  >
                    {quizzes.map((qz) => (
                      <option key={qz.id} value={qz.id}>
                        {qz.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="q-type" className="mb-1 block text-xs font-medium text-slate-700">
                    نوع السؤال
                  </label>
                  <select
                    id="q-type"
                    value={qType}
                    onChange={(e) => {
                      const next = e.target.value as QuestionType;
                      setQType(next);
                      if (next === 'true_false') setQCorrect('صح');
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-teal-700 focus:outline-none"
                  >
                    <option value="mcq">اختيار من متعدد</option>
                    <option value="true_false">صح وخطأ</option>
                    <option value="fill_blank">إكمال الفراغات</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="q-prompt" className="mb-1 block text-xs font-medium text-slate-700">
                  نص السؤال
                </label>
                <input
                  id="q-prompt"
                  type="text"
                  value={qPrompt}
                  onChange={(e) => setQPrompt(e.target.value)}
                  placeholder="اكتب نص السؤال بوضوح..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                />
              </div>

              {qType === 'mcq' && (
                <div>
                  <label htmlFor="q-options" className="mb-1 block text-xs font-medium text-slate-700">
                    الخيارات (مفصولة بعلامة |)
                  </label>
                  <input
                    id="q-options"
                    type="text"
                    value={qOptionsRaw}
                    onChange={(e) => setQOptionsRaw(e.target.value)}
                    placeholder="Button|Canvas|Label|Frame"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="q-correct" className="mb-1 block text-xs font-medium text-slate-700">
                    الإجابة الصحيحة
                  </label>
                  {qType === 'true_false' ? (
                    <select
                      id="q-correct"
                      value={qCorrect}
                      onChange={(e) => setQCorrect(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                    >
                      <option value="صح">صح</option>
                      <option value="خطأ">خطأ</option>
                    </select>
                  ) : (
                    <input
                      id="q-correct"
                      type="text"
                      value={qCorrect}
                      onChange={(e) => setQCorrect(e.target.value)}
                      placeholder="الإجابة المطابقة تماماً"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                    />
                  )}
                </div>

                <div>
                  <label htmlFor="q-points" className="mb-1 block text-xs font-medium text-slate-700">
                    الدرجة
                  </label>
                  <input
                    id="q-points"
                    type="number"
                    value={qPoints}
                    onChange={(e) => setQPoints(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-teal-800 cursor-pointer"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>حفظ السؤال في الاختبار</span>
              </button>
            </form>
          </div>

          {/* CSV Import Section */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  استيراد الأسئلة من CSV (عبر المولد yield)
                </h2>
                <p className="text-xs text-slate-600">
                  ارفع ملف CSV أو عدّل النموذج التالي لإضافة أسئلة متعددة دفعة واحدة
                  سطراً بسطر.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer">
                <Upload className="h-4 w-4" aria-hidden="true" />
                <span>اختيار ملف CSV</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvFileUpload}
                  className="sr-only"
                />
              </label>
            </div>

            <textarea
              dir="ltr"
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              aria-label="محتوى ملف CSV للاستيراد"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 font-mono text-xs text-slate-800 focus:border-teal-700 focus:bg-white focus:outline-none"
            />

            <button
              type="button"
              onClick={handleImportCsvQuestions}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-teal-800 cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              <span>استيراد الأسئلة للاختبار المحدد</span>
            </button>
          </section>

          {/* Damietta New Specific Education Curriculum Browser */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  دليل مواد واختبارات كلية التربية النوعية بدمياط الجديدة
                </h2>
                <p className="text-xs text-slate-600">
                  اختر الشعبة والفرقة لمعاينة مواد التخصص والمواد التربوية الثلاث المشتركة.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="تصفية الدليل حسب الشعبة"
                  value={catalogDept}
                  onChange={(e) => setCatalogDept(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium"
                >
                  {DEPARTMENT_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      شعبة: {d}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="تصفية الدليل حسب الفرقة"
                  value={catalogYear}
                  onChange={(e) => setCatalogYear(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium"
                >
                  {ACADEMIC_YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(() => {
              const catalogSlice = getQuizzesForStudent(
                quizzes,
                catalogDept,
                catalogYear
              );
              return (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-bold text-teal-800">
                      مواد التخصص — شعبة {catalogDept} ({catalogYear})
                    </h3>
                    <ul className="space-y-2">
                      {catalogSlice.specialized.map((qz) => (
                        <li
                          key={qz.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">{qz.subject}</p>
                            <p className="text-[11px] text-slate-500">
                              {qz.questions.length} أسئلة · {qz.durationMinutes} دقيقة
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setTargetQuizId(qz.id)}
                            className="text-[11px] font-semibold text-teal-800 hover:underline shrink-0 cursor-pointer"
                          >
                            إضافة أسئلة له
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2.5">
                    <h3 className="text-xs font-bold text-blue-800">
                      المواد التربوية المشتركة (3 مواد لجميع شعب {catalogYear})
                    </h3>
                    <ul className="space-y-2">
                      {catalogSlice.pedagogical.map((qz) => (
                        <li
                          key={qz.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/40 px-3.5 py-2.5 text-xs"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">{qz.subject}</p>
                            <p className="text-[11px] text-slate-500">
                              {qz.questions.length} أسئلة · مشترك بين حاسب آلي وموسيقية وإعلام
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setTargetQuizId(qz.id)}
                            className="text-[11px] font-semibold text-blue-800 hover:underline shrink-0 cursor-pointer"
                          >
                            إضافة أسئلة له
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })()}
          </section>
        </div>
      )}

      {/* TAB 3: Attendance & Observer Notifications */}
      {activeTab === 'attendance' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold text-slate-900">
                  تسجيل حضور الطلاب اليومي
                </h2>
                <div className="flex items-center gap-2">
                  <label htmlFor="att-date" className="text-xs text-slate-600">
                    التاريخ:
                  </label>
                  <input
                    id="att-date"
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-teal-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {students.map((student) => {
                  const latestRec = attendance
                    .filter((r) => r.studentId === student.id)
                    .slice(-1)[0];
                  return (
                    <div
                      key={student.id}
                      className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {student.classroom} · آخر حالة:{' '}
                          <strong>
                            {latestRec ? STATUS_ARABIC[latestRec.status] : 'غير مسجل'}
                          </strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {(['present', 'late', 'absent'] as AttendanceStatus[]).map(
                          (st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() =>
                                onRecordAttendance(student, st, attendanceDate)
                              }
                              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                                st === 'present'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                  : st === 'late'
                                    ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                    : 'border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100'
                              }`}
                            >
                              {STATUS_ARABIC[st]}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Register Student with Regex Validation */}
            <form
              onSubmit={handleRegisterStudent}
              className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4"
            >
              <h3 className="font-display text-base font-bold text-slate-900">
                إضافة طالب جديد (مع التحقق بالعبارات النمطية)
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={stuFirst}
                  onChange={(e) => setStuFirst(e.target.value)}
                  placeholder="الاسم الأول"
                  aria-label="الاسم الأول للطالب"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                />
                <input
                  type="text"
                  value={stuLast}
                  onChange={(e) => setStuLast(e.target.value)}
                  placeholder="الاسم الأخير"
                  aria-label="الاسم الأخير للطالب"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                />
                <input
                  type="email"
                  dir="ltr"
                  value={stuEmail}
                  onChange={(e) => setStuEmail(e.target.value)}
                  placeholder="student@damietta.edu.eg"
                  aria-label="البريد الإلكتروني للطالب"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                />
                <input
                  type="email"
                  dir="ltr"
                  value={stuParentEmail}
                  onChange={(e) => setStuParentEmail(e.target.value)}
                  placeholder="parent@mail.eg"
                  aria-label="البريد الإلكتروني لولي الأمر"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={stuClass}
                    onChange={(e) => setStuClass(e.target.value)}
                    aria-label="الشعبة"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    {DEPARTMENT_OPTIONS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  <select
                    value={stuYear}
                    onChange={(e) => setStuYear(e.target.value)}
                    aria-label="الفرقة الدراسية"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    {ACADEMIC_YEAR_OPTIONS.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                >
                  حفظ بيانات الطالب
                </button>
              </div>
            </form>
          </div>

          <aside className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-700" aria-hidden="true" />
                <h2 className="font-display text-base font-bold text-slate-900">
                  سجل إشعارات Observer
                </h2>
              </div>
              <button
                type="button"
                onClick={handleBatchAsyncNotify}
                className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap cursor-pointer"
              >
                إرسال دفعة بالخلفية
              </button>
            </div>

            {asyncStatus && (
              <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-900">
                {asyncStatus}
              </p>
            )}

            <ul className="space-y-3 max-h-[520px] overflow-y-auto">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-slate-900">{n.title}</strong>
                    <span className="text-slate-500">{n.recipientName}</span>
                  </div>
                  <p className="leading-relaxed text-slate-600">{n.message}</p>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}

      {/* TAB 4: KNN Machine Learning Support Prediction */}
      {activeTab === 'knn' && (
        <div className="space-y-6">
          <section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 md:flex-row md:items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-blue-700" aria-hidden="true" />
                <h2 className="font-display text-lg font-bold text-slate-900">
                  نموذج التنبؤ التربوي بخوارزمية KNeighborsClassifier
                </h2>
              </div>
              <p className="text-sm text-slate-600">
                يعتمد النموذج على متوسط الدرجات ونسبة الحضور وعدد الاختبارات بعد
                تقسيم البيانات بـ train_test_split لتحديد الطلاب المحتاجين للدعم.
              </p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="text-left">
                <span className="block text-xs text-slate-500">دقة الاختبار</span>
                <span className="font-display text-xl font-bold text-teal-800 tabular-nums">
                  {knnAccuracy}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="knn-k" className="text-xs font-semibold text-slate-700">
                  قيمة k:
                </label>
                <select
                  id="knn-k"
                  value={knnK}
                  onChange={(e) => setKnnK(Number(e.target.value))}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-sm font-semibold"
                >
                  {[1, 3, 5, 7].map((kVal) => (
                    <option key={kVal} value={kVal}>
                      {kVal}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="mb-4 font-display text-base font-bold text-slate-900">
                تصنيف الطلاب الحاليين
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2.5 font-medium">الطالب</th>
                      <th className="py-2.5 font-medium">متوسط الدرجات</th>
                      <th className="py-2.5 font-medium">نسبة الحضور</th>
                      <th className="py-2.5 font-medium">التصنيف التنبؤي</th>
                      <th className="py-2.5 font-medium">نسبة الثقة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {knnPredictions.map((p) => (
                      <tr key={p.studentId} className="hover:bg-slate-50">
                        <td className="py-3 font-semibold text-slate-900">
                          {p.studentName}
                        </td>
                        <td className="py-3 font-mono tabular-nums text-slate-700">
                          {p.avgScore}%
                        </td>
                        <td className="py-3 font-mono tabular-nums text-slate-700">
                          {p.attendanceRate}%
                        </td>
                        <td className="py-3">
                          {p.needsSupport ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
                              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>يحتاج إلى دعم إضافي</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>أداء مستقر</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 font-mono font-semibold text-slate-900 tabular-nums">
                          {p.confidence}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
              <h3 className="font-display text-base font-bold text-slate-900">
                محاكي التنبؤ الفوري (KNN)
              </h3>
              <p className="text-xs text-slate-600">
                جرّب تعديل متوسط الدرجة ونسبة الحضور لمعاينة قرار الخوارزمية.
              </p>

              <div className="space-y-3">
                <div>
                  <label htmlFor="sim-score" className="mb-1 flex justify-between text-xs font-medium text-slate-700">
                    <span>متوسط الدرجات</span>
                    <span className="font-mono tabular-nums">{simScore}%</span>
                  </label>
                  <input
                    id="sim-score"
                    type="range"
                    min="0"
                    max="100"
                    value={simScore}
                    onChange={(e) => setSimScore(e.target.value)}
                    className="w-full accent-teal-700"
                  />
                </div>

                <div>
                  <label htmlFor="sim-att" className="mb-1 flex justify-between text-xs font-medium text-slate-700">
                    <span>نسبة الحضور</span>
                    <span className="font-mono tabular-nums">{simAtt}%</span>
                  </label>
                  <input
                    id="sim-att"
                    type="range"
                    min="0"
                    max="100"
                    value={simAtt}
                    onChange={(e) => setSimAtt(e.target.value)}
                    className="w-full accent-teal-700"
                  />
                </div>

                <div>
                  <label htmlFor="sim-count" className="mb-1 flex justify-between text-xs font-medium text-slate-700">
                    <span>عدد الاختبارات المكتملة</span>
                    <span className="font-mono tabular-nums">{simCount}</span>
                  </label>
                  <input
                    id="sim-count"
                    type="range"
                    min="1"
                    max="10"
                    value={simCount}
                    onChange={(e) => setSimCount(e.target.value)}
                    className="w-full accent-teal-700"
                  />
                </div>
              </div>

              <div
                className={`rounded-xl border p-4 text-sm ${
                  simPrediction.needsSupport
                    ? 'border-rose-200 bg-rose-50 text-rose-950'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-950'
                }`}
              >
                <p className="font-display font-bold">
                  النتيجة:{' '}
                  {simPrediction.needsSupport
                    ? 'يحتاج إلى دعم إضافي'
                    : 'أداء مستقر ومتقدم'}
                </p>
                <p className="mt-1 text-xs tabular-nums">
                  نسبة ثقة النموذج (k={knnK}): {simPrediction.confidence}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
