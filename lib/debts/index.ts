import type {
  EventParticipant,
  Expense,
  ExpenseShare,
  Settlement,
} from "@/types/database";

// Saldos y simplificación de deudas (spec 5.7).
// Convención: balance > 0 → le deben (pagó de más); balance < 0 → debe.

export interface Transfer {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Balance neto por usuario a partir de gastos, divisiones y pagos realizados.
 * Los shares están ligados a participant_id; se mapean a user_id.
 */
export function computeBalances(
  participants: Pick<EventParticipant, "id" | "user_id">[],
  expenses: Pick<Expense, "id" | "paid_by" | "amount">[],
  shares: ExpenseShare[],
  settlements: Pick<Settlement, "from_user_id" | "to_user_id" | "amount">[]
): Map<string, number> {
  const participantToUser = new Map(participants.map((p) => [p.id, p.user_id]));
  const balances = new Map<string, number>();
  const add = (userId: string, delta: number) =>
    balances.set(userId, (balances.get(userId) ?? 0) + delta);

  for (const expense of expenses) {
    add(expense.paid_by, expense.amount);
  }

  for (const share of shares) {
    const userId = participantToUser.get(share.participant_id);
    if (userId) add(userId, -share.share_amount);
  }

  // Un settlement de A → B salda deuda: A mejora su balance, B lo reduce.
  for (const s of settlements) {
    add(s.from_user_id, s.amount);
    add(s.to_user_id, -s.amount);
  }

  for (const [userId, balance] of balances) {
    balances.set(userId, round2(balance));
  }

  return balances;
}

/**
 * Minimiza la cantidad de transferencias para saldar los balances
 * (greedy tipo Splitwise: empareja el mayor deudor con el mayor acreedor).
 * Garantiza como máximo N-1 transferencias.
 */
export function simplifyDebts(balances: Map<string, number>): Transfer[] {
  const debtors: { userId: string; amount: number }[] = [];
  const creditors: { userId: string; amount: number }[] = [];

  for (const [userId, balance] of balances) {
    if (balance < -0.01) debtors.push({ userId, amount: -balance });
    else if (balance > 0.01) creditors.push({ userId, amount: balance });
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = round2(Math.min(debtor.amount, creditor.amount));

    if (amount > 0.01) {
      transfers.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amount,
      });
    }

    debtor.amount = round2(debtor.amount - amount);
    creditor.amount = round2(creditor.amount - amount);

    if (debtor.amount <= 0.01) i++;
    if (creditor.amount <= 0.01) j++;
  }

  return transfers;
}

/**
 * División equitativa con ajuste de redondeo: los centavos sobrantes
 * se reparten de a uno entre los primeros participantes.
 */
export function splitEqual(
  amount: number,
  participantIds: string[]
): Map<string, number> {
  const result = new Map<string, number>();
  const n = participantIds.length;
  if (n === 0) return result;

  const cents = Math.round(amount * 100);
  const base = Math.floor(cents / n);
  let remainder = cents - base * n;

  for (const id of participantIds) {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    result.set(id, (base + extra) / 100);
  }

  return result;
}
