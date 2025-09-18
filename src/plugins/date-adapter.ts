import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear,
  addDays, addMonths, subMonths, getYear, getMonth, getDate,
  getHours, getMinutes, getSeconds, setYear, setMonth, setDate,
  setHours, setMinutes, setSeconds, isSameDay, isSameMonth,
  isAfter, isBefore, isValid, format as formatDate, parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Este objeto implementa TODAS as funções que o Vuetify espera.
export const dateAdapter = {
  locale: ptBR,

  // Funções de conversão e validação
  date: (value: any): Date | null => {
    if (value == null) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      const parsed = parseISO(value);
      if (isValid(parsed)) return parsed;
    }
    const date = new Date(value);
    return isValid(date) ? date : null;
  },

  toJsDate: (value: any): Date => new Date(value),
  toISO: (date: Date) => date.toISOString(),
  isValid: (value: any) => isValid(new Date(value)),

  // Função de formatação que o Vuetify usa internamente
  format: (date: Date, formatString: string): string => {
    if (!isValid(date)) return '';
    // Mapeia os formatos internos do Vuetify para os do date-fns
    const map: { [key: string]: string } = {
      normalDate: "d 'de' MMMM",
      normalDateWithWeekday: 'EEE, d MMM',
      keyboardDate: 'P',
      monthAndDate: "d 'de' MMM",
      monthAndYear: "MMMM 'de' yyyy",
      dayOfMonth: 'd',
      year: 'yyyy',
    };
    const internalFormat = map[formatString] ?? formatString;
    return formatDate(date, internalFormat, { locale: ptBR });
  },

  // Funções de comparação
  isAfter,
  isBefore,
  isEqual: (date: any, comparing: any) => new Date(date).getTime() === new Date(comparing).getTime(),
  isSameDay,
  isSameMonth,

  // Funções de início/fim de períodos
  startOfWeek: (date: Date) => startOfWeek(date, { locale: ptBR, weekStartsOn: 1 }),
  endOfWeek: (date: Date) => endOfWeek(date, { locale: ptBR, weekStartsOn: 1 }),
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,

  // Funções de manipulação
  addDays,
  addMonths,
  subMonths,

  // Getters
  getYear,
  getMonth,
  getDate,
  getHours,
  getMinutes,
  getSeconds,

  // Setters
  setYear,
  setMonth,
  setDate,
  setHours,
  setMinutes,
  setSeconds,

  // Função para os dias da semana (S, T, Q, Q, S, S, D)
  getWeekdays: () => {
    const now = new Date();
    const weekStartsOn = 1; // Segunda-feira
    const start = startOfWeek(now, { locale: ptBR, weekStartsOn });
    return Array.from({ length: 7 }).map((_, i) => formatDate(addDays(start, i), 'EEEEE', { locale: ptBR }));
  },

  // ==========================================================
  // ===== FUNÇÃO QUE FALTAVA ADICIONADA AQUI =================
  // ==========================================================
  getWeekArray: (date: Date) => {
    const start = startOfWeek(startOfMonth(date), { locale: ptBR, weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(date), { locale: ptBR, weekStartsOn: 1 });

    const weeks: Date[][] = [];
    let week: Date[] = [];

    let day = start;
    while (day <= end) {
      week.push(day);
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
      day = addDays(day, 1);
    }
    return weeks;
  },
};
