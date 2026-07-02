export type UserRole = "coach" | "client";

export type MuscleGroup =
  | "chest" | "back" | "shoulders" | "biceps" | "triceps"
  | "forearms" | "core" | "quads" | "hamstrings" | "glutes"
  | "calves" | "full_body" | "cardio" | "other";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  coach_id: string | null;
  habit_tracker_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Exercise {
  id: string;
  coach_id: string;
  name: string;
  description: string | null;
  muscle_groups: MuscleGroup[];
  youtube_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Program {
  id: string;
  coach_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgramWorkout {
  id: string;
  program_id: string;
  name: string;
  day_order: number;
  created_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  sets: number;
  reps: string;
  weight_kg: number | null;
  rest_seconds: number;
  order_index: number;
  superset_group: string | null;
  notes: string | null;
}

export interface ClientProgram {
  id: string;
  client_id: string;
  program_id: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  assigned_by: string;
  created_at: string;
}

export interface WorkoutLog {
  id: string;
  client_id: string;
  workout_id: string;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
  rpe: number | null;
}

export interface SetLog {
  id: string;
  workout_log_id: string;
  workout_exercise_id: string;
  set_number: number;
  reps_completed: number | null;
  weight_kg: number | null;
  notes: string | null;
  is_pr: boolean;
  logged_at: string;
}

export interface PersonalRecord {
  id: string;
  client_id: string;
  exercise_id: string;
  weight_kg: number;
  reps: number;
  set_log_id: string;
  achieved_at: string;
}
