import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface MetricDay {
  date: string;
  rhr: number | null;
  hrv: number | null;
  sleepScore: number | null;
  sleepHours: number | null;
  bodyBattery: number | null;
  steps: number | null;
  vigorousMinutes: number | null;
  stressAvg: number | null;
}

export interface MetricsAverages {
  rhr: number;
  hrv: number;
  sleep_score: number;
  sleep_hours: number;
  body_battery: number;
  steps: number;
  vigorous_minutes: number;
  stress_avg: number;
}

export interface WeeklyMetrics {
  days: MetricDay[];
  averages: MetricsAverages;
}

export function useWeeklyMetrics() {
  return useQuery({
    queryKey: ["metrics", "weekly"],
    queryFn: () => api.get<WeeklyMetrics>("/api/metrics/weekly"),
    staleTime: 5 * 60 * 1000,
  });
}
