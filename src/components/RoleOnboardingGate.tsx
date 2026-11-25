import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  GraduationCap,
  LayoutDashboard,
} from 'lucide-react';
import type { UserRole } from '../types';
import { SEED_QUIZZES } from '../data/seedData';
import {
  ACADEMIC_YEAR_OPTIONS,
  CLASSROOM_OPTIONS,
  validateStudentEntry,
  validateTeacherEntry,
  type StudentEntryInput,
  type TeacherEntryInput,
} from '../utils/userSession';

interface RoleOnboardingGateProps {
  onEnterAsStudent: (input: StudentEntryInput) => void;
  onEnterAsTeacher: (input: TeacherEntryInput) => void;
  onBrowseHome?: () => void;
}

export const RoleOnboardingGate: React.FC<RoleOnboardingGateProps> = ({
  onEnterAsStudent,
  onEnterAsTeacher,
  onBrowseHome,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  // Student fields: الاسم، الشعبة، الفرقة
  const [studentName, setStudentName] = useState('');
  const [studentClassroom, setStudentClassroom] = useState<string>(
    CLASSROOM_OPTIONS[0]
  );
  const [studentYear, setStudentYear] = useState<string>(
    ACADEMIC_YEAR_OPTIONS[2]
  );

  // Teacher fields: الاسم، المادة، الفرقة
  const [teacherName, setTeacherName] = useState('');
  const [teacherYear, setTeacherYear] = useState<string>(
    ACADEMIC_YEAR_OPTIONS[2]
  );
  const [teacherSubject, setTeacherSubject] = useState<string>('برمجة 2');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const yearSubjects = useMemo(() => {
    const subjects = SEED_QUIZZES.filter(
      (q) => q.academicYear === teacherYear
    ).map((q) => q.subject);
    return Array.from(new Set(subjects));
  }, [teacherYear]);

  const handleRoleSwitch = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMsg(null);
  };

  const handleTeacherYearChange = (nextYear: string) => {
    setTeacherYear(nextYear);
    const firstInYear = SEED_QUIZZES.find(
      (q) => q.academicYear === nextYear
    )?.subject;
    if (firstInYear) {
      setTeacherSubject(firstInYear);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole === 'student') {
      const payload: StudentEntryInput = {
        fullName: studentName,
        classroom: studentClassroom,
        academicYear: studentYear,
      };
      const check = validateStudentEntry(payload);
      if (!check.valid) {
        setErrorMsg(check.error ?? 'يرجى التحقق من البيانات المدخلة.');
        return;
      }
      setErrorMsg(null);
      onEnterAsStudent(payload);
      return;
    }

    const payload: TeacherEntryInput = {
      fullName: teacherName,
      subjectName: teacherSubject,
      academicYear: teacherYear,
    };
    const check = validateTeacherEntry(payload);
    if (!check.valid) {
      setErrorMsg(check.error ?? 'يرجى التحقق من البيانات المدخلة.');
      return;
    }
    setErrorMsg(null);
    onEnterAsTeacher(payload);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between py-8 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        {/* Compact Hero Backdrop Banner */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 px-6 py-8 sm:px-10 sm:py-10">
          {!heroImgFailed ? (
            <img
              src="/src/assets/images/hero_backdrop_miram_1795629743327.jpg"
              alt="خلفية توضيحية لمنصة الاختبارات وتحليل الأداء"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgFailed(true)}
              className="absolute inset-0 h-full w-full object-cover object-right"
            />
          ) : (
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-l from-slate-900 via-teal-950 to-slate-900"
            />
          )}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-l from-slate-950/92 via-slate-950/80 to-slate-950/75"
          />
          <div className="relative z-10 space-y-2.5 max-w-2xl">
            <p className="text-xs font-medium text-teal-200">
              جامعة دمياط · كلية التربية النوعية بدمياط الجديدة · شعب: حاسب آلي · موسيقية · إعلام
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              منصة الاختبارات وتحليل الأداء
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-amber-200">
              إعداد وتصميم الطالبة: ميرام نبهان (Miram Nabhan)
            </p>
          </div>
        </section>

        {/* Role Question & Conditional Form */}
        <section
          aria-labelledby="role-gate-heading"
          className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6"
        >
          <div className="space-y-1.5 text-center sm:text-right">
            <h2
              id="role-gate-heading"
              className="font-display text-xl sm:text-2xl font-bold text-slate-900"
            >
              مرحباً بك! هل أنت طالب أم معلم؟
            </h2>
            <p className="text-sm text-slate-600">
              اختر صفتك وأدخل بياناتك ليتم توجيهك مباشرةً إلى اختبارات شعبتك وفرقتك أو لوحة المعلم.
            </p>
          </div>

          {/* Role Selection Cards */}
          <div
            role="radiogroup"
            aria-label="تحديد صفة المستخدم"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <button
              type="button"
              role="radio"
              aria-checked={selectedRole === 'student'}
              onClick={() => handleRoleSwitch('student')}
              className={`flex items-center gap-4 rounded-2xl border-2 p-4 text-right transition-all cursor-pointer ${
                selectedRole === 'student'
                  ? 'border-teal-700 bg-teal-50/60 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <img
                src="/src/assets/images/cute_student_quiz_1795629744089.jpg"
                alt="رسم توضيحي للطالب"
                referrerPolicy="no-referrer"
                className="h-20 w-24 shrink-0 rounded-xl object-cover border border-slate-200/80"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-teal-800">
                  <GraduationCap className="h-4 w-4" aria-hidden="true" />
                  <span className="font-display text-base font-bold text-slate-900">
                    أنا طالب
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">
                  حل اختبارات مواد التخصص بشعبتك + المواد التربوية لفرقتك.
                </p>
              </div>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={selectedRole === 'teacher'}
              onClick={() => handleRoleSwitch('teacher')}
              className={`flex items-center gap-4 rounded-2xl border-2 p-4 text-right transition-all cursor-pointer ${
                selectedRole === 'teacher'
                  ? 'border-blue-700 bg-blue-50/50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <img
                src="/src/assets/images/cute_analytics_charts_1795629745117.jpg"
                alt="رسم توضيحي للمعلم"
                referrerPolicy="no-referrer"
                className="h-20 w-24 shrink-0 rounded-xl object-cover border border-slate-200/80"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-blue-800">
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                  <span className="font-display text-base font-bold text-slate-900">
                    أنا معلم
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">
                  إدارة اختبارات الشُعب، رصد الحضور، وتحليلات الأداء و KNN.
                </p>
              </div>
            </button>
          </div>

          {/* Conditional Inputs Form */}
          <form onSubmit={handleSubmit} className="space-y-5 border-t border-slate-100 pt-6">
            {errorMsg && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-700" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            {selectedRole === 'student' ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="gate-student-name"
                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                  >
                    الاسم
                  </label>
                  <input
                    id="gate-student-name"
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="اكتب اسمك الكامل..."
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="gate-student-classroom"
                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                  >
                    الشعبة
                  </label>
                  <select
                    id="gate-student-classroom"
                    value={studentClassroom}
                    onChange={(e) => setStudentClassroom(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-none"
                  >
                    {CLASSROOM_OPTIONS.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="gate-student-year"
                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                  >
                    الفرقة
                  </label>
                  <select
                    id="gate-student-year"
                    value={studentYear}
                    onChange={(e) => setStudentYear(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-none"
                  >
                    {ACADEMIC_YEAR_OPTIONS.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="gate-teacher-name"
                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                  >
                    الاسم
                  </label>
                  <input
                    id="gate-teacher-name"
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="مثال: د/ صفاء العطوى"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-700 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="gate-teacher-year"
                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                  >
                    الفرقة
                  </label>
                  <select
                    id="gate-teacher-year"
                    value={teacherYear}
                    onChange={(e) => handleTeacherYearChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-700 focus:bg-white focus:outline-none"
                  >
                    {ACADEMIC_YEAR_OPTIONS.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="gate-teacher-subject"
                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                  >
                    المادة
                  </label>
                  <input
                    id="gate-teacher-subject"
                    type="text"
                    list="teacher-subject-options"
                    value={teacherSubject}
                    onChange={(e) => setTeacherSubject(e.target.value)}
                    placeholder="اختر أو اكتب اسم المادة..."
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-700 focus:bg-white focus:outline-none"
                  />
                  <datalist id="teacher-subject-options">
                    {yearSubjects.map((subj) => (
                      <option key={subj} value={subj} />
                    ))}
                  </datalist>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              {onBrowseHome ? (
                <button
                  type="button"
                  onClick={onBrowseHome}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-teal-800 cursor-pointer"
                >
                  <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>عرض نظرة عامة على المنصة أولاً</span>
                </button>
              ) : (
                <span />
              )}

              <button
                type="submit"
                className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors cursor-pointer ${
                  selectedRole === 'student'
                    ? 'bg-teal-700 hover:bg-teal-800'
                    : 'bg-blue-700 hover:bg-blue-800'
                }`}
              >
                <span>
                  {selectedRole === 'student'
                    ? 'دخول إلى لوحة الطالب'
                    : 'دخول إلى لوحة المعلم'}
                </span>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </form>
        </section>
      </div>

      <footer className="mx-auto mt-8 w-full max-w-4xl text-center text-xs text-slate-500">
        منصة الاختبارات وتحليل الأداء · تصميم وتنفيذ الطالبة:{' '}
        <strong className="text-teal-800">ميرام نبهان (Miram Nabhan)</strong>
      </footer>
    </div>
  );
};
