export type WorkoutType = 'strength' | 'vigorous' | 'recovery' | 'rest';

export interface DayData {
  day: string;
  date: string;
  subtitle: string;
  type: WorkoutType;
  caution?: string;
  note?: string;
  rest?: boolean;
  activities?: string[];
  warmup?: string[];
  main?: string[];
  superset?: { label: string; exercises: string[] };
  core?: { label: string; exercises: string[] };
  circuit?: { label: string; exercises: string[] };
  vigorous?: { title: string; content: string; target: string };
  finisher?: string;
}

export const weekData: DayData[] = [
  {
    day: "Thursday", date: "Mar 12", subtitle: "Upper Body", type: "strength",
    caution: "Avoid heavy overhead pressing. Keep breathing steady.",
    warmup: ["Arm circles 30 sec each", "Band pull-aparts 15", "Light lat pulldowns 10"],
    main: ["Lat pulldowns 3×12", "DB shoulder press (light) 3×10", "Seated cable rows 3×12", "Lateral raises 3×12", "Face pulls 3×15", "Rear delt flyes 3×12"],
    superset: { label: "Arms — 2 rounds", exercises: ["Bicep curls 12", "Tricep pushdowns 12", "Hammer curls 10"] },
    core: { label: "Core — 2 rounds (no inversions)", exercises: ["Pallof press 10 each", "Bird dogs 10 each", "Dead bugs (slow) 10 each"] },
    finisher: "10 min incline walk (10%, 3.0 mph)"
  },
  {
    day: "Friday", date: "Mar 13", subtitle: "Rowing Intervals", type: "vigorous",
    note: "First vigorous day back. Start conservative.",
    vigorous: { title: "Rowing — 20-25 min", content: "Warm-up: 5 min easy row\n6 rounds: 2 min moderate-hard / 2 min easy recovery\nCool-down: 3 min easy row", target: "15-20 vigorous minutes" },
    core: { label: "Core — 2 rounds", exercises: ["Plank hold 30 sec", "Side plank 20 sec each", "Dead bugs 10 each"] }
  },
  {
    day: "Saturday", date: "Mar 14", subtitle: "Lower Body", type: "strength",
    caution: "Moderate weights, higher reps. No bearing down.",
    warmup: ["Banded glute bridges 20", "Banded clamshells 15 each", "Bodyweight squats 10"],
    main: ["Leg press (moderate) 3×15", "Romanian deadlifts (light) 3×12", "Hip thrusts 3×12", "Walking lunges 3×10 each", "Leg curl 3×12", "Cable kickbacks 3×12 each", "Hip abductor machine 3×15"],
    core: { label: "Core — 2 rounds", exercises: ["Dead bugs 12 each", "Bird dogs 12 each", "Plank hold 30 sec"] },
    finisher: "15 min stair climber (moderate)"
  },
  {
    day: "Sunday", date: "Mar 15", subtitle: "Tennis + Check-In", type: "recovery", rest: true,
    activities: ["Tennis — normal intensity", "No swimming yet (3 more weeks)", "After tennis: weekly check-in", "6 PM reminder set"]
  },
  {
    day: "Monday", date: "Mar 16", subtitle: "Spin or Bike Intervals", type: "vigorous",
    note: "Second vigorous day. You should be feeling good.",
    vigorous: { title: "Spin or Bike — 30-40 min", content: "Option A: Spin class 70-80% effort\nOption B: Solo bike — 5 min warmup, 5 rounds 3 min hard / 2 min easy, 5 min cooldown", target: "20-25 vigorous minutes" }
  },
  {
    day: "Tuesday", date: "Mar 17", subtitle: "Active Recovery", type: "rest", rest: true,
    activities: ["30 min incline walk (10-12%, 3.0 mph)", "Foam roll — 10 min", "Stretch or gentle yoga (no inversions)", "Sauna if available — 15 min"]
  },
  {
    day: "Wednesday", date: "Mar 18", subtitle: "Zone 2 + Glute Activation", type: "recovery",
    note: "Heart rate 120-140 bpm. Fat-burning, recovery cardio.",
    circuit: { label: "Glute Activation — 2 rounds", exercises: ["Banded glute bridges 20", "Banded lateral walks 15 each", "Fire hydrants 12 each", "Donkey kicks 12 each"] },
    finisher: "35-40 min Zone 2: incline walk or easy bike"
  }
];

export const nutritionData = {
  protein: "130-140g",
  calories: "1500-1650",
  water: "80-100 oz",
  focus: "Anti-inflammatory",
  note: "Carbs around training only. Supports insulin sensitivity."
};

export const sleepData = {
  target: "7.5 hrs",
  timeline: [
    { time: "7:30 PM", label: "Last meal" },
    { time: "8:30 PM", label: "Stop fluids" },
    { time: "9:00 PM", label: "Screens off" },
    { time: "9:30 PM", label: "Lights out" },
    { time: "5:30 AM", label: "Wake" },
  ],
  note: "Poor sleep = high cortisol = fat storage. You can't out-train it."
};

export const progressData = {
  narrative: "Check in Sunday to unlock your progress story.",
  strength: "Train a week. Then the numbers show.",
  metrics: "Health trends appear after your first week.",
  weeks: Array.from({ length: 12 }, (_, i) => ({ week: i + 1, status: 'upcoming' as const }))
};
