/**
 * O'nli kasrni vergul bilan formatlaydi: 4.7 → "4,7".
 * O'zbek va rus tillarida kasr ajratuvchisi — vergul. Intl ishlatilmaydi
 * (server va brauzer natijasi bir xil bo'lishi uchun, qarang: ADR-0010).
 */
export function formatDecimal(value: number, fractionDigits = 1): string {
  return value.toFixed(fractionDigits).replace(".", ",");
}
