import { ArrowDownRight, ArrowUpRight, MinusCircle, Wallet } from 'lucide-react';
import type { Transaction } from '../types/finance';
import { formatBRL } from '../utils/format';

interface KpiStripProps {
  transactions: Transaction[];
  loading: boolean;
}

export function KpiStrip({ transactions, loading }: KpiStripProps) {
  const sales = transactions.filter((t) => t.type === 'sale');
  const deductions = transactions.filter((t) => t.type === 'deduction');
  const expenses = transactions.filter((t) => t.type === 'expense');

  const totalSales = sales.reduce((acc, t) => acc + t.amount, 0);
  const totalDeductions = deductions.reduce((acc, t) => acc + t.amount, 0);
  const totalExpenses = expenses.reduce((acc, t) => acc + t.amount, 0);
  const netResult = totalSales - totalDeductions - totalExpenses;
  const marginPct = totalSales > 0 ? (netResult / totalSales) * 100 : 0;
  const deductionPct = totalSales > 0 ? (totalDeductions / totalSales) * 100 : 0;

  if (loading) {
    return (
      <section aria-label="Resumo financeiro" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((idx) => (
          <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
            <div className="h-3.5 w-28 bg-slate-200 rounded" />
            <div className="mt-3 h-7 w-36 bg-slate-200 rounded" />
            <div className="mt-2 h-3 w-24 bg-slate-100 rounded" />
          </div>
        ))}
      </section>
    );
  }

  return (
    <section aria-label="Resumo financeiro" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span>Vendas da Mentoria</span>
          <ArrowUpRight className="w-4 h-4 text-[#15803D]" aria-hidden="true" />
        </div>
        <div className="mt-2.5 text-2xl font-semibold text-[#111111] font-mono tabular-nums tracking-tight">
          {formatBRL(totalSales)}
        </div>
        <div className="mt-1.5 text-xs text-slate-500 tabular-nums">
          {sales.length} {sales.length === 1 ? 'venda registrada' : 'vendas registradas'}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span>Descontos &amp; Repasses</span>
          <MinusCircle className="w-4 h-4 text-[#B45309]" aria-hidden="true" />
        </div>
        <div className="mt-2.5 text-2xl font-semibold text-[#111111] font-mono tabular-nums tracking-tight">
          {formatBRL(totalDeductions)}
        </div>
        <div className="mt-1.5 text-xs text-slate-500 tabular-nums">
          {deductions.length} {deductions.length === 1 ? 'lançamento' : 'lançamentos'} · {deductionPct.toFixed(1)}% da receita
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span>Despesas Operacionais</span>
          <ArrowDownRight className="w-4 h-4 text-[#DC2626]" aria-hidden="true" />
        </div>
        <div className="mt-2.5 text-2xl font-semibold text-[#111111] font-mono tabular-nums tracking-tight">
          {formatBRL(totalExpenses)}
        </div>
        <div className="mt-1.5 text-xs text-slate-500 tabular-nums">
          {expenses.length} {expenses.length === 1 ? 'despesa lançada' : 'despesas lançadas'}
        </div>
      </div>

      <div className="bg-[#022659] border border-[#033584] rounded-xl p-5 text-white">
        <div className="flex items-center justify-between text-xs font-medium text-white/75">
          <span>Resultado Líquido</span>
          <Wallet className="w-4 h-4 text-[#FFAA00]" aria-hidden="true" />
        </div>
        <div
          className={`mt-2.5 text-2xl font-semibold font-mono tabular-nums tracking-tight ${
            netResult >= 0 ? 'text-white' : 'text-[#FFAA00]'
          }`}
        >
          {formatBRL(netResult)}
        </div>
        <div className="mt-1.5 text-xs text-white/75 tabular-nums">
          Margem líquida de <span className="font-semibold text-[#FFAA00]">{marginPct.toFixed(1)}%</span>
        </div>
      </div>
    </section>
  );
}
