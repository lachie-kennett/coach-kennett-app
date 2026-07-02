// Re-export from main types for convenience
export type { UserRole, MuscleGroup, Profile, Exercise, Program, ProgramWorkout, WorkoutExercise, ClientProgram, WorkoutLog, SetLog, PersonalRecord } from "@/lib/types";

// Supabase Database generic type
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: "coach" | "client";
          coach_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: "coach" | "client";
          coach_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: "coach" | "client";
          coach_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      exercises: {
        Row: {
          id: string;
          coach_id: string;
          name: string;
          description: string | null;
          muscle_groups: string[];
          youtube_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          coach_id: string;
          name: string;
          description?: string | null;
          muscle_groups?: string[];
          youtube_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          muscle_groups?: string[];
          youtube_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      programs: {
        Row: {
          id: string;
          coach_id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          coach_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      program_workouts: {
        Row: {
          id: string;
          program_id: string;
          name: string;
          day_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          program_id: string;
          name: string;
          day_order?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          day_order?: number;
        };
        Relationships: [];
      };
      workout_exercises: {
        Row: {
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
        };
        Insert: {
          id?: string;
          workout_id: string;
          exercise_id: string;
          sets?: number;
          reps?: string;
          weight_kg?: number | null;
          rest_seconds?: number;
          order_index?: number;
          superset_group?: string | null;
          notes?: string | null;
        };
        Update: {
          sets?: number;
          reps?: string;
          weight_kg?: number | null;
          rest_seconds?: number;
          order_index?: number;
          superset_group?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      client_programs: {
        Row: {
          id: string;
          client_id: string;
          program_id: string;
          start_date: string;
          is_active: boolean;
          assigned_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          program_id: string;
          start_date: string;
          is_active?: boolean;
          assigned_by: string;
          created_at?: string;
        };
        Update: {
          start_date?: string;
          is_active?: boolean;
        };
        Relationships: [];
      };
      workout_logs: {
        Row: {
          id: string;
          client_id: string;
          workout_id: string;
          started_at: string;
          completed_at: string | null;
          notes: string | null;
          rpe: number | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          workout_id: string;
          started_at?: string;
          completed_at?: string | null;
          notes?: string | null;
          rpe?: number | null;
        };
        Update: {
          completed_at?: string | null;
          notes?: string | null;
          rpe?: number | null;
        };
        Relationships: [];
      };
      set_logs: {
        Row: {
          id: string;
          workout_log_id: string;
          workout_exercise_id: string;
          set_number: number;
          reps_completed: number | null;
          weight_kg: number | null;
          notes: string | null;
          is_pr: boolean;
          logged_at: string;
        };
        Insert: {
          id?: string;
          workout_log_id: string;
          workout_exercise_id: string;
          set_number: number;
          reps_completed?: number | null;
          weight_kg?: number | null;
          notes?: string | null;
          is_pr?: boolean;
          logged_at?: string;
        };
        Update: {
          reps_completed?: number | null;
          weight_kg?: number | null;
          notes?: string | null;
          is_pr?: boolean;
        };
        Relationships: [];
      };
      personal_records: {
        Row: {
          id: string;
          client_id: string;
          exercise_id: string;
          weight_kg: number;
          reps: number;
          set_log_id: string;
          achieved_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          exercise_id: string;
          weight_kg: number;
          reps: number;
          set_log_id: string;
          achieved_at?: string;
        };
        Update: {
          weight_kg?: number;
          reps?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: "coach" | "client";
    };
    CompositeTypes: Record<string, never>;
  };
};
