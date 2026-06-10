import type {
  EventItem,
  EventParticipant,
  EventRow,
  Expense,
  ExpenseShare,
  ItemAssignment,
  ParticipantEaterType,
  Profile,
  Settlement,
} from "@/types/database";
import type { Transfer } from "@/lib/debts";

/** Traductor del namespace "excel" — se pasa desde el componente. */
export type ExcelT = (key: string) => string;

export interface EventExportData {
  event: EventRow;
  eventTypeName: string | null;
  hostName: string;
  participants: (EventParticipant & { profile: Profile })[];
  items: (EventItem & { assignments: (ItemAssignment & { userName: string })[] })[];
  expenses: (Expense & {
    paidByName: string;
    shares: (ExpenseShare & { userName: string })[];
  })[];
  balances: Map<string, number>;
  transfers: Transfer[];
  settlements: (Settlement & { fromName: string; toName: string })[];
  userNames: Map<string, string>;
}

export interface ImportedParticipant {
  name: string;
  email: string;
  eaterType: ParticipantEaterType;
  guestCount: number;
}

export interface ImportedItem {
  name: string;
  unit: string;
  quantity: number;
  category: string;
}

export interface ImportResult {
  participants: ImportedParticipant[];
  items: ImportedItem[];
  errors: { sheet: string; row: number; message: string }[];
}
