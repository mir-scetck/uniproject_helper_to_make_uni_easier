import type { QuestionType } from '../types';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const EMAIL_REGEX = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
const ARABIC_OR_LATIN_NAME_REGEX = /^[\u0600-\u06FFa-zA-Z\s\-_./]{2,80}$/;

export function validateEmail(email: string): ValidationResult {
  const trimmed = (email || '').trim();
  if (!trimmed) {
    return { valid: false, error: 'البريد الإلكتروني مطلوب ولا يمكن تركه فارغاً.' };
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: 'صيغة البريد الإلكتروني غير صالحة (مثال: student@edu.eg).' };
  }
  return { valid: true };
}

export function validateTextLength(
  text: string,
  fieldName: string,
  minLen = 3,
  maxLen = 300
): ValidationResult {
  const trimmed = (text || '').trim();
  if (trimmed.length < minLen) {
    return {
      valid: false,
      error: `حقل "${fieldName}" قصير جداً؛ يجب أن يحتوي على ${minLen} أحرف على الأقل.`,
    };
  }
  if (trimmed.length > maxLen) {
    return {
      valid: false,
      error: `حقل "${fieldName}" طويل جداً؛ الحد الأقصى هو ${maxLen} حرفاً.`,
    };
  }
  return { valid: true };
}

export function validatePositiveNumber(
  value: string | number,
  fieldName: string,
  min = 1,
  max = 100
): ValidationResult {
  const num = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(num) || String(value).trim() === '') {
    return { valid: false, error: `قيمة "${fieldName}" يجب أن تكون رقماً صحيحاً.` };
  }
  if (num < min || num > max) {
    return {
      valid: false,
      error: `قيمة "${fieldName}" يجب أن تكون بين ${min} و ${max}.`,
    };
  }
  return { valid: true };
}

export function validatePersonName(name: string, fieldName = 'الاسم'): ValidationResult {
  const trimmed = (name || '').trim();
  if (!ARABIC_OR_LATIN_NAME_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: `حقل "${fieldName}" يجب أن يحتوي على حروف عربية أو إنجليزية صالحة (من 2 إلى 80 حرفاً).`,
    };
  }
  return { valid: true };
}

export function validateQuestionInput(input: {
  type: QuestionType;
  prompt: string;
  options: string[];
  correctAnswer: string;
  points: number | string;
}): ValidationResult {
  const promptCheck = validateTextLength(input.prompt, 'نص السؤال', 6, 400);
  if (!promptCheck.valid) return promptCheck;

  const pointsCheck = validatePositiveNumber(input.points, 'درجة السؤال', 1, 50);
  if (!pointsCheck.valid) return pointsCheck;

  if (input.type === 'mcq') {
    const cleanOptions = input.options.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      return {
        valid: false,
        error: 'سؤال الاختيار من متعدد يتطلب خيارين على الأقل.',
      };
    }
    if (!cleanOptions.includes(input.correctAnswer.trim())) {
      return {
        valid: false,
        error: 'يجب تحديد إحدى الإجابات المدخلة كإجابة صحيحة.',
      };
    }
  } else if (input.type === 'true_false') {
    if (!['صح', 'خطأ'].includes(input.correctAnswer.trim())) {
      return {
        valid: false,
        error: 'سؤال صح وخطأ يتطلب تحديد "صح" أو "خطأ" كإجابة صحيحة.',
      };
    }
  } else {
    const answerCheck = validateTextLength(input.correctAnswer, 'الإجابة النموذجية', 1, 150);
    if (!answerCheck.valid) return answerCheck;
  }

  return { valid: true };
}
