import { useState } from "react";
import {
  ChevronDown,
  Droplets,
  Flame,
  Beef,
  Leaf,
  Moon,
  TrendingUp,
  TrendingDown,
  Minus,
  UtensilsCrossed,
  Loader2,
} from "lucide-react";
import type { NutritionData } from "@/data/workoutData";
import { useTodayMeals } from "@/hooks/useTodayMeals";
import type { Meal } from "@/hooks/useTodayMeals";

const defaultTimeline = [
  { time: "8:00 PM", label: "Last caffeine cutoff" },
  { time: "8:30 PM", label: "Dim lights, no screens" },
  { time: "9:00 PM", label: "Journal or read" },
  { time: "9:15 PM", label: "Magnesium + lights out" },
  { time: "5:30 AM", label: "Wake" },
];

const defaultSleepNote =
  "Poor sleep = high cortisol = fat storage. You can't out-train it.";

const ExpandableNutritionCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size: number; className?: string }>;
  label: string;
  value: string;
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="card-elevated-sm flex items-center gap-3 bg-secondary/50 w-full text-left"
    >
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon size={16} className="text-primary" />
      </div>
      <div className="text-left min-w-0 flex-1">
        <span className="text-[11px] font-medium text-muted-foreground block">
          {label}
        </span>
        <span
          className={`text-sm font-medium text-foreground ${expanded ? "" : "line-clamp-2"}`}
        >
          {value}
        </span>
      </div>
      <ChevronDown
        size={14}
        className={`text-muted-foreground shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
      />
    </button>
  );
};

const NutritionGrid = ({ data }: { data: NutritionData }) => (
  <div className="card-elevated">
    <h2 className="text-lg font-bold mb-4 text-foreground">Nutrition</h2>

    {/* Protein & Calories — short values, 2-col grid */}
    <div className="grid grid-cols-2 gap-2.5">
      {[
        { icon: Beef, label: "Protein", value: data.protein },
        { icon: Flame, label: "Calories", value: data.calories },
      ].map(({ icon: Icon, label, value }) => (
        <div
          key={label}
          className="card-elevated-sm flex items-center gap-3 bg-secondary/50"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon size={16} className="text-primary" />
          </div>
          <div className="text-left">
            <span className="text-[11px] font-medium text-muted-foreground block">
              {label}
            </span>
            <span className="text-sm font-bold text-foreground">{value}</span>
          </div>
        </div>
      ))}
    </div>

    {/* Hydration & Focus — expandable full-width cards */}
    <div className="mt-2.5 space-y-2">
      {[
        { icon: Droplets, label: "Hydration", value: data.water },
        { icon: Leaf, label: "Focus", value: data.focus },
      ].map(({ icon: Icon, label, value }) => (
        <ExpandableNutritionCard key={label} icon={Icon} label={label} value={value} />
      ))}
    </div>

    <p className="text-xs text-muted-foreground mt-3 font-medium italic">
      {data.note}
    </p>
  </div>
);

interface SleepInsight {
  avgHours: number;
  trend: "improving" | "declining" | "stable";
  tip: string;
}

const TrendIndicator = ({ trend }: { trend: SleepInsight["trend"] }) => {
  switch (trend) {
    case "improving":
      return <TrendingUp size={14} className="text-green-500" />;
    case "declining":
      return <TrendingDown size={14} className="text-red-400" />;
    case "stable":
      return <Minus size={14} className="text-muted-foreground" />;
  }
};

const SleepCard = ({ sleepInsight }: { sleepInsight?: SleepInsight }) => (
  <div className="card-elevated">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-bold text-foreground">Sleep</h2>
      <span className="flex items-center gap-1.5 text-sm font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg">
        <Moon size={14} />
        {sleepInsight ? `${sleepInsight.avgHours} hrs` : "—"}
        {sleepInsight && (
          <TrendIndicator trend={sleepInsight.trend} />
        )}
      </span>
    </div>

    <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
      Wind-Down Routine
    </p>

    <div className="relative pl-5 space-y-3">
      <div className="absolute left-[9px] top-2 bottom-2 w-0.5 rounded-full bg-primary/15" />
      {defaultTimeline.map(({ time, label }) => (
        <div key={time} className="flex items-center gap-3 relative">
          <div className="w-2.5 h-2.5 rounded-full bg-primary/40 shrink-0 -ml-[7px] ring-2 ring-card" />
          <span className="text-xs font-semibold text-muted-foreground w-16 shrink-0">
            {time}
          </span>
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
      ))}
    </div>
    <p className="text-xs text-muted-foreground mt-4 font-medium italic">
      {sleepInsight?.tip ?? defaultSleepNote}
    </p>
  </div>
);

const mealSlots = [
  { key: "breakfast", label: "BREAKFAST" },
  { key: "lunch", label: "LUNCH" },
  { key: "dinner", label: "DINNER" },
] as const;

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
          className={`text-muted-foreground shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
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
          <p className="text-[10px] text-muted-foreground">
            Prep: {meal.prep_time}
          </p>
        </div>
      )}
    </div>
  );
};

const MenuCard = () => {
  const { data, isLoading, isError } = useTodayMeals();

  if (isLoading) {
    return (
      <div className="card-elevated flex items-center justify-center py-10 gap-2">
        <Loader2 size={16} className="text-primary animate-spin" />
        <p className="text-sm font-medium text-muted-foreground">
          Preparing your menu...
        </p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="card-elevated flex items-center justify-center py-10">
        <p className="text-sm font-medium text-muted-foreground">
          Menu unavailable
        </p>
      </div>
    );
  }

  return (
    <div className="card-elevated">
      <div className="flex items-center gap-2 mb-3">
        <UtensilsCrossed size={18} className="text-primary" />
        <h2 className="text-lg font-bold text-foreground">Today's Menu</h2>
        <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full ml-auto">
          Blue Zone
        </span>
      </div>

      <div>
        {mealSlots.map(({ key, label }, i) => (
          <MealRow
            key={key}
            label={label}
            meal={data[key]}
            isLast={i === mealSlots.length - 1}
          />
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Daily Totals
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-foreground">
            {data.daily_totals.calories} cal
          </span>
          <span className="text-sm font-bold text-primary">
            {data.daily_totals.protein_g}g protein
          </span>
        </div>
      </div>
    </div>
  );
};

interface LifestyleTabProps {
  nutrition: NutritionData | null;
  isLoading: boolean;
  sleepInsight?: SleepInsight;
}

const LifestyleTab = ({
  nutrition,
  isLoading,
  sleepInsight,
}: LifestyleTabProps) => (
  <div className="space-y-3">
    <h1 className="text-2xl font-bold tracking-tight text-foreground mb-4">
      Lifestyle
    </h1>
    {isLoading ? (
      <div className="card-elevated text-center py-10">
        <p className="text-sm text-muted-foreground font-medium">Loading...</p>
      </div>
    ) : nutrition ? (
      <NutritionGrid data={nutrition} />
    ) : (
      <div className="card-elevated text-center py-10">
        <p className="text-sm text-muted-foreground font-medium">
          Complete a check-in to see your nutrition plan.
        </p>
      </div>
    )}
    <SleepCard sleepInsight={sleepInsight} />
    <MenuCard />
  </div>
);

export default LifestyleTab;
