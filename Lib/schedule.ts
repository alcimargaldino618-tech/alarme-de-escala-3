/**
 * Lógica central da escala de trabalho.
 * Totalmente pura e offline: não depende de rede, DOM ou fuso do servidor.
 */

export type ScheduleType = "5x1" | "6x1" | "4x2" | "5x2";
export type DayStatus = "TRABALHO" | "FOLGA";

export interface ScheduleConfig {
  scheduleType: ScheduleType;
  /** Data de referência no formato YYYY-MM-DD */
  referenceDate: string;
  referenceStatus: DayStatus;
}

export interface ScheduleException {
  /** YYYY-MM-DD */
  date: string;
  status: DayStatus;
  reason?: string | undefined;
  createdAt?: number | undefined;
}

export const CYCLES: Record<ScheduleType, { cycleLength: number; workDays: number }> = {
  "5x1": { cycleLength: 6, workDays: 5 },
  "6x1": { cycleLength: 7, workDays: 6 },
  "4x2": { cycleLength: 6, workDays: 4 },
  "5x2": { cycleLength: 7, workDays: 5 },
};

export const SCHEDULE_TYPES = Object.keys(CYCLES) as ScheduleType[];

const MS_PER_DAY = 86_400_000;

/** Converte Date -> "YYYY-MM-DD" usando o horário local (nunca UTC). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Converte "YYYY-MM-DD" -> Date local à meia-noite. */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

export function startOfDayLocal(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function addDays(date: Date, days: number): Date {
  const d = startOfDayLocal(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Diferença em dias civis entre duas datas, imune a horário de verão,
 * viradas de mês/ano e anos bissextos (usa UTC apenas para a aritmética).
 */
export function differenceInCalendarDays(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcA - utcB) / MS_PER_DAY);
}

/**
 * Status calculado pelo ciclo, sem considerar exceções.
 *
 * Se a referência é TRABALHO, ela é o dia 1 do ciclo (posição 0).
 * Se a referência é FOLGA, ela é o primeiro dia de folga do ciclo
 * (posição = workDays), de modo que o ciclo continue coerente.
 */
export function getCycleStatus(date: Date, config: ScheduleConfig): DayStatus {
  const { cycleLength, workDays } = CYCLES[config.scheduleType];
  const diff = differenceInCalendarDays(date, fromDateKey(config.referenceDate));
  const offset = config.referenceStatus === "TRABALHO" ? 0 : workDays;
  const pos = (((diff + offset) % cycleLength) + cycleLength) % cycleLength;
  return pos < workDays ? "TRABALHO" : "FOLGA";
}

/**
 * Status final do dia: exceção manual sobrescreve o cálculo automático.
 */
export function getWorkStatus(
  date: Date,
  config: ScheduleConfig,
  exceptions: ScheduleException[] = [],
): DayStatus {
  const key = toDateKey(date);
  const exception = exceptions.find((e) => e.date === key);
  if (exception) return exception.status;
  return getCycleStatus(date, config);
}

export function isException(date: Date, exceptions: ScheduleException[] = []): boolean {
  const key = toDateKey(date);
  return exceptions.some((e) => e.date === key);
}

/** Próxima data (a partir de `from`, inclusive ou não) com o status desejado. */
export function findNextDayWithStatus(
  from: Date,
  status: DayStatus,
  config: ScheduleConfig,
  exceptions: ScheduleException[] = [],
  options: { inclusive?: boolean; maxDays?: number } = {},
): Date | null {
  const { inclusive = false, maxDays = 400 } = options;
  const start = inclusive ? 0 : 1;
  for (let i = start; i <= maxDays; i++) {
    const day = addDays(from, i);
    if (getWorkStatus(day, config, exceptions) === status) return day;
  }
  return null;
}

export interface DayInfo {
  date: Date;
  key: string;
  status: DayStatus;
  isException: boolean;
}

export function getDaysRange(
  from: Date,
  count: number,
  config: ScheduleConfig,
  exceptions: ScheduleException[] = [],
): DayInfo[] {
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(from, i);
    return {
      date,
      key: toDateKey(date),
      status: getWorkStatus(date, config, exceptions),
      isException: isException(date, exceptions),
    };
  });
}

/** Grade do mês (começando no domingo) para o calendário. */
export function getMonthGrid(
  year: number,
  month: number,
  config: ScheduleConfig,
  exceptions: ScheduleException[] = [],
): (DayInfo | null)[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = first.getDay();
  const cells: (DayInfo | null)[] = Array.from({ length: leading }, () => null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    cells.push({
      date,
      key: toDateKey(date),
      status: getWorkStatus(date, config, exceptions),
      isException: isException(date, exceptions),
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
