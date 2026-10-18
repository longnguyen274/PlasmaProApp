import type { DeviceSession, TreatmentPlan } from './types';

export interface Adherence {
  /** Ngày có dữ liệu đồng bộ trong khoảng xét (không tính ngày chưa đồng bộ). */
  daysWithData: number;
  /** Ngày có số phiên hoàn tất bằng mục tiêu. */
  daysMet: number;
  /** Ngày có nhiều phiên hơn mục tiêu (không nên xảy ra nếu thiết bị ngắt đúng). */
  daysOver: number;
  /** Cặp phiên liên tiếp có giãn cách nhỏ hơn mức tối thiểu. */
  intervalViolations: number;
  intervalPairs: number;
  /** Phiên thiết bị đã tự ngắt vì vượt ngưỡng liệu trình. */
  blocked: number;
}

/**
 * Đánh giá tuân thủ liệu trình từ nhật ký thiết bị (theo màn "Đánh giá hiệu quả điều trị" trên slide).
 * Chỉ tính các ngày đã đồng bộ, để không nhầm "chưa có dữ liệu" thành "không sử dụng" (đặc tả 7.2).
 */
export function computeAdherence(sessions: DeviceSession[], plan: TreatmentPlan | undefined, days: string[], lastSyncDay: string | null): Adherence {
  const synced = days.filter((d) => lastSyncDay !== null && d <= lastSyncDay);
  const done = sessions.filter((s) => s.status === 'completed');
  let daysMet = 0;
  let daysOver = 0;
  let intervalViolations = 0;
  let intervalPairs = 0;
  for (const d of synced) {
    const day = done.filter((s) => s.start.slice(0, 10) === d).sort((a, b) => a.start.localeCompare(b.start));
    if (plan?.sessionsPerDay != null) {
      if (day.length === plan.sessionsPerDay) daysMet++;
      if (day.length > plan.sessionsPerDay) daysOver++;
    }
    if (plan?.minIntervalMin != null) {
      for (let i = 1; i < day.length; i++) {
        intervalPairs++;
        const gap = (new Date(day[i].start).getTime() - new Date(day[i - 1].start).getTime()) / 60000 - day[i - 1].durationMin;
        if (gap < plan.minIntervalMin) intervalViolations++;
      }
    }
  }
  const blocked = sessions.filter((s) => s.status === 'over_limit' && synced.includes(s.start.slice(0, 10))).length;
  return { daysWithData: synced.length, daysMet, daysOver, intervalViolations, intervalPairs, blocked };
}
