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
    in: () =>
      apiFetch<{ attendance: Row }>("/attendance/staff/punch-in", {
        method: "POST",
      }),
    out: () =>
      apiFetch<{ attendance: Row }>("/attendance/staff/punch-out", {
        method: "POST",
      }),
  },
};
