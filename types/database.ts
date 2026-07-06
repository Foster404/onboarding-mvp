export type UserRole = "employee" | "admin";
export type EmployeeStatus = "working" | "vacation" | "maternity_leave" | "resigned";
export type MediaType = "video" | "presentation";

// NOTE: these must stay `type` aliases, not `interface` declarations - with
// interfaces, the Supabase client's generic type inference for embedded
// selects (e.g. `stages(*, checklist_items(*))`) silently resolves to
// `never` instead of the real row type.

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
  role: UserRole;
  status: EmployeeStatus;
  birthdate: string | null;
  photo_url: string | null;
  phone: string | null;
  vacation_days_remaining: number;
  onboarding_start_date: string;
  probation_end_date: string;
  created_at: string;
};

export type Stage = {
  id: string;
  key: string;
  title: string;
  sort_order: number;
  created_at: string;
};

export type ChecklistItem = {
  id: string;
  stage_id: string;
  title: string;
  sort_order: number;
  created_at: string;
};

export type StageMedia = {
  id: string;
  stage_id: string;
  type: MediaType;
  title: string;
  url: string;
  created_at: string;
};

export type EmployeeProgress = {
  id: string;
  profile_id: string;
  checklist_item_id: string;
  completed: boolean;
  completed_at: string | null;
};

export type ColleagueDirectoryRow = {
  id: string;
  full_name: string;
  department: string | null;
  status: EmployeeStatus;
  phone: string | null;
  email: string;
  birthdate: string | null;
  photo_url: string | null;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; full_name: string; email: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      stages: {
        Row: Stage;
        Insert: Partial<Stage> & { key: string; title: string; sort_order: number };
        Update: Partial<Stage>;
        Relationships: [];
      };
      checklist_items: {
        Row: ChecklistItem;
        Insert: Partial<ChecklistItem> & { stage_id: string; title: string; sort_order: number };
        Update: Partial<ChecklistItem>;
        Relationships: [
          {
            foreignKeyName: "checklist_items_stage_id_fkey";
            columns: ["stage_id"];
            isOneToOne: false;
            referencedRelation: "stages";
            referencedColumns: ["id"];
          },
        ];
      };
      stage_media: {
        Row: StageMedia;
        Insert: Partial<StageMedia> & { stage_id: string; type: MediaType; title: string; url: string };
        Update: Partial<StageMedia>;
        Relationships: [
          {
            foreignKeyName: "stage_media_stage_id_fkey";
            columns: ["stage_id"];
            isOneToOne: false;
            referencedRelation: "stages";
            referencedColumns: ["id"];
          },
        ];
      };
      employee_progress: {
        Row: EmployeeProgress;
        Insert: Partial<EmployeeProgress> & { profile_id: string; checklist_item_id: string };
        Update: Partial<EmployeeProgress>;
        Relationships: [
          {
            foreignKeyName: "employee_progress_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employee_progress_checklist_item_id_fkey";
            columns: ["checklist_item_id"];
            isOneToOne: false;
            referencedRelation: "checklist_items";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      colleague_directory: {
        Row: ColleagueDirectoryRow;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
  };
};
