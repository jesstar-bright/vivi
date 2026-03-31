import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import TabBar from "@/components/TabBar";
import type { Tab } from "@/components/TabBar";
import WorkoutsTab from "@/components/WorkoutsTab";
import LifestyleTab from "@/components/LifestyleTab";
import MenuTab from "@/components/MenuTab";
import ProfileTab from "@/components/ProfileTab";
import CheckInModal from "@/components/CheckInModal";
import PostWorkoutModal from "@/components/PostWorkoutModal";
import { useCurrentPlan } from "@/hooks/useCurrentPlan";
import { useCompletedDays } from "@/hooks/useCompletedDays";
import { useWeeklyMetrics } from "@/hooks/useWeeklyMetrics";
import type { MetricDay, MetricsAverages } from "@/hooks/useWeeklyMetrics";
import { transformPlanDays, transformNutrition } from "@/lib/transformPlan";

function determineTrend(
  days: MetricDay[]
): "improving" | "declining" | "stable" {
  const withSleep = days.filter((d) => d.sleepHours != null);
  if (withSleep.length < 6) return "stable";

  const first3 = withSleep.slice(0, 3);
  const last3 = withSleep.slice(-3);

  const avgFirst =
    first3.reduce((s, d) => s + (d.sleepHours ?? 0), 0) / first3.length;
  const avgLast =
    last3.reduce((s, d) => s + (d.sleepHours ?? 0), 0) / last3.length;

  const diff = avgLast - avgFirst;
  if (diff >= 0.5) return "improving";
  if (diff <= -0.5) return "declining";
  return "stable";
}

function generateSleepTip(averages: MetricsAverages): string {
  if (averages.sleep_hours >= 8) {
    return "Your sleep is solid this week. Keep the routine.";
  }
  if (averages.sleep_hours >= 7) {
    return "Good sleep base. Try dimming lights 30 min earlier.";
  }
  return "Sleep is low — prioritize your wind-down routine tonight.";
}

const Index = () => {
  const [tab, setTab] = useState<Tab>("workouts");
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [postWorkoutOpen, setPostWorkoutOpen] = useState(false);
  const { data: planResponse, isLoading, error } = useCurrentPlan();
  const { data: completedDaysData } = useCompletedDays();
  const { data: metricsData } = useWeeklyMetrics();

  const sleepInsight = metricsData
    ? {
        avgHours: Math.round(metricsData.averages.sleep_hours * 10) / 10,
        trend: determineTrend(metricsData.days),
        tip: generateSleepTip(metricsData.averages),
      }
    : undefined;

  const days = planResponse?.plan
    ? transformPlanDays(planResponse.plan)
    : [];
  const nutrition = planResponse?.plan
    ? transformNutrition(planResponse.plan)
    : null;
  const weekNumber = planResponse?.week ?? 1;
  const mode = planResponse?.mode ?? "";
  const needsCheckin = planResponse?.needs_checkin ?? false;
  const completedDates = new Set(
    (completedDaysData?.dates || []).map((isoDate) => {
      const d = new Date(isoDate + "T00:00:00");
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    })
  );

  // Find today's exercises for post-workout modal
  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayDay = days.find((d) => d.day === todayName) || days[0];
  const todayExercises = todayDay
    ? [
        ...(todayDay.main || []),
        ...(todayDay.superset?.exercises || []),
        ...(todayDay.core?.exercises || []),
        ...(todayDay.circuit?.exercises || []),
      ]
    : [];

  const handleCheckinNeeded = () => setCheckInOpen(true);

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-md mx-auto px-4 pt-12">
        {tab === "workouts" && (
          <WorkoutsTab
            days={days}
            weekNumber={weekNumber}
            mode={mode}
            isLoading={isLoading}
            error={error?.message}
            needsCheckin={needsCheckin}
            onCheckin={handleCheckinNeeded}
            onDone={() => setPostWorkoutOpen(true)}
            completedDates={completedDates}
            generating={planResponse?.generating}
            fallbackWeek={planResponse?.fallback_week}
          />
        )}
        {tab === "menu" && (
          <MenuTab weekNumber={weekNumber} mode={mode} />
        )}
      </div>

      <TabBar active={tab} onChange={setTab} />

      <AnimatePresence>
        {checkInOpen && (
          <CheckInModal
            open={checkInOpen}
            onClose={() => setCheckInOpen(false)}
            onComplete={(t) => {
              setCheckInOpen(false);
              setTab(t as Tab);
            }}
          />
        )}
        {postWorkoutOpen && (
          <PostWorkoutModal
            open={postWorkoutOpen}
            onClose={() => setPostWorkoutOpen(false)}
            exercises={todayExercises}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
