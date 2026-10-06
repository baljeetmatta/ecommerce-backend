export const fundingRules = (settings, role) => ({
  minimum: settings?.walletFunding?.[role]?.minimum ?? 100,
  increment: settings?.walletFunding?.[role]?.increment ?? 50,
  maximum: 1000000
});
export const validFundingAmount = (amount, rules) => Number.isSafeInteger(amount) && amount >= rules.minimum && amount <= rules.maximum && (amount - rules.minimum) % rules.increment === 0;
