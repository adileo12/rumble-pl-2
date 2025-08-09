import { formatInTimeZone } from 'date-fns-tz';
export const IST = 'Asia/Kolkata';
export function formatIst(date: Date, fmt = "EEE, dd MMM yyyy HH:mm 'IST'") {
  return formatInTimeZone(date, IST, fmt);
}
