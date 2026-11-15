import { useState } from 'react';
import { MENTORSHIP_PRODUCTS, type Transaction } from '../types/finance';
import { formatBRL, formatMonthLabel } from '../utils/format';

interface CashflowChartsProps {
  transactions: Transaction[];
}

interface MonthlyBucket {
  month: string;
  sales: number;
  deductions: number;
  expenses: number;
}

export function CashflowCharts({ transactions }: CashflowChartsProps) {
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  const monthMap = new Map<string, MonthlyBucket>();
  for (const t of transactions) {
    const key = t.date.slice(0, 7);
    const current = monthMap.get(key) ?? { month: key, sales: 0, deductions: 0, expenses: 0 };
    if (t.type === 'sale') current.sales += t.amount;
    if (t.type === 'deduction') current.deductions += t.amount;
    if (t.type === 'expense') current.expenses += t.amount;
    monthMap.set(key, current);
  }

  const buckets = Array.from(monthMap.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6);

  const maxVal = Math.max(
    1000,
    ...buckets.flatMap((b) => [b.sales, b.deductions, b.expenses]),
  );

  const activeBucket = buckets.find((b) => b.month === hoveredMonth) ?? buckets[buckets.length - 1];

  // Product sales breakdown
  const productTotals = MENTORSHIP_PRODUCTS.map((product) => {
    const salesSum = transactions
      .filter((t) => t.type === 'sale' && t.product === product)
      .reduce((acc, t) => acc + t.amount, 0);
    const deductionsSum = transactions
      .filter((t) => t.type === 'deduction' && t.product === product)
      .reduce((acc, t) => acc + t.amount, 0);
    return { product, salesSum, deductionsSum };
  }).filter((p) => p.salesSum > 0 || p.deductionsSum > 0);

  const maxProductSale = Math.max(1, ...productTotals.map((p) => p.salesSum));

  return (
    <section aria-label="Análise gráfica" className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Monthly Cashflow */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#022659]">
              Fluxo Mensal da Mentoria
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparativo entre vendas brutas, repasses e despesas operacionais
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#033584]" aria-hidden="true" />
              Vendas
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#FFAA00]" aria-hidden="true" />
              Descontos
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#2365C4]" aria-hidden="true" />
              Despesas
            </span>
          </div>
        </div>

        {buckets.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Nenhum lançamento disponível no período selecionado.
          </div>
        ) : (
          <>
            <div className="mt-6 h-52 flex items-end gap-3 sm:gap-5 px-2 border-b border-slate-200 pb-2">
              {buckets.map((b) => {
                const salesH = Math.max(4, Math.round((b.sales / maxVal) * 176));
                const dedH = Math.max(4, Math.round((b.deductions / maxVal) * 176));
                const expH = Math.max(4, Math.round((b.expenses / maxVal) * 176));
                const isSelected = activeBucket?.month === b.month;

                return (
                  <button
                    key={b.month}
                    type="button"
                    onMouseEnter={() => setHoveredMonth(b.month)}
                    onFocus={() => setHoveredMonth(b.month)}
                    onClick={() => setHoveredMonth(b.month)}
                    className={`flex-1 flex flex-col items-center gap-2 rounded-lg px-1.5 pt-2 pb-1 transition-colors ${
                      isSelected ? 'bg-[#F4F6FA]' : 'hover:bg-slate-50'
                    }`}
                    aria-label={`Mês ${formatMonthLabel(b.month)}: vendas ${formatBRL(b.sales)}`}
                  >
                    <div className="h-44 flex items-end justify-center gap-1 sm:gap-1.5 w-full">
                      <div
                        className="w-3 sm:w-4 bg-[#033584] rounded-t-sm transition-all"
                        style={{ height: `${b.sales > 0 ? salesH : 2}px`, opacity: b.sales > 0 ? 1 : 0.2 }}
                        title={`Vendas: ${formatBRL(b.sales)}`}
                      />
                      <div
                        className="w-3 sm:w-4 bg-[#FFAA00] rounded-t-sm transition-all"
                        style={{ height: `${b.deductions > 0 ? dedH : 2}px`, opacity: b.deductions > 0 ? 1 : 0.2 }}
                        title={`Descontos: ${formatBRL(b.deductions)}`}
                      />
                      <div
                        className="w-3 sm:w-4 bg-[#2365C4] rounded-t-sm transition-all"
                        style={{ height: `${b.expenses > 0 ? expH : 2}px`, opacity: b.expenses > 0 ? 1 : 0.2 }}
                        title={`Despesas: ${formatBRL(b.expenses)}`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center gap-3 sm:gap-5 px-2">
              {buckets.map((b) => (
                <div
                  key={b.month}
                  className={`flex-1 text-center text-xs font-mono tabular-nums ${
                    activeBucket?.month === b.month ? 'font-semibold text-[#022659]' : 'text-slate-500'
                  }`}
                >
                  {formatMonthLabel(b.month)}
                </div>
              ))}
            </div>

            {activeBucket && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-[#022659]">
                  Detalhe — {formatMonthLabel(activeBucket.month)}
                </span>
                <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums">
                  <span className="text-[#033584]">
                    Vendas: <strong>{formatBRL(activeBucket.sales)}</strong>
                  </span>
                  <span className="text-[#B45309]">
                    Descontos: <strong>{formatBRL(activeBucket.deductions)}</strong>
                  </span>
                  <span className="text-[#2365C4]">
                    Despesas: <strong>{formatBRL(activeBucket.expenses)}</strong>
                  </span>
                  <span className="text-[#111111]">
                    Líquido: <strong>{formatBRL(activeBucket.sales - activeBucket.deductions - activeBucket.expenses)}</strong>
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Revenue by Mentorship Product */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#022659]">
            Desempenho por Mentoria
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Receita gerada e descontos vinculados a cada produto
          </p>
        </div>

        <div className="mt-5 space-y-4 flex-1">
          {productTotals.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Registre vendas ou repasses para visualizar o desempenho por produto.
            </div>
          ) : (
            productTotals.map(({ product, salesSum, deductionsSum }) => {
              const widthPct = Math.max(4, Math.round((salesSum / maxProductSale) * 100));
              return (
                <div key={product} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-medium text-[#111111] truncate">{product}</span>
                    <span className="font-mono tabular-nums text-slate-700 shrink-0">
                      {formatBRL(salesSum)}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#2365C4] rounded-full transition-all"
                      style={{ width: `${salesSum > 0 ? widthPct : 0}%` }}
                    />
                  </div>
                  {deductionsSum > 0 && (
                    <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                      Descontos/repasse vinculados: {formatBRL(deductionsSum)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
