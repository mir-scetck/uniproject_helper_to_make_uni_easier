import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Bell,
  BookOpen,
  CheckCircle2,
  RotateCcw,
  Send,
  XCircle,
} from 'lucide-react';
import type {
  NotificationItem,
  QuestionType,
  Quiz,
  QuizAttempt,
  Student,
  StudentSessionProfile,
} from '../types';
import { gradeQuizPure } from '../utils/grading';
import { getQuizzesForStudent } from '../utils/userSession';

interface StudentPortalProps {
  quizzes: Quiz[];
  students: Student[];
  attempts: QuizAttempt[];
  notifications: NotificationItem[];
  initialQuizId?: string;
  activeStudentProfile?: StudentSessionProfile | null;
  onSwitchRole?: () => void;
  onAttemptSubmitted: (attempt: QuizAttempt, student: Student) => void;
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: 'اختيار من متعدد',
  true_false: 'صح وخطأ',
  fill_blank: 'إكمال الفراغات',
};

export const StudentPortal: React.FC<StudentPortalProps> = ({
  quizzes,
  students,
  attempts,
  notifications,
  initialQuizId,
  activeStudentProfile,
  onSwitchRole,
  onAttemptSubmitted,
}) => {
  const activeQuizzes = quizzes.filter((q) => q.isActive);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    activeStudentProfile?.studentId || students[0]?.id || ''
  );
  const [quizScope, setQuizScope] = useState<
    'my_all' | 'specialized' | 'pedagogical' | 'browse_all'
  >('my_all');
  const [selectedQuizId, setSelectedQuizId] = useState<string>(
    initialQuizId || ''
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [latestAttempt, setLatestAttempt] = useState<QuizAttempt | null>(null);

  const currentStudent =
    students.find((s) => s.id === selectedStudentId) ?? students[0];

  const studentCurriculum = getQuizzesForStudent(
    quizzes,
    currentStudent?.classroom ?? 'حاسب آلي',
    currentStudent?.academicYear ?? 'الفرقة الثالثة'
  );

  const displayedQuizzes =
    quizScope === 'specialized'
      ? studentCurriculum.specialized
      : quizScope === 'pedagogical'
        ? studentCurriculum.pedagogical
        : quizScope === 'browse_all'
          ? activeQuizzes
          : studentCurriculum.allForStudent.length > 0
            ? studentCurriculum.allForStudent
            : activeQuizzes;

  useEffect(() => {
    if (
      activeStudentProfile?.studentId &&
      students.some((s) => s.id === activeStudentProfile.studentId)
    ) {
      setSelectedStudentId(activeStudentProfile.studentId);
    }
  }, [activeStudentProfile?.studentId, students]);

  useEffect(() => {
    if (initialQuizId && activeQuizzes.some((q) => q.id === initialQuizId)) {
      const target = activeQuizzes.find((q) => q.id === initialQuizId);
      if (
        target &&
        currentStudent &&
        target.academicYear !== currentStudent.academicYear
      ) {
        setQuizScope('browse_all');
      }
      setSelectedQuizId(initialQuizId);
      setAnswers({});
      setLatestAttempt(null);
      setValidationError(null);
    }
  }, [initialQuizId]);

  useEffect(() => {
    if (
      displayedQuizzes.length > 0 &&
      !displayedQuizzes.some((q) => q.id === selectedQuizId)
    ) {
      setSelectedQuizId(displayedQuizzes[0].id);
      setAnswers({});
      setLatestAttempt(null);
      setValidationError(null);
    }
  }, [currentStudent?.id, quizScope]);

  const currentQuiz =
    displayedQuizzes.find((q) => q.id === selectedQuizId) ??
    displayedQuizzes[0] ??
    activeQuizzes[0];

  const studentAttempts = attempts.filter(
    (a) => a.studentId === currentStudent?.id
  );
  const studentNotifications = notifications.filter(
    (n) =>
      currentStudent &&
      (n.recipientName.includes(currentStudent.firstName) ||
        n.recipientEmail === currentStudent.email ||
        n.recipientEmail === currentStudent.parentEmail)
  );

  const handleSelectQuiz = (quizId: string) => {
    setSelectedQuizId(quizId);
    setAnswers({});
    setLatestAttempt(null);
    setValidationError(null);
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (validationError) setValidationError(null);
  };

  const handleSubmitExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuiz || !currentStudent) return;

    const unansweredIndex = currentQuiz.questions.findIndex(
      (q) => !(answers[q.id] || '').trim()
    );
    if (unansweredIndex !== -1) {
      setValidationError(
        `يرجى الإجابة على السؤال رقم ${unansweredIndex + 1} قبل إرسال الاختبار.`
      );
      return;
    }

    try {
      const attempt = gradeQuizPure(
        currentQuiz,
        {
          id: currentStudent.id,
          name: `${currentStudent.firstName} ${currentStudent.lastName}`,
          classroom: currentStudent.classroom,
        },
        answers
      );
      setLatestAttempt(attempt);
      setValidationError(null);
      onAttemptSubmitted(attempt, currentStudent);
    } catch (err) {
      setValidationError(
        err instanceof Error ? err.message : 'حدث خطأ غير متوقع أثناء التصحيح.'
      );
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setLatestAttempt(null);
    setValidationError(null);
  };

  return (
    <div className="space-y-8">
      {/* Cute Illustrated Header & Student Selector */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col md:flex-row md:items-center">
          <div className="md:w-64 shrink-0 bg-teal-50">
            <img
              src="/src/assets/images/cute_student_quiz_1795629744089.jpg"
              alt="رسم توضيحي لطالبة تحل الاختبار التفاعلي وتحصل على تغذية راجعة فورية"
              referrerPolicy="no-referrer"
              className="h-48 w-full object-cover md:h-full"
            />
          </div>

          <div className="flex flex-1 flex-col justify-between gap-5 p-6 lg:flex-row lg:items-center">
            <div className="space-y-2 max-w-2xl">
              <p className="text-xs font-semibold text-teal-800">
                {activeStudentProfile
                  ? `أهلاً بك يا ${activeStudentProfile.fullName} · ${activeStudentProfile.classroom} · ${activeStudentProfile.academicYear}`
                  : 'بوابة الطالب التفاعلية · تصميم الطالبة ميرام نبهان'}
              </p>
              <h1 className="font-display text-2xl font-bold text-slate-900">
                لوحة الطالب — الاختبارات والنتائج الفورية
              </h1>
              <p className="text-sm leading-relaxed text-slate-600">
                يتيح لك هذا التبويب اختيار حسابك والاختبار المطلوب، والإجابة على أسئلة
                الاختيار من متعدد (Radiobutton) وإكمال الفراغات (Entry)، ثم الحصول على
                التصحيح التلقائي وزمن التنفيذ ومراجعة مرجع كل سؤال من كتاب بايثون 2.
              </p>
            </div>

            <div className="flex flex-col items-stretch sm:items-end gap-2.5 shrink-0">
              <div className="flex items-center gap-3">
                <label
                  htmlFor="student-select"
                  className="text-sm font-medium text-slate-700 whitespace-nowrap"
                >
                  حساب الطالب:
                </label>
                <select
                  id="student-select"
                  value={selectedStudentId}
                  onChange={(e) => {
                    setSelectedStudentId(e.target.value);
                    setQuizScope('my_all');
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-teal-700 focus:outline-none"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} ({s.classroom} · {s.academicYear})
                    </option>
                  ))}
                </select>
              </div>
              {onSwitchRole && (
                <button
                  type="button"
                  onClick={onSwitchRole}
                  className="text-xs font-semibold text-teal-800 hover:underline self-end cursor-pointer"
                >
                  تبديل الدور (طالب / معلم)
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Curriculum Filter Tabs for Student's Department & Year */}
      <section aria-label="اختبارات الشعبة والفرقة" className="space-y-4">
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              اختبارات شعبة {currentStudent?.classroom} · {currentStudent?.academicYear}
            </h2>
            <p className="text-xs text-slate-600">
              يظهر لك {studentCurriculum.specialized.length} مواد تخصصية للشعبة +{' '}
              {studentCurriculum.pedagogical.length} مواد تربوية مشتركة لكل شعب{' '}
              {currentStudent?.academicYear}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                {
                  id: 'my_all',
                  label: `مقرراتي (${studentCurriculum.allForStudent.length})`,
                },
                {
                  id: 'specialized',
                  label: `التخصص (${studentCurriculum.specialized.length})`,
                },
                {
                  id: 'pedagogical',
                  label: `التربوية (${studentCurriculum.pedagogical.length})`,
                },
                {
                  id: 'browse_all',
                  label: `كل الكلية (${activeQuizzes.length})`,
                },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setQuizScope(f.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  quizScope === f.id
                    ? 'bg-teal-700 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayedQuizzes.map((quiz) => {
            const isSelected = currentQuiz?.id === quiz.id;
            const isPed = quiz.courseCategory === 'pedagogical';
            return (
              <button
                key={quiz.id}
                type="button"
                onClick={() => handleSelectQuiz(quiz.id)}
                className={`rounded-2xl border p-4 text-right transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-teal-700 bg-teal-50/40'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[11px] font-semibold ${
                      isPed ? 'text-blue-800' : 'text-teal-800'
                    }`}
                  >
                    {isPed
                      ? `تربوي مشترك · ${quiz.academicYear}`
                      : `${quiz.department ?? 'تخصص'} · ${quiz.academicYear}`}
                  </span>
                  {isSelected && (
                    <span className="text-[11px] font-semibold text-teal-800">
                      محدد للحل
                    </span>
                  )}
                </div>
                <h3 className="mt-1.5 font-display text-base font-bold text-slate-900">
                  {quiz.subject}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {quiz.questions.length} أسئلة · {quiz.durationMinutes} دقيقة
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 line-clamp-2">
                  {quiz.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Split: Exam Area + Student History/Notifications */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
          {/* Result Feedback Banner & Review */}
          {latestAttempt && currentQuiz && (
            <section
              aria-live="polite"
              className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6"
            >
              <div
                className={`flex flex-col justify-between gap-4 rounded-xl border p-5 sm:flex-row sm:items-center ${
                  latestAttempt.passed
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                    : 'border-rose-200 bg-rose-50 text-rose-950'
                }`}
              >
                <div className="flex items-start gap-3">
                  {latestAttempt.passed ? (
                    <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" aria-hidden="true" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-rose-700" aria-hidden="true" />
                  )}
                  <div>
                    <h3 className="font-display text-lg font-bold">
                      {latestAttempt.passed
                        ? 'أحسنت! تم اجتياز الاختبار بنجاح'
                        : 'تحتاج إلى مراجعة إضافية في هذا المقرر'}
                    </h3>
                    <p className="mt-1 text-sm">
                      الدرجة النهائية:{' '}
                      <strong className="font-mono tabular-nums">
                        {latestAttempt.score} / {latestAttempt.totalPoints}
                      </strong>{' '}
                      ({latestAttempt.percentage}% — التقدير: {latestAttempt.gradeLabel}) · زمن التصحيح:{' '}
                      <span className="font-mono tabular-nums">
                        {latestAttempt.executionTimeMs}ms
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRetake}
                  className="inline-flex items-center gap-2 rounded-lg border border-current/20 bg-white px-4 py-2 text-xs font-semibold transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>إعادة المحاولة</span>
                </button>
              </div>

              <div className="space-y-4">
                <h4 className="font-display text-base font-bold text-slate-900">
                  مراجعة الإجابات والتغذية الراجعة
                </h4>
                {currentQuiz.questions.map((q, idx) => {
                  const rec = latestAttempt.answers.find(
                    (a) => a.questionId === q.id
                  );
                  const isCorrect = rec?.isCorrect ?? false;
                  return (
                    <div
                      key={q.id}
                      className={`rounded-xl border p-4 ${
                        isCorrect
                          ? 'border-emerald-200 bg-emerald-50/30'
                          : 'border-rose-200 bg-rose-50/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900">
                          {idx + 1}. {q.prompt}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap shrink-0 ${
                            isCorrect ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {isCorrect ? (
                            <>
                              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                              <span>إجابة صحيحة (+{q.points})</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4" aria-hidden="true" />
                              <span>إجابة خاطئة (0/{q.points})</span>
                            </>
                          )}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-700">
                        <span>
                          إجابتك: <strong>{rec?.submittedAnswer || '—'}</strong>
                        </span>
                        {!isCorrect && (
                          <span>
                            الإجابة الصحيحة:{' '}
                            <strong className="text-emerald-800">
                              {q.correctAnswer}
                            </strong>
                          </span>
                        )}
                        {q.bookReference && (
                          <span className="text-slate-500">
                            المرجع: {q.bookReference}
                          </span>
                        )}
                      </div>

                      {q.explanation && (
                        <p className="mt-2 text-xs leading-relaxed text-slate-600">
                          {q.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Exam Form */}
          {!latestAttempt && currentQuiz && (
            <form
              onSubmit={handleSubmitExam}
              className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6"
            >
              <div className="border-b border-slate-100 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-xl font-bold text-slate-900">
                    {currentQuiz.title}
                  </h2>
                  <span className="font-mono text-xs font-medium text-slate-500 tabular-nums">
                    {Object.values(answers).filter((v) => v.trim().length > 0).length} /{' '}
                    {currentQuiz.questions.length} مُجاب
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {currentQuiz.description}
                </p>
              </div>

              {validationError && (
                <div
                  role="alert"
                  className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-700" aria-hidden="true" />
                  <span>{validationError}</span>
                </div>
              )}

              <div className="space-y-6">
                {currentQuiz.questions.map((q, index) => (
                  <fieldset
                    key={q.id}
                    className="rounded-xl border border-slate-200 p-5 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span>
                        السؤال {index + 1} · {QUESTION_TYPE_LABELS[q.type]}
                        {q.bookReference ? ` · ${q.bookReference}` : ''}
                      </span>
                      <span className="font-mono font-semibold text-slate-700 tabular-nums">
                        {q.points} درجات
                      </span>
                    </div>

                    <legend className="text-base font-semibold leading-relaxed text-slate-900">
                      {q.prompt}
                    </legend>

                    {q.type === 'fill_blank' ? (
                      <div className="pt-1">
                        <label htmlFor={`input-${q.id}`} className="sr-only">
                          إجابة السؤال {index + 1}
                        </label>
                        <input
                          id={`input-${q.id}`}
                          type="text"
                          dir="auto"
                          value={answers[q.id] ?? ''}
                          onChange={(e) =>
                            handleAnswerChange(q.id, e.target.value)
                          }
                          placeholder="اكتب الكلمة أو الدالة المطلوبة هنا..."
                          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-none"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1">
                        {(q.options ?? ['صح', 'خطأ']).map((option) => {
                          const checked = answers[q.id] === option;
                          return (
                            <label
                              key={option}
                              className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                                checked
                                  ? 'border-teal-700 bg-teal-50/60 font-medium text-teal-950'
                                  : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`question-${q.id}`}
                                value={option}
                                checked={checked}
                                onChange={() =>
                                  handleAnswerChange(q.id, option)
                                }
                                className="h-4 w-4 accent-teal-700"
                              />
                              <span dir="auto">{option}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </fieldset>
                ))}
              </div>

              <div className="flex items-center justify-end border-t border-slate-100 pt-5">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-800 cursor-pointer"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span>إرسال الإجابات والتصحيح التلقائي</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Sidebar: Student Attempts & Observer Notifications */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-teal-700" aria-hidden="true" />
              <h3 className="font-display text-base font-bold text-slate-900">
                سجل درجات الطالب
              </h3>
            </div>
            {studentAttempts.length === 0 ? (
              <p className="text-xs text-slate-500">
                لم يقم هذا الطالب بحل أي اختبار بعد.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {studentAttempts.map((att) => (
                  <li key={att.id} className="py-3 text-sm">
                    <p className="font-medium text-slate-800 line-clamp-1">
                      {att.quizTitle}
                    </p>
                    <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                      <span>{att.gradeLabel}</span>
                      <span className="font-mono font-semibold text-teal-800 tabular-nums">
                        {att.score}/{att.totalPoints} ({att.percentage}%)
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-700" aria-hidden="true" />
              <h3 className="font-display text-base font-bold text-slate-900">
                الإشعارات التلقائية (Observer)
              </h3>
            </div>
            {studentNotifications.length === 0 ? (
              <p className="text-xs text-slate-500">
                لا توجد إشعارات مسجلة لهذا الطالب حالياً.
              </p>
            ) : (
              <ul className="space-y-3">
                {studentNotifications.map((notif) => (
                  <li
                    key={notif.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs space-y-1"
                  >
                    <p className="font-semibold text-slate-900">{notif.title}</p>
                    <p className="leading-relaxed text-slate-600">
                      {notif.message}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
