import { useState, useRef, useEffect } from "react";
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
  generating?: boolean;
  fallbackWeek?: number;
}

const modeLabel: Record<string, string> = {
  push: "Push",
  maintain: "Maintain",
  rampup: "Ramp-Up",
};

const DAY_ABBREVS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getDayAbbrev(dayName: string): string {
  const map: Record<string, string> = {
    Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed",
    Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
  };
  return map[dayName] || dayName.slice(0, 3);
}

function isTodayName(dayName: string): boolean {
  return dayName === new Date().toLocaleDateString("en-US", { weekday: "long" });
}

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
  generating,
  fallbackWeek,
}: WorkoutsTabProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Find today's index
  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayIndex = days.findIndex((d) => d.day === todayName);

  // Scroll to today on initial load
  useEffect(() => {
    if (days.length > 0 && todayIndex >= 0 && scrollRef.current) {
      const container = scrollRef.current;
      const cardWidth = container.scrollWidth / days.length;
      container.scrollTo({ left: cardWidth * todayIndex, behavior: "instant" });
      setActiveIndex(todayIndex);
    }
  }, [days.length, todayIndex]);

  const handleScroll = () => {
    if (!scrollRef.current || days.length === 0) return;
    const container = scrollRef.current;
    const cardWidth = container.scrollWidth / days.length;
    const newIndex = Math.round(container.scrollLeft / cardWidth);
    if (newIndex !== activeIndex) setActiveIndex(newIndex);
  };

  const goToDay = (index: number) => {
    if (!scrollRef.current || days.length === 0) return;
    const container = scrollRef.current;
    const cardWidth = container.scrollWidth / days.length;
    container.scrollTo({ left: cardWidth * index, behavior: "smooth" });
    setActiveIndex(index);
  };

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
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
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

      {generating && (
        <div className="card-elevated bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 rounded-xl flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
            Generating your Week {weekNumber} plan... Showing Week {fallbackWeek} in the meantime.
          </p>
        </div>
      )}

      {/* Week navigation dots */}
      <div className="flex items-center justify-center gap-1">
        {days.map((day, i) => {
          const today = isTodayName(day.day);
          const active = i === activeIndex;
          const completed = completedDates.has(day.date);
          return (
            <button
              key={day.day}
              onClick={() => goToDay(i)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all ${
                active ? "bg-primary/10" : "hover:bg-secondary/50"
              }`}
            >
              <span
                className={`text-[10px] font-semibold ${
                  active
                    ? "text-primary"
                    : today
                      ? "text-foreground"
                      : "text-muted-foreground"
                }`}
              >
                {getDayAbbrev(day.day)}
              </span>
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  completed
                    ? "bg-emerald-500"
                    : active
                      ? "bg-primary"
                      : today
                        ? "bg-foreground/40"
                        : "bg-muted-foreground/30"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Swipeable day carousel */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {days.map((day) => (
          <div key={day.day} className="min-w-full snap-center px-1">
            <DayCard
              data={day}
              isToday={day.day === todayName}
              onDone={onDone}
              completedDates={completedDates}
              defaultOpen
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkoutsTab;
