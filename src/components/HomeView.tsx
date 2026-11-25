import React, { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  LayoutDashboard,
  Sparkles,
} from 'lucide-react';
import type { Quiz, UserSessionProfile } from '../types';
import type { DescriptiveStats } from '../utils/analytics';
import type { AppView } from './Navbar';

interface HomeViewProps {
  featuredQuiz: Quiz;
  stats: DescriptiveStats;
  knnAccuracy: number;
  quizCount: number;
  sessionProfile?: UserSessionProfile | null;
  onStartBookExam: () => void;
  onNavigate: (view: AppView) => void;
  onSwitchRole?: () => void;
}

interface IllustratedGuideCard {
  title: string;
  subtitle: string;
  description: string;
  image: string;
  alt: string;
}

const BOOK_ARCHITECTURE_CARDS: IllustratedGuideCard[] = [
  {
    title: 'مصنع الأسئلة ومولدات CSV',
    subtitle: 'OOP + Factory Method + yield & with',
    description:
      'تمثيل الطالب والمعلم عبر الوراثة من الفئة المجردة Person باستخدام super()، وبناء الأسئلة بمرونة مع قراءة وتصدير ملفات CSV سطراً بسطر لتوفير الذاكرة.',
    image: '/src/assets/images/cute_csv_factory_1795629745358.jpg',
    alt: 'رسم توضيحي لأنواع الأسئلة الثلاثة واستيراد بيانات CSV',
  },
  {
    title: 'التصحيح الوظيفي والتحقق الآمن',
    subtitle: 'Pure Functions + map/filter + Regex',
    description:
      'حساب الدرجات والنسب بدوال خالصة لا تعدّل البيانات الأصلية، مع فحص جميع المدخلات بالعبارات النمطية re ومعالجة الاستثناءات في try/except/finally.',
    image: '/src/assets/images/hero_python_learning_1795627874426.jpg',
    alt: 'بيئة تعلم برمجة بايثون والاختبارات التفاعلية',
  },
  {
    title: 'متابعة الحضور وإشعارات Observer',
    subtitle: 'Observer Pattern + asyncio',
    description:
      'رصد حضور وغياب الطلاب يومياً، وتوليد إشعارات تلقائية فورية للطالب وولي الأمر عند إعلان الدرجات أو تسجيل الغياب مع الإرسال غير المتزامن.',
    image: '/src/assets/images/cute_attendance_bell_1795629746816.jpg',
    alt: 'رسم توضيحي لطيف لسجل الحضور وجرس الإشعارات الفورية',
  },
  {
    title: 'التحليلات البيانية وتنبؤ KNN',
    subtitle: 'Pandas + Matplotlib + Scikit-learn',
    description:
      'تحليل إحصائي لمتوسطات الشعب وتطور الأداء برسوم شريطية وخطية، وتطبيق مصنّف KNeighborsClassifier مع train_test_split لاكتشاف الحالات المحتاجة للدعم.',
    image: '/src/assets/images/cute_ai_knn_1795629746760.jpg',
    alt: 'رسم توضيحي لنموذج تصنيف الجيران الأقرب KNN بالذكاء الاصطناعي',
  },
];

const GUI_SIX_RULES = [
  {
    name: 'البساطة',
    detail: 'تقليل التعقيد وعرض المعلومات الأساسية بوضوح في كل شاشة.',
  },
  {
    name: 'التناسق',
    detail: 'توحيد الألوان والخطوط العربية وتوزيع البطاقات عبر المنصة.',
  },
  {
    name: 'الكفاءة',
    detail: 'تمكين الطالب والمعلم من إنجاز المهام بأقل عدد من الخطوات.',
  },
  {
    name: 'التغذية الراجعة',
    detail: 'إظهار رسائل نجاح وتنبيه فورية وتوضيح الإجابة الصحيحة ومرجعها.',
  },
  {
    name: 'المرونة',
    detail: 'دعم أنواع أسئلة متعددة ومحاكي KNN تفاعلي واستجابة لمختلف الشاشات.',
  },
  {
    name: 'الوصولية',
    detail: 'تباين لوني مريح ودعم اتجاه RTL وقابلية استخدام بلوحة المفاتيح.',
  },
];

export const HomeView: React.FC<HomeViewProps> = ({
  featuredQuiz,
  stats,
  knnAccuracy,
  quizCount,
  sessionProfile,
  onStartBookExam,
  onNavigate,
  onSwitchRole,
}) => {
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  return (
    <div className="space-y-12">
      {/* Hero Banner with Picture Behind the Main Title */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 min-h-[390px] sm:min-h-[430px] flex items-center">
        {!heroImgFailed ? (
          <img
            src="/src/assets/images/hero_backdrop_miram_1795629743327.jpg"
            alt="خلفية توضيحية لطالبة تدوّن ملاحظات برمجة بايثون وتصميم واجهات المستخدم الرسومية"
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

        {/* Measured multi-stop scrim so the white title & student credit stay crisp and legible */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-l from-slate-950/92 via-slate-950/78 to-slate-950/75"
        />

        <div className="relative z-10 w-full px-6 py-10 sm:px-12 sm:py-14">
          <div className="max-w-3xl space-y-5">
            <p className="text-xs font-medium text-teal-200">
              جامعة دمياط · كلية التربية النوعية بدمياط الجديدة · شعب: حاسب آلي · موسيقية · إعلام
            </p>

            <h1 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-[2.75rem]">
              منصة الاختبارات وتحليل الأداء
            </h1>

            <p className="text-sm sm:text-base font-semibold text-amber-200">
              إعداد وتصميم الطالبة: ميرام نبهان (Miram Nabhan)
            </p>

            <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-slate-100">
              بيئة تعليمية تفاعلية لكلية التربية النوعية بدمياط الجديدة تغطي الفرق الدراسية الأربع
              لشُعب (حاسب آلي، موسيقية، إعلام) بمقرراتها التخصصية الفريدة بالإضافة إلى 3 مواد تربوية
              مشتركة لكل فرقة، مع تصحيح تلقائي فوري وتحليل أداء بخوارزمية KNN.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={onStartBookExam}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-500 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>ابدأ اختبار كتاب بايثون 2</span>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('teacher')}
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>استعراض لوحة المعلم</span>
              </button>
              {onSwitchRole && (
                <button
                  type="button"
                  onClick={onSwitchRole}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-200/40 bg-amber-500/15 px-4 py-3 text-xs sm:text-sm font-semibold text-amber-100 backdrop-blur-sm transition-colors hover:bg-amber-500/25 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>
                    {sessionProfile
                      ? `تبديل الدور (${sessionProfile.role === 'student' ? 'طالب' : 'معلم'}: ${sessionProfile.fullName})`
                      : 'تحديد الدور (طالب / معلم)'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Full-width 4-column summary metrics strip */}
      <section
        aria-label="ملخص مؤشرات المنصة"
        className="grid grid-cols-2 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white sm:grid-cols-4 sm:divide-y-0 sm:divide-x sm:divide-x-reverse"
      >
        <div className="p-5 sm:p-6">
          <p className="text-xs font-medium text-slate-500">الاختبارات النشطة</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {quizCount}
          </p>
        </div>
        <div className="p-5 sm:p-6">
          <p className="text-xs font-medium text-slate-500">متوسط درجات الطلاب</p>
          <p className="mt-2 font-display text-2xl font-bold text-teal-800 tabular-nums">
            {stats.mean}%
          </p>
        </div>
        <div className="p-5 sm:p-6">
          <p className="text-xs font-medium text-slate-500">نسبة النجاح الحالية</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {stats.passRate}%
          </p>
        </div>
        <div className="p-5 sm:p-6">
          <p className="text-xs font-medium text-slate-500">دقة نموذج KNN</p>
          <p className="mt-2 font-display text-2xl font-bold text-blue-700 tabular-nums">
            {knnAccuracy}%
          </p>
        </div>
      </section>

      {/* Illustrated Guide to Main Platform Tabs */}
      <section aria-labelledby="tabs-guide-heading" className="space-y-5">
        <div className="flex flex-col gap-1">
          <h2 id="tabs-guide-heading" className="font-display text-2xl font-bold text-slate-900">
            أقسام المنصة وما يقدمه كل تبويب
          </h2>
          <p className="text-sm text-slate-600">
            انتقل بسهولة بين بوابة الطالب التفاعلية ولوحة تحكم المعلم المصممة بوضوح وبساطة.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <button
            type="button"
            onClick={() => onNavigate('student')}
            className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-right transition-all hover:border-teal-600 hover:shadow-sm cursor-pointer sm:flex-row"
          >
            <div className="sm:w-48 shrink-0 overflow-hidden bg-teal-50">
              <img
                src="/src/assets/images/cute_student_quiz_1795629744089.jpg"
                alt="رسم توضيحي لبوابة الطالب والاختبارات التفاعلية"
                referrerPolicy="no-referrer"
                className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] sm:h-full"
              />
            </div>
            <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-teal-800">
                  <GraduationCap className="h-4 w-4" aria-hidden="true" />
                  <span className="text-xs font-semibold">تبويب بوابة الطالب</span>
                </div>
                <h3 className="font-display text-xl font-bold text-slate-900">
                  لوحة الطالب — الحل والتصحيح الفوري
                </h3>
                <p className="text-xs leading-relaxed text-slate-600">
                  تتيح للطالب اختيار حسابه وحل أسئلة الاختيار من متعدد وصح وخطأ وإكمال
                  الفراغات، مع عرض النتيجة وزمن التصحيح ومرجع كل سؤال من الكتاب والإشعارات.
                </p>
              </div>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800">
                <span>الدخول إلى لوحة الطالب</span>
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('teacher')}
            className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-right transition-all hover:border-teal-600 hover:shadow-sm cursor-pointer sm:flex-row"
          >
            <div className="sm:w-48 shrink-0 overflow-hidden bg-blue-50">
              <img
                src="/src/assets/images/cute_analytics_charts_1795629745117.jpg"
                alt="رسم توضيحي للوحة المعلم والرسوم البيانية وتحليل الدرجات"
                referrerPolicy="no-referrer"
                className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] sm:h-full"
              />
            </div>
            <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-800">
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                  <span className="text-xs font-semibold">تبويب إدارة المقرر</span>
                </div>
                <h3 className="font-display text-xl font-bold text-slate-900">
                  لوحة المعلم — التحليلات والـ AI
                </h3>
                <p className="text-xs leading-relaxed text-slate-600">
                  تضم 4 تبويبات مصورة: التحليلات والرسوم البيانية، إنشاء الاختبارات
                  واستيراد CSV، رصد الحضور وإشعارات Observer، وتنبؤات الذكاء الاصطناعي KNN.
                </p>
              </div>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-800">
                <span>الدخول إلى لوحة المعلم</span>
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </div>
          </button>
        </div>
      </section>

      {/* Featured Book Exam Showcase */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <BookOpen className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
              <span>نموذج تطبيقي من الكتاب المرفق</span>
              <span aria-hidden="true">·</span>
              <span>مقرر د/ صفاء محمود العطوى</span>
              <span aria-hidden="true">·</span>
              <span>{featuredQuiz.questions.length} أسئلة</span>
              <span aria-hidden="true">·</span>
              <span>{featuredQuiz.durationMinutes} دقيقة</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-900">
              {featuredQuiz.title}
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              {featuredQuiz.description}
            </p>
          </div>

          <button
            type="button"
            onClick={onStartBookExam}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>بدء الحل والتصحيح الفوري</span>
          </button>
        </div>
      </section>

      {/* Illustrated Book Architecture Cards */}
      <section aria-labelledby="architecture-heading" className="space-y-5">
        <div className="flex flex-col gap-1">
          <h2 id="architecture-heading" className="font-display text-2xl font-bold text-slate-900">
            كيف تعمل المنصة؟ شرح مصوّر للمكونات البرمجية
          </h2>
          <p className="text-sm text-slate-600">
            صُممت المنصة لتجسّد المفاهيم العملية في كتاب «برمجة البايثون 2» وتقديمها بأسلوب بصري مبسّط.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {BOOK_ARCHITECTURE_CARDS.map((card) => (
            <article
              key={card.title}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row"
            >
              <div className="sm:w-44 shrink-0 bg-slate-100">
                <img
                  src={card.image}
                  alt={card.alt}
                  referrerPolicy="no-referrer"
                  className="h-44 w-full object-cover sm:h-full"
                />
              </div>
              <div className="p-5 flex flex-col justify-center space-y-2">
                <p className="font-mono text-[11px] font-medium text-teal-800" dir="ltr">
                  {card.subtitle}
                </p>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  {card.title}
                </h3>
                <p className="text-xs leading-relaxed text-slate-600">
                  {card.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 6 GUI Principles from Page 49 of the Attached Book */}
      <section
        aria-labelledby="gui-rules-heading"
        className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-5"
      >
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-700" aria-hidden="true" />
            <h2 id="gui-rules-heading" className="font-display text-xl font-bold text-slate-900">
              قواعد تصميم واجهة المستخدم التفاعلية (ص 49 من الكتاب)
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-500">
            تطبيق الطالبة ميرام نبهان
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GUI_SIX_RULES.map((rule, idx) => (
            <div
              key={rule.name}
              className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 space-y-1"
            >
              <p className="font-display text-sm font-bold text-teal-900">
                {idx + 1}. {rule.name}
              </p>
              <p className="text-xs leading-relaxed text-slate-600">{rule.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
