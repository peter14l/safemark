import * as SecureStore from "expo-secure-store";

const HISTORY_KEY = "safemark_calc_history";
const MAX_HISTORY = 10;

export interface CalcEntry {
  expression: string;
  result: string;
  timestamp: number;
}

export async function getCalcHistory(): Promise<CalcEntry[]> {
  const raw = await SecureStore.getItemAsync(HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function addCalcEntry(expression: string, result: string): Promise<void> {
  const history = await getCalcHistory();
  history.unshift({
    expression,
    result,
    timestamp: Date.now(),
  });
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  await SecureStore.setItemAsync(HISTORY_KEY, JSON.stringify(history));
}

export async function clearCalcHistory(): Promise<void> {
  await SecureStore.deleteItemAsync(HISTORY_KEY);
}
