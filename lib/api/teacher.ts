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
};
