import { apiFetch } from "@/lib/api/client";
import type { AttendanceStatus, Row } from "@/lib/types";

export type DayAttendanceRecord = {
  studentProfileId: string;
  status: AttendanceStatus;
  notes?: string;
};

export type MonthAttendanceRecord = {
  studentProfileId: string;
  date: string;
  status: AttendanceStatus;
  classId?: string;
};

export const teacherApi = {
  school: () => apiFetch<{ school: Row }>("/schools/me"),
  me: () => apiFetch<{ staff: Row }>("/staff/me"),
  myClasses: () => apiFetch<{ classes: Row[] }>("/classes/mine"),
  student: (id: string) =>
    apiFetch<{ student: Row }>(`/students/${id}`),
  attendance: {
    day: (classId: string, date: string) =>
      apiFetch<{
        classId: string;
        date: string;
        academicYearId: string;
        records: Row[];
        summary: { present: number; absent: number; unmarked: number };
      }>(
        `/attendance/students?classId=${encodeURIComponent(classId)}&date=${encodeURIComponent(date)}`,
      ),
    saveDay: (body: {
      classId: string;
      date: string;
      records: DayAttendanceRecord[];
    }) =>
      apiFetch<{ records: Row[] }>("/attendance/students", {
        method: "POST",
        body,
      }),
    month: (classId: string | null | undefined, year: number, month: number) => {
      const params = new URLSearchParams({
        year: String(year),
        month: String(month),
      });
      if (classId) params.set("classId", classId);
      return apiFetch<{
        classId: string | null;
        year: number;
        month: number;
        daysInMonth: number;
        days: number[];
        holidays: string[];
        students: Row[];
      }>(`/attendance/students/month?${params.toString()}`);
    },
    saveMonth: (body: {
      classId?: string;
      records: MonthAttendanceRecord[];
    }) =>
      apiFetch<{
        count: number;
        records: Row[];
        skippedHolidays: number;
      }>("/attendance/students/month", { method: "POST", body }),
  },
  punch: {
    today: () =>
      apiFetch<{ attendance: Row | null; date: string }>(
        "/attendance/staff/today",
      ),
    out: () =>
      apiFetch<{ attendance: Row }>("/attendance/staff/punch-out", {
        method: "POST",
      }),
    qr: (token: string) =>
      apiFetch<{ action: "PUNCH_IN" | "PUNCH_OUT"; attendance: Row }>(
        "/attendance/staff/qr-punch",
        { method: "POST", body: { token } },
      ),
    month: (year: number, month: number) =>
      apiFetch<{
        year: number;
        month: number;
        daysInMonth: number;
        days: number[];
        holidays: string[];
        staff: {
          staffProfileId: string;
          employeeCode: string;
          staffType: string;
          name: string;
          email: string;
          role: string;
          days: Record<
            string,
            {
              status: AttendanceStatus;
              punchInAt: string | null;
              punchOutAt: string | null;
            } | null
          >;
        };
      }>(`/attendance/staff/me/month?year=${year}&month=${month}`),
  },
  exams: {
    list: (academicYearId?: string) => {
      const qs = academicYearId
        ? `?academicYearId=${encodeURIComponent(academicYearId)}`
        : "";
      return apiFetch<{ examinations: Row[] }>(`/exams${qs}`);
    },
    create: (body: Record<string, unknown>) =>
      apiFetch<{ examination: Row }>("/exams", { method: "POST", body }),
    get: (id: string) =>
      apiFetch<{ examination: Row }>(`/exams/${encodeURIComponent(id)}`),
    update: (id: string, body: Record<string, unknown>) =>
      apiFetch<{ examination: Row }>(`/exams/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body,
      }),
    remove: (id: string) =>
      apiFetch<{ ok: boolean }>(`/exams/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    markSheets: (id: string, classId?: string, subjectId?: string) => {
      const params = new URLSearchParams();
      if (classId) params.set("classId", classId);
      if (subjectId) params.set("subjectId", subjectId);
      const qs = params.toString();
      return apiFetch<{ markSheets: Row[] }>(
        `/exams/${encodeURIComponent(id)}/marksheets${qs ? `?${qs}` : ""}`,
      );
    },
    saveMarks: (
      id: string,
      body: { records: { id: string; marksObtained: number | null }[] },
    ) =>
      apiFetch<{ ok: boolean; updated: number }>(
        `/exams/${encodeURIComponent(id)}/marksheets`,
        { method: "PUT", body },
      ),
    publish: (
      id: string,
      body: {
        publish?: boolean;
        ids?: string[];
        classId?: string;
        subjectId?: string;
      },
    ) =>
      apiFetch<{ ok: boolean; updated: number; published: boolean }>(
        `/exams/${encodeURIComponent(id)}/marksheets/publish`,
        { method: "POST", body },
      ),
  },
};
