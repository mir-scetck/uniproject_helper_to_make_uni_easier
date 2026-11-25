import type { Question, QuestionType, QuizAttempt } from '../types';
import { validateQuestionInput } from './validators';

/**
 * Generator-based CSV streaming parser & exporter (Step 5: Generators yield).
 */
export function* streamCsvLines(csvContent: string): Generator<string, void, unknown> {
  const lines = csvContent.replace(/\r\n/g, '\n').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      yield trimmed;
    }
  }
}

export function parseCsvRow(row: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i += 1) {
    const ch = row[i];
    if (ch === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

export interface CsvImportOutcome {
  questions: Question[];
  errors: string[];
}

export function importQuestionsFromCsv(csvContent: string): CsvImportOutcome {
  const questions: Question[] = [];
  const errors: string[] = [];
  const generator = streamCsvLines(csvContent);

  let rowIndex = 0;
  for (const line of generator) {
    rowIndex += 1;
    // Skip header row if detected
    if (rowIndex === 1 && (line.startsWith('type,') || line.startsWith('النوع,'))) {
      continue;
    }

    const cols = parseCsvRow(line);
    if (cols.length < 4) {
      errors.push(`السطر ${rowIndex}: عدد الأعمدة غير مكتمل (المطلوب: النوع، نص السؤال، الخيارات، الإجابة، الدرجة).`);
      continue;
    }

    const [rawType, prompt, rawOptions, correctAnswer, rawPoints = '2', bookReference = ''] = cols;
    const typeMap: Record<string, QuestionType> = {
      mcq: 'mcq',
      'اختيار من متعدد': 'mcq',
      true_false: 'true_false',
      'صح وخطأ': 'true_false',
      fill_blank: 'fill_blank',
      'إكمال الفراغات': 'fill_blank',
    };

    const qType = typeMap[rawType.trim().toLowerCase()] ?? typeMap[rawType.trim()];
    if (!qType) {
      errors.push(`السطر ${rowIndex}: نوع السؤال "${rawType}" غير مدعوم.`);
      continue;
    }

    const options =
      qType === 'mcq'
        ? rawOptions.split('|').map((o) => o.trim()).filter(Boolean)
        : qType === 'true_false'
          ? ['صح', 'خطأ']
          : undefined;

    const points = Number(rawPoints);
    const check = validateQuestionInput({
      type: qType,
      prompt,
      options: options ?? [],
      correctAnswer,
      points: Number.isFinite(points) ? points : 0,
    });

    if (!check.valid) {
      errors.push(`السطر ${rowIndex}: ${check.error}`);
      continue;
    }

    questions.push({
      id: `csv-q-${Date.now()}-${rowIndex}`,
      type: qType,
      prompt,
      options,
      correctAnswer: correctAnswer.trim(),
      points,
      bookReference: bookReference || undefined,
    });
  }

  return { questions, errors };
}

export function* generateGradebookCsvRows(attempts: readonly QuizAttempt[]): Generator<string> {
  yield 'اسم الطالب,الفصل,الاختبار,الدرجة,الدرجة الكلية,النسبة المئوية,التقدير,الحالة,تاريخ التسليم';
  for (const a of attempts) {
    const status = a.passed ? 'ناجح' : 'يحتاج إلى دعم';
    const dateStr = a.submittedAt.slice(0, 10);
    const safeName = `"${a.studentName.replace(/"/g, '""')}"`;
    const safeQuiz = `"${a.quizTitle.replace(/"/g, '""')}"`;
    yield `${safeName},${a.classroom},${safeQuiz},${a.score},${a.totalPoints},${a.percentage}%,${a.gradeLabel},${status},${dateStr}`;
  }
}

export function exportGradebookToCsv(attempts: readonly QuizAttempt[]): string {
  const rows: string[] = [];
  for (const row of generateGradebookCsvRows(attempts)) {
    rows.push(row);
  }
  return '\uFEFF' + rows.join('\n');
}
