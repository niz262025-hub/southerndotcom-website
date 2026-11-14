// Request validation only; payment amounts and eligible products are rechecked in SQL.
export const MONTHLY_PLANS = Object.freeze({single_monthly:1990,duo_monthly:2990,complete_monthly:3990});
export const MONTHLY_APPS = Object.freeze(['opsfinance','opsflow','opsp']);
export function monthlySelection(plan, products) {
  if (!Object.hasOwn(MONTHLY_PLANS,plan)) return null;
  if (!Array.isArray(products) || products.some(p=>typeof p!=='string'||!MONTHLY_APPS.includes(p)) || new Set(products).size!==products.length) return null;
  const count={single_monthly:1,duo_monthly:2,complete_monthly:3}[plan];
  if(products.length!==count) return null;
  return [...products].sort();
}
