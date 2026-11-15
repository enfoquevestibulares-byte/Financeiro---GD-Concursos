import type { Transaction, TransactionType } from '../types/finance';

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatBRL(value: number): string {
  return brlFormatter.format(value);
}

export function formatDateBR(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function formatMonthLabel(yyyyMm: string): string {
  const [year, month] = yyyyMm.split('-');
  const idx = Number(month) - 1;
  if (!year || idx < 0 || idx > 11) return yyyyMm;
  return `${MONTH_NAMES[idx]}/${year.slice(2)}`;
}

export const TYPE_LABELS: Record<TransactionType, string> = {
  sale: 'Venda',
  deduction: 'Desconto / Repasse',
  expense: 'Despesa',
};

export function exportTransactionsCsv(items: Transaction[]): void {
  const headers = [
    'Data',
    'Tipo',
    'Produto',
    'Categoria',
    'Descricao',
    'Aluno_Tutor_Fornecedor',
    'Meio_Pagamento',
    'Modo_Insercao',
    'Valor_BRL',
    'Observacoes',
  ];

  const escape = (val: string | number | undefined) => {
    const str = String(val ?? '').replaceAll('"', '""');
    return `"${str}"`;
  };

  const rows = items.map((t) => [
    escape(formatDateBR(t.date)),
    escape(TYPE_LABELS[t.type]),
    escape(t.product),
    escape(t.category),
    escape(t.description),
    escape(t.counterparty),
    escape(t.paymentMethod),
    escape(t.entryMethod === 'receipt' ? 'Comprovante' : 'Manual'),
    escape(t.amount.toFixed(2).replace('.', ',')),
    escape(t.notes ?? ''),
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `gustavo-dias-concursos-financeiro-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
