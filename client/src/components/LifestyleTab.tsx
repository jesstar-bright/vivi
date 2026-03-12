import { Droplets, Flame, Beef, Leaf, Moon } from "lucide-react";
import type { NutritionData } from "@/data/workoutData";

const sleepData = {
  target: "7.5 hrs",
  timeline: [
    { time: "7:30 PM", label: "Last meal" },
    { time: "8:30 PM", label: "Stop fluids" },
    { time: "9:00 PM", label: "Screens off" },
    { time: "9:30 PM", label: "Lights out" },
    { time: "5:30 AM", label: "Wake" },
  ],
  note: "Poor sleep = high cortisol = fat storage. You can't out-train it.",
};

const NutritionGrid = ({ data }: { data: NutritionData }) => (
  <div className="card-elevated">
    <h2 className="text-lg font-bold mb-4 text-foreground">Nutrition</h2>
    <div className="grid grid-cols-2 gap-2.5">
      {[
        { icon: Beef, label: "Protein", value: data.protein },
        { icon: Flame, label: "Calories", value: data.calories },
        { icon: Droplets, label: "Water", value: data.water },
        { icon: Leaf, label: "Focus", value: data.focus },
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
    <p className="text-xs text-muted-foreground mt-3 font-medium italic">
      {data.note}
    </p>
  </div>
);

const SleepCard = () => (
  <div className="card-elevated">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-bold text-foreground">Sleep</h2>
      <span className="flex items-center gap-1.5 text-sm font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg">
        <Moon size={14} /> {sleepData.target}
      </span>
    </div>
    <div className="relative pl-5 space-y-3">
      <div className="absolute left-[9px] top-2 bottom-2 w-0.5 rounded-full bg-primary/15" />
      {sleepData.timeline.map(({ time, label }) => (
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
      {sleepData.note}
    </p>
  </div>
);

const GroceryCard = () => (
  <div className="card-elevated flex items-center justify-center py-10">
    <p className="text-sm font-medium text-muted-foreground">
      Grocery List — Coming Soon
    </p>
  </div>
);

interface LifestyleTabProps {
  nutrition: NutritionData | null;
  isLoading: boolean;
}

const LifestyleTab = ({ nutrition, isLoading }: LifestyleTabProps) => (
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
    <SleepCard />
    <GroceryCard />
  </div>
);

export default LifestyleTab;
