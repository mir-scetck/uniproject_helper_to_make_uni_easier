import React from 'react';

export type AppView = 'home' | 'student' | 'teacher';

interface NavbarProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onStartBookExam: () => void;
}

const NAV_ITEMS: Array<{ id: AppView; label: string }> = [
  { id: 'home', label: 'الرئيسية' },
  { id: 'student', label: 'لوحة الطالب' },
  { id: 'teacher', label: 'لوحة المعلم' },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onNavigate,
  onStartBookExam,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('home');
          }}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          منصة الاختبارات وتحليل الأداء
        </a>

        <nav
          aria-label="التنقل الرئيسي"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`relative py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700 ${
                  isActive
                    ? 'font-semibold text-teal-800 after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:bg-teal-700'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onStartBookExam}
            className="rounded-lg bg-teal-700 px-4 py-2 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-teal-800 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            ابدأ اختبار الكتاب
          </button>
        </div>
      </div>

      <nav
        aria-label="التنقل للجوال"
        className="flex md:hidden items-center justify-around border-t border-slate-100 px-2 py-2 text-xs font-medium"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`px-2.5 py-1.5 rounded-md whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-teal-50 text-teal-800 font-semibold'
                  : 'text-slate-600'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
