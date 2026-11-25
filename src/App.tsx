/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useMemo, useState } from 'react';
import { HomeView } from './components/HomeView';
import { Navbar, type AppView } from './components/Navbar';
import { RoleOnboardingGate } from './components/RoleOnboardingGate';
import { StudentPortal } from './components/StudentPortal';
import { TeacherDashboard } from './components/TeacherDashboard';
import {
  SEED_ATTENDANCE,
  SEED_ATTEMPTS,
  SEED_NOTIFICATIONS,
  SEED_QUIZZES,
  SEED_STUDENTS,
} from './data/seedData';
import type {
  AttendanceRecord,
  AttendanceStatus,
  NotificationItem,
  Question,
  Quiz,
  QuizAttempt,
  Student,
  UserSessionProfile,
} from './types';
import { computeDescriptiveStats } from './utils/analytics';
import { evaluateKnnAccuracy } from './utils/knnModel';
import {
  resolveOrCreateStudentFromEntry,
  type StudentEntryInput,
  type TeacherEntryInput,
} from './utils/userSession';

const STORAGE_KEY = 'edu_platform_state_v2';
const USER_SESSION_KEY = 'edu_platform_user_v2';

interface PersistedState {
  quizzes: Quiz[];
  students: Student[];
  attempts: QuizAttempt[];
  attendance: AttendanceRecord[];
  notifications: NotificationItem[];
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      if (
        Array.isArray(parsed.quizzes) &&
        Array.isArray(parsed.students) &&
        Array.isArray(parsed.attempts)
      ) {
        return {
          quizzes: parsed.quizzes,
          students: parsed.students,
          attempts: parsed.attempts,
          attendance: parsed.attendance ?? SEED_ATTENDANCE,
          notifications: parsed.notifications ?? SEED_NOTIFICATIONS,
        };
      }
    }
  } catch {
    // Fallback cleanly to deterministic seed data
  }
  return {
    quizzes: SEED_QUIZZES,
    students: SEED_STUDENTS,
    attempts: SEED_ATTEMPTS,
    attendance: SEED_ATTENDANCE,
    notifications: SEED_NOTIFICATIONS,
  };
}

function loadSavedUserProfile(): UserSessionProfile | null {
  try {
    const raw = localStorage.getItem(USER_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserSessionProfile>;
    if (
      parsed.role === 'student' &&
      typeof parsed.studentId === 'string' &&
      typeof parsed.fullName === 'string' &&
      typeof parsed.classroom === 'string' &&
      typeof parsed.academicYear === 'string'
    ) {
      return parsed as UserSessionProfile;
    }
    if (
      parsed.role === 'teacher' &&
      typeof parsed.fullName === 'string' &&
      typeof parsed.subjectName === 'string' &&
      typeof parsed.academicYear === 'string'
    ) {
      return parsed as UserSessionProfile;
    }
  } catch {
    // Ignore malformed localStorage entries
  }
  return null;
}

export default function App() {
  const initialProfile = useMemo(() => loadSavedUserProfile(), []);
  const [userProfile, setUserProfile] = useState<UserSessionProfile | null>(
    initialProfile
  );
  const [showRoleGate, setShowRoleGate] = useState<boolean>(
    initialProfile === null
  );
  const [activeView, setActiveView] = useState<AppView>(() =>
    initialProfile?.role === 'teacher'
      ? 'teacher'
      : initialProfile?.role === 'student'
        ? 'student'
        : 'home'
  );
  const [selectedBookQuizId, setSelectedBookQuizId] = useState<
    string | undefined
  >(undefined);
  const [state, setState] = useState<PersistedState>(() => loadInitialState());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors safely
    }
  }, [state]);

  useEffect(() => {
    try {
      if (userProfile) {
        localStorage.setItem(USER_SESSION_KEY, JSON.stringify(userProfile));
      } else {
        localStorage.removeItem(USER_SESSION_KEY);
      }
    } catch {
      // Ignore storage quota errors safely
    }
  }, [userProfile]);

  const stats = useMemo(
    () => computeDescriptiveStats(state.attempts, state.attendance),
    [state.attempts, state.attendance]
  );
  const knnAccuracy = useMemo(() => evaluateKnnAccuracy(3), []);

  const handleEnterAsStudent = (input: StudentEntryInput) => {
    const { student, isNew } = resolveOrCreateStudentFromEntry(
      input,
      state.students
    );

    if (isNew) {
      setState((prev) => ({
        ...prev,
        students: [...prev.students, student],
      }));
    } else {
      setState((prev) => ({
        ...prev,
        students: prev.students.map((s) => (s.id === student.id ? student : s)),
      }));
    }

    setUserProfile({
      role: 'student',
      studentId: student.id,
      fullName: input.fullName.trim(),
      classroom: input.classroom.trim(),
      academicYear: input.academicYear.trim(),
    });
    setSelectedBookQuizId(undefined);
    setShowRoleGate(false);
    setActiveView('student');
  };

  const handleEnterAsTeacher = (input: TeacherEntryInput) => {
    setUserProfile({
      role: 'teacher',
      fullName: input.fullName.trim(),
      subjectName: input.subjectName.trim(),
      academicYear: input.academicYear.trim(),
    });
    setShowRoleGate(false);
    setActiveView('teacher');
  };

  const handleOpenRoleGate = () => {
    setUserProfile(null);
    setShowRoleGate(true);
  };

  const handleBrowseHome = () => {
    setShowRoleGate(false);
    setActiveView('home');
  };

  const handleStartBookExam = () => {
    setSelectedBookQuizId(state.quizzes[0]?.id ?? SEED_QUIZZES[0].id);
    setShowRoleGate(false);
    setActiveView('student');
  };

  const handleAttemptSubmitted = (attempt: QuizAttempt, student: Student) => {
    const gradeNotification: NotificationItem = {
      id: `notif-${Date.now()}`,
      recipientName: `${student.firstName} ${student.lastName} وولي الأمر`,
      recipientEmail: student.parentEmail,
      audience: 'both',
      eventType: attempt.passed ? 'grade_published' : 'support_alert',
      title: `نشر نتيجة: ${attempt.quizTitle}`,
      message: `حصل الطالب ${attempt.studentName} على ${attempt.score}/${attempt.totalPoints} (${attempt.percentage}% — ${attempt.gradeLabel}).`,
      createdAt: new Date().toISOString(),
      read: false,
    };

    setState((prev) => ({
      ...prev,
      attempts: [...prev.attempts, attempt],
      notifications: [gradeNotification, ...prev.notifications],
    }));
  };

  const handleAddQuiz = (quiz: Quiz) => {
    setState((prev) => ({
      ...prev,
      quizzes: [...prev.quizzes, quiz],
    }));
  };

  const handleAddQuestionToQuiz = (quizId: string, newQuestions: Question[]) => {
    setState((prev) => ({
      ...prev,
      quizzes: prev.quizzes.map((qz) =>
        qz.id === quizId
          ? { ...qz, questions: [...qz.questions, ...newQuestions] }
          : qz
      ),
    }));
  };

  const handleRecordAttendance = (
    student: Student,
    status: AttendanceStatus,
    date: string
  ) => {
    const rec: AttendanceRecord = {
      id: `att-rec-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      classroom: student.classroom,
      date,
      status,
    };

    const newNotifications = [...state.notifications];
    if (status === 'absent') {
      newNotifications.unshift({
        id: `notif-abs-${Date.now()}`,
        recipientName: `ولي أمر ${student.firstName} ${student.lastName}`,
        recipientEmail: student.parentEmail,
        audience: 'parent',
        eventType: 'absence_alert',
        title: 'تنبيه غياب تلقائي (Observer)',
        message: `تم تسجيل غياب الطالب ${student.firstName} ${student.lastName} بتاريخ ${date}.`,
        createdAt: new Date().toISOString(),
        read: false,
      });
    }

    setState((prev) => ({
      ...prev,
      attendance: [...prev.attendance, rec],
      notifications: newNotifications,
    }));
  };

  const handleAddStudent = (student: Student) => {
    setState((prev) => ({
      ...prev,
      students: [...prev.students, student],
    }));
  };

  const handleDispatchAsyncBatchNotifications = async (): Promise<number> => {
    await new Promise((resolve) => setTimeout(resolve, 180));
    const batchNotification: NotificationItem = {
      id: `notif-batch-${Date.now()}`,
      recipientName: 'جميع الطلاب وأولياء الأمور',
      recipientEmail: 'all@damietta.edu.eg',
      audience: 'both',
      eventType: 'grade_published',
      title: 'تقرير الأداء الأسبوعي المجمّع',
      message: `تم إرسال ملخص الدرجات والحضور لـ ${state.students.length} طلاب عبر المهام الخلفية غير المتزامنة.`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setState((prev) => ({
      ...prev,
      notifications: [batchNotification, ...prev.notifications],
    }));
    return state.students.length;
  };

  if (showRoleGate) {
    return (
      <RoleOnboardingGate
        onEnterAsStudent={handleEnterAsStudent}
        onEnterAsTeacher={handleEnterAsTeacher}
        onBrowseHome={handleBrowseHome}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar
        activeView={activeView}
        onNavigate={(view) => {
          if (view === 'student') {
            setSelectedBookQuizId(undefined);
          }
          setActiveView(view);
        }}
        onStartBookExam={handleStartBookExam}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {activeView === 'home' && (
          <HomeView
            featuredQuiz={state.quizzes[0] ?? SEED_QUIZZES[0]}
            stats={stats}
            knnAccuracy={knnAccuracy}
            quizCount={state.quizzes.length}
            sessionProfile={userProfile}
            onStartBookExam={handleStartBookExam}
            onNavigate={setActiveView}
            onSwitchRole={handleOpenRoleGate}
          />
        )}

        {activeView === 'student' && (
          <StudentPortal
            quizzes={state.quizzes}
            students={state.students}
            attempts={state.attempts}
            notifications={state.notifications}
            initialQuizId={selectedBookQuizId}
            activeStudentProfile={
              userProfile?.role === 'student' ? userProfile : null
            }
            onSwitchRole={handleOpenRoleGate}
            onAttemptSubmitted={handleAttemptSubmitted}
          />
        )}

        {activeView === 'teacher' && (
          <TeacherDashboard
            quizzes={state.quizzes}
            students={state.students}
            attempts={state.attempts}
            attendance={state.attendance}
            notifications={state.notifications}
            activeTeacherProfile={
              userProfile?.role === 'teacher' ? userProfile : null
            }
            onSwitchRole={handleOpenRoleGate}
            onAddQuiz={handleAddQuiz}
            onAddQuestionToQuiz={handleAddQuestionToQuiz}
            onRecordAttendance={handleRecordAttendance}
            onAddStudent={handleAddStudent}
            onDispatchAsyncBatchNotifications={handleDispatchAsyncBatchNotifications}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-slate-600 sm:flex-row sm:px-6">
          <span>
            منصة الاختبارات وتحليل الأداء · تصميم وتنفيذ الطالبة:{' '}
            <strong className="text-teal-800">ميرام نبهان (Miram Nabhan)</strong>
          </span>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <button
              type="button"
              onClick={() => setActiveView('home')}
              className="hover:text-teal-800 cursor-pointer"
            >
              الرئيسية
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedBookQuizId(undefined);
                setActiveView('student');
              }}
              className="hover:text-teal-800 cursor-pointer"
            >
              لوحة الطالب
            </button>
            <button
              type="button"
              onClick={() => setActiveView('teacher')}
              className="hover:text-teal-800 cursor-pointer"
            >
              لوحة المعلم
            </button>
            <button
              type="button"
              onClick={handleOpenRoleGate}
              className="font-semibold text-teal-800 hover:underline cursor-pointer"
            >
              تبديل الدور (طالب / معلم)
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
