import DayCard from "./DayCard";
import CreaLogo from "./DiamondLogo";
import type { DayData } from "@/data/workoutData";

interface WorkoutsTabProps {
  days: DayData[];
  weekNumber: number;
  mode: string;
  isLoading: boolean;
  error?: string;
  needsCheckin: boolean;
  onCheckin: () => void;
  onDone: () => void;
  completedDates: Set<string>;
}

const modeLabel: Record<string, string> = {
  push: "Push",
  maintain: "Maintain",
  rampup: "Ramp-Up",
};

const WorkoutsTab = ({
  days,
  weekNumber,
  mode,
  isLoading,
  error,
  needsCheckin,
  onCheckin,
  onDone,
  completedDates,
}: WorkoutsTabProps) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <CreaLogo size={40} />
        <p className="text-sm text-muted-foreground font-medium">
          Loading your plan...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-elevated text-center py-10">
        <p className="text-sm text-destructive font-medium">{error}</p>
      </div>
    );
  }

  if (needsCheckin) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-0.5">
          <CreaLogo size={22} />
          <p
            className="text-sm font-bold uppercase tracking-widest"
            style={{
              fontFamily: "'Syne', sans-serif",
              background: "var(--gradient-hero)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Crea
          </p>
        </div>
        <div className="card-elevated text-center py-12 space-y-4">
          <h2 className="text-xl font-bold text-foreground">
            Time for your check-in
          </h2>
          <p className="text-sm text-muted-foreground font-medium">
            Complete your weekly check-in to generate this week's plan.
          </p>
          <button onClick={onCheckin} className="btn-primary">
            Start Check-In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <CreaLogo size={22} />
            <p
              className="text-sm font-bold uppercase tracking-widest"
              style={{
                fontFamily: "'Syne', sans-serif",
                background: "var(--gradient-hero)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Crea
            </p>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Week {weekNumber} — {modeLabel[mode] || mode}
          </h1>
        </div>
      </div>
      {(() => {
        const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
        const todayIdx = days.findIndex((d) => d.day === todayName);
        const sorted = todayIdx > 0
          ? [...days.slice(todayIdx), ...days.slice(0, todayIdx)]
          : days;
        return sorted.map((day) => (
          <DayCard key={day.day} data={day} isToday={day.day === todayName} onDone={onDone} completedDates={completedDates} />
        ));
      })()}
    </div>
  );
};

export default WorkoutsTab;
