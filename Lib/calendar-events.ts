/**
 * Calendário 2026: feriados, eventos e dias de pagamento.
 * Dados constantes e puros — funcionam 100% offline e não alteram
 * o cálculo da escala (5x1, 6x1, 4x2, 5x2).
 */

export type HolidayType = "NACIONAL" | "MUNICIPAL" | "ESTADUAL" | "TRABALHADOR_RURAL";

export interface Holiday {
  /** YYYY-MM-DD */
  date: string;
  name: string;
  type: HolidayType;
}

export const HOLIDAY_LABEL: Record<HolidayType, string> = {
  NACIONAL: "Feriado Nacional",
  MUNICIPAL: "Feriado Municipal",
  ESTADUAL: "Feriado Estadual",
  TRABALHADOR_RURAL: "Trabalhador Rural",
};

/** Classes de cor (tokens semânticos definidos em styles.css). */
export const HOLIDAY_DOT_CLASS: Record<HolidayType, string> = {
  NACIONAL: "bg-holiday-national",
  MUNICIPAL: "bg-holiday-municipal",
  ESTADUAL: "bg-holiday-state",
  TRABALHADOR_RURAL: "bg-holiday-rural",
};

export const HOLIDAY_TEXT_CLASS: Record<HolidayType, string> = {
  NACIONAL: "text-holiday-national",
  MUNICIPAL: "text-holiday-municipal",
  ESTADUAL: "text-holiday-state",
  TRABALHADOR_RURAL: "text-holiday-rural",
};

export const PAYDAY_DOT_CLASS = "bg-payday";
export const PAYDAY_TEXT_CLASS = "text-payday";

export const HOLIDAYS_2026: Holiday[] = [
  { date: "2026-01-01", name: "Confraternização Universal", type: "NACIONAL" },
  { date: "2026-02-18", name: "Quarta-Feira de Cinzas", type: "MUNICIPAL" },
  { date: "2026-04-03", name: "Paixão de Cristo", type: "NACIONAL" },
  { date: "2026-04-13", name: "Padroeira", type: "MUNICIPAL" },
  { date: "2026-04-21", name: "Tiradentes", type: "NACIONAL" },
  { date: "2026-05-01", name: "Dia do Trabalho", type: "NACIONAL" },
  { date: "2026-07-25", name: "Dia do Trabalhador Rural", type: "TRABALHADOR_RURAL" },
  { date: "2026-09-07", name: "Independência do Brasil", type: "NACIONAL" },
  { date: "2026-10-03", name: "Dia dos Mártires de Uruaçu e Cunhaú", type: "ESTADUAL" },
  { date: "2026-10-12", name: "Nossa Sra. Aparecida — Padroeira do Brasil", type: "NACIONAL" },
  { date: "2026-11-02", name: "Finados", type: "NACIONAL" },
  { date: "2026-11-09", name: "Emancipação Política", type: "MUNICIPAL" },
  { date: "2026-11-15", name: "Proclamação da República", type: "NACIONAL" },
  { date: "2026-11-20", name: "Dia da Consciência Negra", type: "NACIONAL" },
  { date: "2026-12-25", name: "Natal", type: "NACIONAL" },
];

export const PAYDAYS_2026: string[] = [
  "2026-01-15",
  "2026-01-30",
  "2026-02-13",
  "2026-02-27",
  "2026-03-13",
  "2026-03-31",
  "2026-04-15",
  "2026-04-30",
  "2026-05-15",
  "2026-05-29",
  "2026-06-15",
  "2026-06-30",
  "2026-07-15",
  "2026-07-31",
  "2026-08-14",
  "2026-08-31",
  "2026-09-15",
  "2026-09-30",
  "2026-10-15",
  "2026-10-30",
  "2026-11-13",
  "2026-11-30",
  "2026-12-15",
  "2026-12-30",
];

const HOLIDAY_MAP = new Map(HOLIDAYS_2026.map((h) => [h.date, h]));
const PAYDAY_SET = new Set(PAYDAYS_2026);

export function getHoliday(key: string): Holiday | null {
  return HOLIDAY_MAP.get(key) ?? null;
}

export function isPayday(key: string): boolean {
  return PAYDAY_SET.has(key);
}

export interface DayEvents {
  holiday: Holiday | null;
  payday: boolean;
}

export function getDayEvents(key: string): DayEvents {
  return { holiday: getHoliday(key), payday: isPayday(key) };
}

export const WEEKDAY_LONG = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];
