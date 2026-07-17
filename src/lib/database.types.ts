export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          emoji: string | null
          done: boolean
          scheduled_at: string | null
          description: string | null
          completed_at: string | null
          deleted_at: string | null
          estimated_minutes: number | null
          actual_minutes: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          title: string
          emoji?: string | null
          done?: boolean
          scheduled_at?: string | null
          description?: string | null
          completed_at?: string | null
          deleted_at?: string | null
          estimated_minutes?: number | null
          actual_minutes?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          emoji?: string | null
          done?: boolean
          scheduled_at?: string | null
          description?: string | null
          completed_at?: string | null
          deleted_at?: string | null
          estimated_minutes?: number | null
          actual_minutes?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          id: string
          user_id: string
          slug: string
          title: string
          emoji: string
          time_period_label: string
          start_date: string
          end_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          slug: string
          title: string
          emoji?: string
          time_period_label?: string
          start_date: string
          end_date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          slug?: string
          title?: string
          emoji?: string
          time_period_label?: string
          start_date?: string
          end_date?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      goal_metrics: {
        Row: {
          id: string
          user_id: string
          goal_id: string
          name: string
          unit: string | null
          start_value: number
          target_value: number
          current_value: number
          aggregation: string
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          goal_id: string
          name: string
          unit?: string | null
          start_value?: number
          target_value?: number
          current_value?: number
          aggregation?: string
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          goal_id?: string
          name?: string
          unit?: string | null
          start_value?: number
          target_value?: number
          current_value?: number
          aggregation?: string
          position?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      attempts: {
        Row: {
          id: string
          user_id: string
          goal_id: string
          title: string
          icon: string | null
          kind: string
          description: string | null
          status: string
          started_at: string | null
          deadline: string | null
          completed_at: string | null
          retro_happened: string | null
          retro_learned: string | null
          retro_future_note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          goal_id: string
          title: string
          icon?: string | null
          kind?: string
          description?: string | null
          status?: string
          started_at?: string | null
          deadline?: string | null
          completed_at?: string | null
          retro_happened?: string | null
          retro_learned?: string | null
          retro_future_note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          goal_id?: string
          title?: string
          icon?: string | null
          kind?: string
          description?: string | null
          status?: string
          started_at?: string | null
          deadline?: string | null
          completed_at?: string | null
          retro_happened?: string | null
          retro_learned?: string | null
          retro_future_note?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      attempt_tasks: {
        Row: {
          id: string
          user_id: string
          attempt_id: string
          title: string
          done: boolean
          scheduled_at: string | null
          description: string | null
          completed_at: string | null
          deleted_at: string | null
          estimated_minutes: number | null
          actual_minutes: number | null
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          attempt_id: string
          title: string
          done?: boolean
          scheduled_at?: string | null
          description?: string | null
          completed_at?: string | null
          deleted_at?: string | null
          estimated_minutes?: number | null
          actual_minutes?: number | null
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          attempt_id?: string
          title?: string
          done?: boolean
          scheduled_at?: string | null
          description?: string | null
          completed_at?: string | null
          deleted_at?: string | null
          estimated_minutes?: number | null
          actual_minutes?: number | null
          position?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      attempt_predictions: {
        Row: {
          id: string
          user_id: string
          attempt_id: string
          metric_id: string
          worst: number
          acceptable: number
          best: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          attempt_id: string
          metric_id: string
          worst: number
          acceptable: number
          best: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          attempt_id?: string
          metric_id?: string
          worst?: number
          acceptable?: number
          best?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      attempt_results: {
        Row: {
          id: string
          user_id: string
          attempt_id: string
          metric_id: string
          value: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          attempt_id: string
          metric_id: string
          value: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          attempt_id?: string
          metric_id?: string
          value?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]
