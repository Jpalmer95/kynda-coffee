// Clean stub - full credit system will be added after launch
export type UserCreditInfo = { free: number; paid: number; yearMonth: string };

export async function getUserCredits(): Promise<UserCreditInfo> {
  return { free: 10, paid: 0, yearMonth: '2026-05' };
}

export async function deductOneCredit() {
  return { success: true, remaining: 9 };
}
