export function promoEmailHtml(data: any) {
  return `<p>Promo code: ${data?.code || "SPECIAL"}</p>`;
}
