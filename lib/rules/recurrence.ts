import { addMonths, setDate, format } from "date-fns";

export type RecurrenceInput = {
  contractId: string;
  startDate: Date;
  minMonths: number;
  billingDay: number;
  monthlyValue: number;
};

export type GeneratedCharge = {
  contract_id: string;
  description: string;
  kind: 'recorrencia';
  amount: number;
  due_date: string; // ISO yyyy-MM-dd
};

/**
 * Gera `minMonths` parcelas a partir da `startDate`, vencendo sempre no `billingDay`.
 */
export function generateRecurrences({
  contractId,
  startDate,
  minMonths,
  billingDay,
  monthlyValue
}: RecurrenceInput): GeneratedCharge[] {
  const charges: GeneratedCharge[] = [];

  // Começamos o laço para cada parcela
  for (let i = 0; i < minMonths; i++) {
    // Adiciona "i" meses à data base
    const monthDate = addMonths(startDate, i);
    
    // Seta o dia de vencimento, limitando caso o mês tenha menos dias que billingDay
    // Mas billingDay é limitado a 28 no schema, então nunca haverá overflow em fevereiro.
    const dueDate = setDate(monthDate, billingDay);

    charges.push({
      contract_id: contractId,
      description: `Parcela ${i + 1}/${minMonths}`,
      kind: 'recorrencia',
      amount: monthlyValue,
      due_date: format(dueDate, "yyyy-MM-dd")
    });
  }

  return charges;
}
