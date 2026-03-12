import type { WeeklyPlan } from '../services/plan-generator.js';

export function getWeek1FallbackPlan(weekNumber: number): WeeklyPlan {
  const startDate = new Date('2026-03-09');
  startDate.setDate(startDate.getDate() + (weekNumber - 1) * 7);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  return {
    week_number: weekNumber,
    mode: 'rampup',
    date_range: { start: fmt(startDate), end: fmt(endDate) },
    days: [
      {
        day: 'Thursday',
        title: 'Upper Body',
        type: 'strength',
        warmup: ['Arm circles 30 sec each', 'Band pull-aparts 15', 'Light lat pulldowns 10'],
        exercises: [
          { name: 'Lat pulldowns', sets: 3, reps: '12', suggested_weight: '70 lbs', suggested_weight_reasoning: 'Moderate starting weight for ramp-up', rest: '60s', notes: '' },
          { name: 'DB shoulder press', sets: 3, reps: '10', suggested_weight: '15 lbs', suggested_weight_reasoning: 'Light — avoid heavy overhead pressing post-op', rest: '60s', notes: 'Keep light' },
          { name: 'Seated cable rows', sets: 3, reps: '12', suggested_weight: '60 lbs', suggested_weight_reasoning: 'Moderate', rest: '60s', notes: '' },
          { name: 'Lateral raises', sets: 3, reps: '12', suggested_weight: '10 lbs', suggested_weight_reasoning: 'Light isolation', rest: '45s', notes: '' },
          { name: 'Face pulls', sets: 3, reps: '15', suggested_weight: '30 lbs', suggested_weight_reasoning: 'Light cable work', rest: '45s', notes: '' },
          { name: 'Rear delt flyes', sets: 3, reps: '12', suggested_weight: '10 lbs', suggested_weight_reasoning: 'Light isolation', rest: '45s', notes: '' },
          { name: 'Bicep curls', sets: 2, reps: '12', suggested_weight: '15 lbs', suggested_weight_reasoning: 'Moderate', rest: '30s', notes: '' },
          { name: 'Tricep pushdowns', sets: 2, reps: '12', suggested_weight: '30 lbs', suggested_weight_reasoning: 'Moderate cable', rest: '30s', notes: '' },
          { name: 'Hammer curls', sets: 2, reps: '10', suggested_weight: '12.5 lbs', suggested_weight_reasoning: 'Light', rest: '30s', notes: '' },
        ],
        cooldown: ['10 min incline walk (10%, 3.0 mph)'],
        estimated_duration: '55 min',
      },
      {
        day: 'Friday',
        title: 'Rowing Intervals',
        type: 'vigorous',
        warmup: ['5 min easy row'],
        exercises: [
          { name: 'Rowing intervals', sets: 6, reps: '2 min moderate-hard / 2 min easy', suggested_weight: 'bodyweight', suggested_weight_reasoning: 'Cardio — no weight', rest: '0s', notes: 'First vigorous day back. Start conservative.' },
        ],
        cooldown: ['3 min easy row', 'Plank hold 30 sec', 'Side plank 20 sec each', 'Dead bugs 10 each'],
        estimated_duration: '30 min',
      },
      {
        day: 'Saturday',
        title: 'Lower Body',
        type: 'strength',
        warmup: ['Banded glute bridges 20', 'Banded clamshells 15 each', 'Bodyweight squats 10'],
        exercises: [
          { name: 'Leg press', sets: 3, reps: '15', suggested_weight: '140 lbs', suggested_weight_reasoning: 'Moderate — higher reps, no bearing down', rest: '60s', notes: '' },
          { name: 'Romanian deadlifts', sets: 3, reps: '12', suggested_weight: '65 lbs', suggested_weight_reasoning: 'Light barbell', rest: '60s', notes: '' },
          { name: 'Hip thrusts', sets: 3, reps: '12', suggested_weight: '95 lbs', suggested_weight_reasoning: 'Moderate barbell', rest: '60s', notes: '' },
          { name: 'Walking lunges', sets: 3, reps: '10 each', suggested_weight: '15 lbs', suggested_weight_reasoning: 'Light DBs', rest: '60s', notes: '' },
          { name: 'Leg curl', sets: 3, reps: '12', suggested_weight: '60 lbs', suggested_weight_reasoning: 'Moderate machine', rest: '45s', notes: '' },
          { name: 'Cable kickbacks', sets: 3, reps: '12 each', suggested_weight: '15 lbs', suggested_weight_reasoning: 'Light cable', rest: '45s', notes: '' },
          { name: 'Hip abductor machine', sets: 3, reps: '15', suggested_weight: '70 lbs', suggested_weight_reasoning: 'Moderate', rest: '45s', notes: '' },
        ],
        cooldown: ['15 min stair climber (moderate)', 'Dead bugs 12 each', 'Bird dogs 12 each', 'Plank hold 30 sec'],
        estimated_duration: '60 min',
      },
      {
        day: 'Sunday',
        title: 'Tennis + Recovery',
        type: 'recovery',
        warmup: [],
        exercises: [
          { name: 'Tennis', sets: 1, reps: 'normal intensity', suggested_weight: 'bodyweight', suggested_weight_reasoning: 'Active sport', rest: '0s', notes: 'No swimming yet (3 more weeks)' },
        ],
        cooldown: ['Stretch 10 min'],
        estimated_duration: '90 min',
      },
      {
        day: 'Monday',
        title: 'Spin or Bike Intervals',
        type: 'vigorous',
        warmup: ['5 min warmup'],
        exercises: [
          { name: 'Spin/Bike intervals', sets: 5, reps: '3 min hard / 2 min easy', suggested_weight: 'bodyweight', suggested_weight_reasoning: 'Cardio', rest: '0s', notes: 'Second vigorous day. 70-80% effort.' },
        ],
        cooldown: ['5 min cooldown'],
        estimated_duration: '35 min',
      },
      {
        day: 'Tuesday',
        title: 'Active Recovery',
        type: 'rest',
        warmup: [],
        exercises: [
          { name: 'Incline walk', sets: 1, reps: '30 min', suggested_weight: 'bodyweight', suggested_weight_reasoning: '10-12%, 3.0 mph', rest: '0s', notes: '' },
          { name: 'Foam roll', sets: 1, reps: '10 min', suggested_weight: 'bodyweight', suggested_weight_reasoning: '', rest: '0s', notes: '' },
          { name: 'Stretch or gentle yoga', sets: 1, reps: '15 min', suggested_weight: 'bodyweight', suggested_weight_reasoning: 'No inversions', rest: '0s', notes: '' },
        ],
        cooldown: ['Sauna if available — 15 min'],
        estimated_duration: '60 min',
      },
      {
        day: 'Wednesday',
        title: 'Zone 2 + Glute Activation',
        type: 'recovery',
        warmup: ['Banded glute bridges 20', 'Banded lateral walks 15 each', 'Fire hydrants 12 each', 'Donkey kicks 12 each'],
        exercises: [
          { name: 'Zone 2 cardio', sets: 1, reps: '35-40 min', suggested_weight: 'bodyweight', suggested_weight_reasoning: 'HR 120-140 bpm. Incline walk or easy bike.', rest: '0s', notes: 'Fat-burning, recovery cardio' },
        ],
        cooldown: ['Stretch 5 min'],
        estimated_duration: '50 min',
      },
    ],
    weekly_cardio: {
      zone2_sessions: 2,
      zone2_duration: '35-40 min',
      vigorous_target: '15-25 vigorous minutes per session',
      notes: 'Start conservative. First vigorous sessions back.',
    },
    nutrition: {
      calories: 1575,
      protein_g: 135,
      carb_timing: 'Carbs around training only. Supports insulin sensitivity.',
      hydration: '80-100 oz',
      focus: 'Anti-inflammatory',
    },
    trainer_message: "Week 1 is about showing up, not showing off. Ease back in. Your body remembers more than you think.",
  };
}
