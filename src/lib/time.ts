// src/lib/time.ts
export const IST_TZ = 'Asia/Kolkata';

type D = Date | string | number;

export function formatIst(
  date: D,
  opts: Intl.DateTimeFormatOptions = {}
): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TZ,
    dateStyle: 'medium',
    timeStyle: 'short',
    ...opts,
  }).format(d);
}

// 30 minutes before a given Date (in UTC math), then format in IST
export function deadlineMinusMinutes(date: D, minutes = 30): string {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - minutes);
  return formatIst(d);
}

// Helper: format day + time in IST
export function formatIstDayTime(date: D): string {
  return formatIst(date, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
