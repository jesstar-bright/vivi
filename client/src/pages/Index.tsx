import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import TabBar from "@/components/TabBar";
import WorkoutsTab from "@/components/WorkoutsTab";
import LifestyleTab from "@/components/LifestyleTab";
import ProfileTab from "@/components/ProfileTab";
import CheckInModal from "@/components/CheckInModal";
import PostWorkoutModal from "@/components/PostWorkoutModal";
import { useCurrentPlan } from "@/hooks/useCurrentPlan";
import { transformPlanDays, transformNutrition } from "@/lib/transformPlan";

type Tab = "workouts" | "lifestyle" | "profile";

const Index = () => {
  const [tab, setTab] = useState<Tab>("workouts");
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [postWorkoutOpen, setPostWorkoutOpen] = useState(false);
  const { data: planResponse, isLoading, error } = useCurrentPlan();

  const days = planResponse?.plan
    ? transformPlanDays(planResponse.plan)
    : [];
  const nutrition = planResponse?.plan
    ? transformNutrition(planResponse.plan)
    : null;
  const weekNumber = planResponse?.week ?? 1;
  const mode = planResponse?.mode ?? "";
  const needsCheckin = planResponse?.needs_checkin ?? false;

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
          />
        )}
        {tab === "lifestyle" && (
          <LifestyleTab nutrition={nutrition} isLoading={isLoading} />
        )}
        {tab === "profile" && <ProfileTab />}
      </div>

      <TabBar active={tab} onChange={setTab} />

      <AnimatePresence>
        {checkInOpen && (
          <CheckInModal
            open={checkInOpen}
            onClose={() => setCheckInOpen(false)}
            onComplete={(t) => {
              setCheckInOpen(false);
              setTab(t);
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
