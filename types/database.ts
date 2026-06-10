// Tipos de la base de datos (espejo de /supabase/migrations).
// Si el esquema cambia, regenerar con:
//   npx supabase gen types typescript --local > types/database.ts
// (requiere stack local corriendo) o mantener a mano.

export type EaterTypeDefault = "low" | "normal" | "high";
export type ParticipantEaterType =
  | "low"
  | "normal"
  | "high"
  | "vegetarian"
  | "child";
export type EventStatus = "draft" | "active" | "cancelled" | "archived";
export type RsvpStatus = "pending" | "yes" | "no" | "maybe";
export type SplitMode = "equal" | "custom";

export type DietaryRestrictions = {
  vegetarian?: boolean;
  celiac?: boolean;
  notes?: string;
}

export type GuestBreakdownEntry = {
  eater_type: ParticipantEaterType;
  dietary?: string;
}

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  default_eater_type: EaterTypeDefault;
  dietary_restrictions: DietaryRestrictions;
  locale: string;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
}

export type EventType = {
  id: string;
  name: string;
  icon: string | null;
  is_global: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type EventTypePreset = {
  id: string;
  event_type_id: string;
  item_name: string;
  unit: string;
  qty_per_adult_low: number;
  qty_per_adult_normal: number;
  qty_per_adult_high: number;
  qty_per_child: number;
  is_vegetarian_safe: boolean;
  category: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type EventRow = {
  id: string;
  title: string;
  description: string | null;
  event_type_id: string | null;
  host_id: string;
  event_date: string;
  event_time: string | null;
  location_text: string | null;
  currency: string;
  status: EventStatus;
  rsvp_deadline: string | null;
  share_token: string;
  created_at: string;
  updated_at: string;
}

export type EventCoOrganizer = {
  event_id: string;
  user_id: string;
  created_at: string;
}

export type EventParticipant = {
  id: string;
  event_id: string;
  user_id: string;
  rsvp_status: RsvpStatus;
  eater_type: ParticipantEaterType;
  guest_count: number;
  guest_breakdown: GuestBreakdownEntry[];
  notes: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export type EventItem = {
  id: string;
  event_id: string;
  item_name: string;
  unit: string;
  quantity_needed: number;
  category: string;
  notes: string | null;
  sort_order: number;
  auto_calculated: boolean;
  qty_per_adult_low: number | null;
  qty_per_adult_normal: number | null;
  qty_per_adult_high: number | null;
  qty_per_child: number | null;
  is_vegetarian_safe: boolean;
  created_at: string;
  updated_at: string;
}

export type ItemAssignment = {
  id: string;
  item_id: string;
  participant_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export type Expense = {
  id: string;
  event_id: string;
  paid_by: string;
  created_by: string;
  amount: number;
  currency: string;
  description: string;
  item_id: string | null;
  split_mode: SplitMode;
  created_at: string;
  updated_at: string;
}

export type ExpenseShare = {
  expense_id: string;
  participant_id: string;
  share_amount: number;
}

export type Settlement = {
  id: string;
  event_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  currency: string;
  note: string | null;
  settled_at: string;
  created_at: string;
}

export type PublicEventPreview = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  location_text: string | null;
  currency: string;
  status: EventStatus;
  rsvp_deadline: string | null;
  event_type_name: string | null;
  event_type_icon: string | null;
  host_name: string;
  confirmed_count: number;
  is_participant: boolean;
}

type TableDef<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<
        Profile,
        Partial<Profile> & Pick<Profile, "id" | "display_name">,
        Partial<Profile>
      >;
      event_types: TableDef<
        EventType,
        Partial<EventType> & Pick<EventType, "name">,
        Partial<EventType>
      >;
      event_type_presets: TableDef<
        EventTypePreset,
        Partial<EventTypePreset> &
          Pick<
            EventTypePreset,
            | "event_type_id"
            | "item_name"
            | "unit"
            | "qty_per_adult_low"
            | "qty_per_adult_normal"
            | "qty_per_adult_high"
            | "category"
          >,
        Partial<EventTypePreset>
      >;
      events: TableDef<
        EventRow,
        Partial<EventRow> & Pick<EventRow, "title" | "host_id" | "event_date">,
        Partial<EventRow>
      >;
      event_co_organizers: TableDef<
        EventCoOrganizer,
        Pick<EventCoOrganizer, "event_id" | "user_id">,
        Partial<EventCoOrganizer>
      >;
      event_participants: TableDef<
        EventParticipant,
        Partial<EventParticipant> &
          Pick<EventParticipant, "event_id" | "user_id" | "eater_type">,
        Partial<EventParticipant>
      >;
      event_items: TableDef<
        EventItem,
        Partial<EventItem> &
          Pick<EventItem, "event_id" | "item_name" | "unit" | "category">,
        Partial<EventItem>
      >;
      item_assignments: TableDef<
        ItemAssignment,
        Pick<ItemAssignment, "item_id" | "participant_id" | "quantity">,
        Partial<ItemAssignment>
      >;
      expenses: TableDef<
        Expense,
        Partial<Expense> &
          Pick<
            Expense,
            "event_id" | "paid_by" | "amount" | "currency" | "description"
          >,
        Partial<Expense>
      >;
      expense_shares: TableDef<
        ExpenseShare,
        ExpenseShare,
        Partial<ExpenseShare>
      >;
      settlements: TableDef<
        Settlement,
        Partial<Settlement> &
          Pick<
            Settlement,
            "event_id" | "from_user_id" | "to_user_id" | "amount" | "currency"
          >,
        Partial<Settlement>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      get_public_event: {
        Args: { p_share_token: string };
        Returns: PublicEventPreview | null;
      };
      rsvp_via_token: {
        Args: {
          p_share_token: string;
          p_rsvp_status: RsvpStatus;
          p_eater_type: ParticipantEaterType;
          p_guest_count?: number;
          p_guest_breakdown?: GuestBreakdownEntry[];
          p_notes?: string | null;
        };
        Returns: string;
      };
      recalc_event_quantities: {
        Args: { p_event_id: string };
        Returns: undefined;
      };
      find_profile_by_email: {
        Args: { p_email: string };
        Returns: string | null;
      };
    };
    Enums: {
      eater_type_default: EaterTypeDefault;
      participant_eater_type: ParticipantEaterType;
      event_status: EventStatus;
      rsvp_status: RsvpStatus;
      split_mode: SplitMode;
    };
    CompositeTypes: Record<string, never>;
  };
};
