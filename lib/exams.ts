import { formatClassLabel } from "@/lib/class-levels";
import { arr, num, obj, str, type Row } from "@/lib/types";

export type PaperKey = string;

export type ExamAssignment = {
  classId: string;
  subjectId: string;
  classLabel: string;
  subjectName: string;
  academicYearId: string;
};

export type MarkSheetSubjectCol = {
  subjectId: string;
  name: string;
  maxMarks: number;
};

export type MarkSheetStudentRow = {
  studentProfileId: string;
  name: string;
  rollNumber: string;
  bySubject: Record<
    string,
    {
      id: string;
      marksObtained: number | null;
      maxMarks: number;
      isPublished: boolean;
    }
  >;
};

export type MarkSheetRowStat = {
  total: number;
  percentage: number;
  rank: number;
};

export function paperKey(classId: string, subjectId: string): PaperKey {
  return `${classId}:${subjectId}`;
}

/** Build a papers map for every assignment, preserving existing max marks when present. */
export function papersFromAssignments(
  assignments: { classId: string; subjectId: string }[],
  existing?: Record<PaperKey, string>,
  defaultMax = "100",
): Record<PaperKey, string> {
  const next: Record<PaperKey, string> = {};
  for (const a of assignments) {
    const key = paperKey(a.classId, a.subjectId);
    next[key] = existing?.[key] ?? defaultMax;
  }
  return next;
}

export function allAssignmentsSelected(
  assignments: { classId: string; subjectId: string }[],
  papers: Record<PaperKey, string>,
): boolean {
  return (
    assignments.length > 0 &&
    assignments.every((a) => paperKey(a.classId, a.subjectId) in papers)
  );
}

export function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isExamOwner(exam: Row, userId: string): boolean {
  return !!userId && str(exam.createdById) === userId;
}

export function buildMyAssignments(
  classes: Row[],
  userId: string,
): ExamAssignment[] {
  const items: ExamAssignment[] = [];
  for (const klass of classes) {
    const classId = str(klass.id);
    const classLabel = formatClassLabel(
      str(klass.classLevel),
      (klass.section as string | null) || null,
    );
    const year = obj(klass.academicYear);
    for (const cs of arr(klass.classSubjects)) {
      const staff = obj(cs.staffProfile);
      const staffUser = obj(staff.user);
      if (userId && str(staffUser.id) !== userId) continue;
      const subject = obj(cs.subject);
      const subjectId = str(subject.id || cs.subjectId);
      if (!subjectId) continue;
      items.push({
        classId,
        subjectId,
        classLabel,
        subjectName: str(subject.name) || "Subject",
        academicYearId: str(klass.academicYearId || year.id),
      });
    }
  }
  return items;
}

function compareRoll(a: string, b: string) {
  if (a && b) return a.localeCompare(b, undefined, { numeric: true });
  if (a) return -1;
  if (b) return 1;
  return 0;
}

export function pivotMarkSheets(sheets: Row[]): MarkSheetStudentRow[] {
  const byStudent = new Map<string, MarkSheetStudentRow>();
  for (const s of sheets) {
    const student = obj(s.student);
    const studentProfileId = str(s.studentProfileId || student.id);
    let row = byStudent.get(studentProfileId);
    if (!row) {
      row = {
        studentProfileId,
        name: str(student.name),
        rollNumber: str(student.rollNumber),
        bySubject: {},
      };
      byStudent.set(studentProfileId, row);
    }
    const subjectId = str(s.subjectId);
    row.bySubject[subjectId] = {
      id: str(s.id),
      marksObtained: s.marksObtained == null ? null : num(s.marksObtained),
      isPublished: !!s.isPublished,
      maxMarks: num(s.maxMarks),
    };
  }
  return [...byStudent.values()].sort(
    (a, b) =>
      compareRoll(a.rollNumber, b.rollNumber) || a.name.localeCompare(b.name),
  );
}

export function computeRowStats(
  studentRows: MarkSheetStudentRow[],
  subjectCols: MarkSheetSubjectCol[],
  marks: Record<string, string>,
  maxTotal: number,
): MarkSheetRowStat[] {
  const totals = studentRows.map((row) => {
    let total = 0;
    let any = false;
    for (const col of subjectCols) {
      const sheet = row.bySubject[col.subjectId];
      if (!sheet) continue;
      const raw = marks[sheet.id];
      if (raw === undefined || raw.trim() === "") continue;
      any = true;
      const value = Number(raw);
      if (!Number.isNaN(value)) total += value;
    }
    return { total, any };
  });

  const rankedIndexes = totals
    .map((t, i) => ({ ...t, i }))
    .filter((t) => t.any)
    .sort((a, b) => b.total - a.total);

  const ranks = new Array<number>(totals.length).fill(0);
  let rank = 1;
  for (let k = 0; k < rankedIndexes.length; k++) {
    if (k > 0 && rankedIndexes[k].total < rankedIndexes[k - 1].total) {
      rank = k + 1;
    }
    ranks[rankedIndexes[k].i] = rank;
  }

  return totals.map((t, i) => ({
    total: t.total,
    percentage: maxTotal > 0 ? (t.total / maxTotal) * 100 : 0,
    rank: ranks[i],
  }));
}

export function papersFromExam(exam: Row): Record<PaperKey, string> {
  const papersMap: Record<PaperKey, string> = {};
  for (const p of arr(exam.papers)) {
    papersMap[paperKey(str(p.classId), str(p.subjectId))] = String(
      num(p.maxMarks) || 100,
    );
  }
  return papersMap;
}

export function formatExamDate(iso: string | null | undefined): string {
  const key = toDateInput(iso);
  if (!key) return "—";
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
