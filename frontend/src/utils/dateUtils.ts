// Date utilities for the salon system

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add months to a date
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Add hours to a date
 */
export function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

/**
 * Add minutes to a date
 */
export function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

/**
 * Subtract days from a date
 */
export function subtractDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

/**
 * Get start of day (00:00:00)
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of day (23:59:59.999)
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Get start of week (Sunday)
 */
export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - day);
  return startOfDay(result);
}

/**
 * Get end of week (Saturday)
 */
export function endOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() + (6 - day));
  return endOfDay(result);
}

/**
 * Get start of month
 */
export function startOfMonth(date: Date): Date {
  const result = new Date(date);
  result.setDate(1);
  return startOfDay(result);
}

/**
 * Get end of month
 */
export function endOfMonth(date: Date): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1);
  result.setDate(0);
  return endOfDay(result);
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

/**
 * Check if date is today
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Check if date is tomorrow
 */
export function isTomorrow(date: Date): boolean {
  return isSameDay(date, addDays(new Date(), 1));
}

/**
 * Check if date is yesterday
 */
export function isYesterday(date: Date): boolean {
  return isSameDay(date, subtractDays(new Date(), 1));
}

/**
 * Check if date is in the past
 */
export function isPast(date: Date): boolean {
  return date.getTime() < new Date().getTime();
}

/**
 * Check if date is in the future
 */
export function isFuture(date: Date): boolean {
  return date.getTime() > new Date().getTime();
}

/**
 * Check if date is within a range
 */
export function isWithinRange(date: Date, start: Date, end: Date): boolean {
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

/**
 * Get difference in days between two dates
 */
export function differenceInDays(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date1.getTime() - date2.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get difference in hours between two dates
 */
export function differenceInHours(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date1.getTime() - date2.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60));
}

/**
 * Get difference in minutes between two dates
 */
export function differenceInMinutes(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date1.getTime() - date2.getTime());
  return Math.floor(diffTime / (1000 * 60));
}

/**
 * Get all days in a week starting from a date
 */
export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/**
 * Get all days in a month
 */
export function getMonthDays(date: Date): Date[] {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const days: Date[] = [];

  let current = start;
  while (current <= end) {
    days.push(new Date(current));
    current = addDays(current, 1);
  }

  return days;
}

/**
 * Get calendar days for a month (including days from prev/next months to fill the grid)
 */
export function getCalendarDays(date: Date): Date[] {
  const start = startOfMonth(date);
  const end = endOfMonth(date);

  // Get the first day to show (might be from previous month)
  const firstDay = startOfWeek(start);

  // Get the last day to show (might be from next month)
  const lastDay = endOfWeek(end);

  const days: Date[] = [];
  let current = firstDay;

  while (current <= lastDay) {
    days.push(new Date(current));
    current = addDays(current, 1);
  }

  return days;
}

/**
 * Parse time string (HH:mm) to minutes since midnight
 */
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:mm)
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Generate time slots between start and end with given interval
 */
export function generateTimeSlots(
  startTime: string,
  endTime: string,
  intervalMinutes: number
): string[] {
  const slots: string[] = [];
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  for (let minutes = startMinutes; minutes < endMinutes; minutes += intervalMinutes) {
    slots.push(minutesToTime(minutes));
  }

  return slots;
}

/**
 * Check if a time slot overlaps with another
 */
export function doTimeSlotsOverlap(
  slot1Start: string,
  slot1End: string,
  slot2Start: string,
  slot2End: string
): boolean {
  const s1Start = parseTimeToMinutes(slot1Start);
  const s1End = parseTimeToMinutes(slot1End);
  const s2Start = parseTimeToMinutes(slot2Start);
  const s2End = parseTimeToMinutes(slot2End);

  return s1Start < s2End && s2Start < s1End;
}

/**
 * Combine date and time string into a Date object
 */
export function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/**
 * Get age from birth date
 */
export function getAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Format date to ISO string for input[type="date"]
 */
export function toDateInputValue(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format time to ISO string for input[type="time"]
 */
export function toTimeInputValue(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

/**
 * Parse date from input[type="date"] value
 */
export function fromDateInputValue(value: string): Date {
  return new Date(value + 'T00:00:00');
}

/**
 * Get business days between two dates (excluding weekends)
 */
export function getBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  let current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current = addDays(current, 1);
  }

  return count;
}

/**
 * Check if a date is a weekend
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Get next business day
 */
export function nextBusinessDay(date: Date): Date {
  let result = addDays(date, 1);
  while (isWeekend(result)) {
    result = addDays(result, 1);
  }
  return result;
}
