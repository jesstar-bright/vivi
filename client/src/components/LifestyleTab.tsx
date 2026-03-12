import { Droplets, Flame, Beef, Leaf, Moon, Clock } from "lucide-react";
import { nutritionData, sleepData } from "@/data/workoutData";

const NutritionGrid = () => (
  <div className="card-elevated">
    <h2 className="text-lg font-bold mb-4 text-foreground">Nutrition</h2>
    <div className="grid grid-cols-2 gap-2.5">
      {[
        { icon: Beef, label: "Protein", value: nutritionData.protein },
        { icon: Flame, label: "Calories", value: nutritionData.calories },
        { icon: Droplets, label: "Water", value: nutritionData.water },
        { icon: Leaf, label: "Focus", value: nutritionData.focus },
      ].map(({ icon: Icon, label, value }) => (
        <div key={label} className="card-elevated-sm flex items-center gap-3 bg-secondary/50">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon size={16} className="text-primary" />
          </div>
          <div className="text-left">
            <span className="text-[11px] font-medium text-muted-foreground block">{label}</span>
            <span className="text-sm font-bold text-foreground">{value}</span>
          </div>
        </div>
      ))}
    </div>
    <p className="text-xs text-muted-foreground mt-3 font-medium italic">{nutritionData.note}</p>
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
      {sleepData.timeline.map(({ time, label }, i) => (
        <div key={time} className="flex items-center gap-3 relative">
          <div className="w-2.5 h-2.5 rounded-full bg-primary/40 shrink-0 -ml-[7px] ring-2 ring-card" />
          <span className="text-xs font-semibold text-muted-foreground w-16 shrink-0">{time}</span>
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
      ))}
    </div>
    <p className="text-xs text-muted-foreground mt-4 font-medium italic">{sleepData.note}</p>
  </div>
);

const GroceryCard = () => (
  <div className="card-elevated flex items-center justify-center py-10">
    <p className="text-sm font-medium text-muted-foreground">🛒 Grocery List — Coming Soon</p>
  </div>
);

const LifestyleTab = () => (
  <div className="space-y-3">
    <h1 className="text-2xl font-bold tracking-tight text-foreground mb-4">Lifestyle</h1>
    <NutritionGrid />
    <SleepCard />
    <GroceryCard />
  </div>
);

export default LifestyleTab;
