import type { Quiz, Student } from '../types';
import {
  ACADEMIC_YEAR_OPTIONS,
  DEPARTMENT_OPTIONS,
} from '../data/curriculumCatalog';
import {
  validatePersonName,
  validateTextLength,
  type ValidationResult,
} from './validators';

export { ACADEMIC_YEAR_OPTIONS, DEPARTMENT_OPTIONS };
export const CLASSROOM_OPTIONS = DEPARTMENT_OPTIONS;

export const SUBJECT_SUGGESTIONS = [
  'برمجة 2',
  'روبوتات',
  'الرسم بالحاسب',
  'النظم الذكية',
  'الوسائط المتعددة',
  'برمجة البايثون 2 وواجهات المستخدم الرسومية',
  'الموسيقى العربية والمقامات الشرقية',
  'المونتاج الرقمي وصناعة الفيديو التعليمي',
  'طرق التدريس العامة واستراتيجيات التعلم',
] as const;

export interface StudentEntryInput {
  fullName: string;
  classroom: string;
  academicYear: string;
}

export interface TeacherEntryInput {
  fullName: string;
  subjectName: string;
  academicYear: string;
}

export function splitArabicFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

export function validateStudentEntry(input: StudentEntryInput): ValidationResult {
  const nameCheck = validatePersonName(input.fullName, 'اسم الطالب');
  if (!nameCheck.valid) return nameCheck;

  const classCheck = validateTextLength(input.classroom, 'الشعبة', 2, 40);
  if (!classCheck.valid) return classCheck;

  const yearCheck = validateTextLength(input.academicYear, 'الفرقة الدراسية', 3, 40);
  if (!yearCheck.valid) return yearCheck;

  return { valid: true };
}

export function validateTeacherEntry(input: TeacherEntryInput): ValidationResult {
  const nameCheck = validatePersonName(input.fullName, 'اسم المعلم');
  if (!nameCheck.valid) return nameCheck;

  const subjectCheck = validateTextLength(input.subjectName, 'المادة الدراسية', 2, 80);
  if (!subjectCheck.valid) return subjectCheck;

  const yearCheck = validateTextLength(input.academicYear, 'الفرقة الدراسية', 3, 40);
  if (!yearCheck.valid) return yearCheck;

  return { valid: true };
}

export function resolveOrCreateStudentFromEntry(
  input: StudentEntryInput,
  existingStudents: Student[]
): { student: Student; isNew: boolean } {
  const cleanName = input.fullName.trim().replace(/\s+/g, ' ');
  const cleanClassroom = input.classroom.trim();
  const cleanYear = input.academicYear.trim();

  const existing = existingStudents.find((s) => {
    const existingFull = `${s.firstName} ${s.lastName}`.trim().replace(/\s+/g, ' ');
    return existingFull === cleanName && s.classroom === cleanClassroom;
  });

  if (existing) {
    if (existing.academicYear === cleanYear) {
      return { student: existing, isNew: false };
    }
    return {
      student: { ...existing, academicYear: cleanYear },
      isNew: false,
    };
  }

  const { firstName, lastName } = splitArabicFullName(cleanName);
  const slug = `stu_${Date.now().toString(36)}`;
  const newStudent: Student = {
    id: `stu-${Date.now()}`,
    firstName,
    lastName,
    email: `${slug}@damietta.edu.eg`,
    role: 'student',
    academicYear: cleanYear,
    classroom: cleanClassroom,
    parentEmail: `parent_${slug}@mail.eg`,
  };

  return { student: newStudent, isNew: true };
}

/**
 * Returns quizzes relevant to a specific department (حاسب آلي / موسيقية / إعلام)
 * and academic year (الفرقة الأولى..الرابعة):
 * - Specialized courses unique to that department & academic year
 * - Shared 3 pedagogical courses for that exact academic year
 */
export function getQuizzesForStudent(
  quizzes: Quiz[],
  department: string,
  academicYear: string
): {
  specialized: Quiz[];
  pedagogical: Quiz[];
  allForStudent: Quiz[];
} {
  const active = quizzes.filter((q) => q.isActive);
  const specialized = active.filter(
    (q) =>
      q.academicYear === academicYear &&
      q.courseCategory === 'specialized' &&
      q.department === department
  );
  const pedagogical = active.filter(
    (q) =>
      q.academicYear === academicYear &&
      (q.courseCategory === 'pedagogical' || q.department === 'تربوي مشترك')
  );
  return {
    specialized,
    pedagogical,
    allForStudent: [...specialized, ...pedagogical],
  };
}
