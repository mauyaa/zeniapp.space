let lastStaleRun: Date | null = null;
let lastReceiptScan: Date | null = null;

export function recordStaleRun() {
  lastStaleRun = new Date();
}

export function recordReceiptScan() {
  lastReceiptScan = new Date();
}

export function getPayInsightsMeta() {
  return { lastStaleRun, lastReceiptScan };
}
