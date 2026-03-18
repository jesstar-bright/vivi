import { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Loader2,
  Leaf,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useWeeklyMeals,
  useGenerateWeeklyMeals,
} from "@/hooks/useWeeklyMeals";
import type { Meal, DayPlan, WeeklyDay, GeminiGuidance } from "@/hooks/useWeeklyMeals";

const DAY_ABBREVS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDayName(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split("T")[0];
}

function getWorkoutBadge(
  dayName: string,
  guidance: GeminiGuidance | null
): string {
  if (!guidance) return "";
  const match = guidance.day_guidance.find(
    (g) => g.day.toLowerCase() === dayName.toLowerCase()
  );
  return match?.workout_type || "";
}

const mealSlots = [
  { key: "breakfast" as const, label: "BREAKFAST" },
  { key: "lunch" as const, label: "LUNCH" },
  { key: "dinner" as const, label: "DINNER" },
];

const MealRow = ({
  label,
  meal,
  isLast,
}: {
  label: string;
  meal: Meal;
  isLast: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={isLast ? "" : "border-b border-border/40"}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 py-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-semibold text-muted-foreground tracking-wider block">
            {label}
          </span>
          <span className="text-sm font-medium text-foreground line-clamp-1">
            {meal.name}
          </span>
          {meal.inspired_by && (
            <span className="text-[10px] text-primary/70 font-medium">
              via {meal.inspired_by}
            </span>
          )}
        </div>
        <div className="text-right shrink-0 mr-1">
          <span className="text-xs font-semibold text-foreground block">
            {meal.calories} cal
          </span>
          <span className="text-[10px] font-medium text-muted-foreground">
            {meal.protein_g}g protein
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`text-muted-foreground shrink-0 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="pb-3 space-y-2">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-1">
              INGREDIENTS
            </p>
            <div className="flex flex-wrap gap-1">
              {meal.ingredients.map((item) => (
                <span
                  key={item}
                  className="text-xs font-medium text-foreground bg-secondary/60 px-2 py-0.5 rounded-md"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-1">
              QUICK STEPS
            </p>
            <p className="text-xs font-medium text-foreground leading-relaxed">
              {meal.quick_steps}
            </p>
          </div>
          {meal.adaptations && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-1">
                ADAPTATIONS
              </p>
              <p className="text-xs font-medium text-foreground/70 leading-relaxed">
                {meal.adaptations}
              </p>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">
            Prep: {meal.prep_time}
          </p>
        </div>
      )}
    </div>
  );
};

const DayCard = ({
  day,
  guidance,
}: {
  day: WeeklyDay;
  guidance: GeminiGuidance | null;
}) => {
  const dayName = getDayName(day.date);
  const workoutBadge = getWorkoutBadge(dayName, guidance);
  const plan = day.plan;

  return (
    <div className="min-w-full snap-center px-1">
      <div className="card-elevated">
        {/* Day header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-foreground">{dayName}</h3>
            <span className="text-xs text-muted-foreground">
              {formatDate(day.date)}
            </span>
          </div>
          {workoutBadge && (
            <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">
              {workoutBadge}
            </span>
          )}
        </div>

        {/* Meals */}
        <div>
          {mealSlots.map(({ key, label }, i) => (
            <MealRow
              key={key}
              label={label}
              meal={plan[key]}
              isLast={i === mealSlots.length - 1}
            />
          ))}
        </div>

        {/* Daily totals */}
        <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Daily Totals
          </span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-foreground">
              {plan.daily_totals.calories} cal
            </span>
            <span className="text-sm font-bold text-primary">
              {plan.daily_totals.protein_g}g protein
            </span>
          </div>
        </div>

        {/* Batch prep notes */}
        {plan.batch_prep_notes && (
          <div className="mt-2 p-2 bg-primary/5 rounded-lg">
            <p className="text-[10px] font-semibold text-primary tracking-wider mb-0.5">
              BATCH PREP
            </p>
            <p className="text-xs font-medium text-foreground/80">
              {plan.batch_prep_notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const CoachCard = ({ guidance }: { guidance: GeminiGuidance }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card-elevated">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Leaf size={14} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-semibold text-muted-foreground tracking-wider block">
            NUTRITIONIST
          </span>
          <span className="text-sm font-medium text-foreground line-clamp-1">
            {guidance.weekly_focus}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`text-muted-foreground shrink-0 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-1">
              PCOS CONSIDERATIONS
            </p>
            <p className="text-xs font-medium text-foreground leading-relaxed">
              {guidance.pcos_considerations}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-1">
              SUPPLEMENTS
            </p>
            <p className="text-xs font-medium text-foreground leading-relaxed">
              {guidance.supplement_notes}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

interface MenuTabProps {
  weekNumber: number;
  mode: string;
}

const MenuTab = ({ weekNumber, mode }: MenuTabProps) => {
  const { data, isLoading, isError } = useWeeklyMeals(weekNumber);
  const generateMutation = useGenerateWeeklyMeals();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Find today's index in the days array
  const todayStr = new Date().toISOString().split("T")[0];
  const todayIndex = data?.days?.findIndex((d) => d.date === todayStr) ?? -1;

  // Scroll to today on initial load
  useEffect(() => {
    if (data?.days && todayIndex >= 0 && scrollRef.current) {
      const container = scrollRef.current;
      const cardWidth = container.scrollWidth / data.days.length;
      container.scrollTo({ left: cardWidth * todayIndex, behavior: "instant" });
      setActiveIndex(todayIndex);
    }
  }, [data?.days, todayIndex]);

  // Track scroll position for dot indicator
  const handleScroll = () => {
    if (!scrollRef.current || !data?.days) return;
    const container = scrollRef.current;
    const cardWidth = container.scrollWidth / data.days.length;
    const newIndex = Math.round(container.scrollLeft / cardWidth);
    if (newIndex !== activeIndex) setActiveIndex(newIndex);
  };

  // Navigate to specific day
  const goToDay = (index: number) => {
    if (!scrollRef.current || !data?.days) return;
    const container = scrollRef.current;
    const cardWidth = container.scrollWidth / data.days.length;
    container.scrollTo({ left: cardWidth * index, behavior: "smooth" });
    setActiveIndex(index);
  };

  // Weekly averages
  const avgCalories =
    data?.days
      ? Math.round(
          data.days.reduce((s, d) => s + d.plan.daily_totals.calories, 0) /
            data.days.length
        )
      : 0;
  const avgProtein =
    data?.days
      ? Math.round(
          data.days.reduce((s, d) => s + d.plan.daily_totals.protein_g, 0) /
            data.days.length
        )
      : 0;

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Menu
        </h1>
        <div className="card-elevated flex items-center justify-center py-16 gap-2">
          <Loader2 size={16} className="text-primary animate-spin" />
          <p className="text-sm font-medium text-muted-foreground">
            Loading your menu...
          </p>
        </div>
      </div>
    );
  }

  // No data — offer to generate
  if (isError || !data?.days || data.days.length === 0) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Menu
        </h1>
        <div className="card-elevated flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-sm font-medium text-muted-foreground text-center">
            No weekly menu yet.
          </p>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                Generate Weekly Menu
              </>
            )}
          </button>
          {generateMutation.isError && (
            <p className="text-xs text-red-400 text-center">
              Generation failed. Make sure you have a workout plan for this
              week.
            </p>
          )}
        </div>
      </div>
    );
  }

  const guidance = data.gemini_guidance as GeminiGuidance | null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Menu
          </h1>
          <p className="text-xs text-muted-foreground font-medium">
            Week {weekNumber}
            {mode ? ` · ${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Weekly Avg</p>
          <p className="text-sm font-bold text-foreground">
            {avgCalories} cal · {avgProtein}g protein
          </p>
        </div>
      </div>

      {/* Week navigation dots */}
      <div className="flex items-center justify-center gap-1">
        {data.days.map((day, i) => {
          const today = isToday(day.date);
          const active = i === activeIndex;
          return (
            <button
              key={day.date}
              onClick={() => goToDay(i)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all ${
                active
                  ? "bg-primary/10"
                  : "hover:bg-secondary/50"
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
                {DAY_ABBREVS[i]}
              </span>
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  active
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
        {data.days.map((day) => (
          <DayCard key={day.date} day={day} guidance={guidance} />
        ))}
      </div>

      {/* Coach card */}
      {guidance && <CoachCard guidance={guidance} />}
    </div>
  );
};

export default MenuTab;
