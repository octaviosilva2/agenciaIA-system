export function calculateNetRevenue(grossAmount: number, taxRatePercentage: number): number {
  if (taxRatePercentage < 0 || taxRatePercentage > 100) {
    throw new Error("Tax rate must be between 0 and 100");
  }
  const discount = grossAmount * (taxRatePercentage / 100);
  return grossAmount - discount;
}

export function calculateTotalNetRevenue(grossAmounts: number[], taxRatePercentage: number): number {
  const totalGross = grossAmounts.reduce((acc, curr) => acc + curr, 0);
  return calculateNetRevenue(totalGross, taxRatePercentage);
}
