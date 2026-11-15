import { useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  FileImage,
  MinusCircle,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import type { Transaction, TransactionType } from '../types/finance';
import { formatBRL, formatDateBR, TYPE_LABELS } from '../utils/format';

interface TransactionTableProps {
  transactions: Transaction[];
  loading: boolean;
  title: string;
  subtitle: string;
  emptyActionLabel: string;
  onCreateNew: () => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => Promise<void>;
  onPreviewReceipt: (tx: Transaction) => void;
}

function TypeIndicator({ type }: { type: TransactionType }) {
  if (type === 'sale') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803D]">
        <ArrowUpRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        Venda
      </span>
    );
  }
  if (type === 'deduction') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B45309]">
        <MinusCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        Desconto
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#DC2626]">
      <ArrowDownRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      Despesa
    </span>
  );
}

export function TransactionTable({
  transactions,
  loading,
  title,
  subtitle,
  emptyActionLabel,
  onCreateNew,
  onEdit,
  onDelete,
  onPreviewReceipt,
}: TransactionTableProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleConfirmDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#022659]">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="text-xs text-slate-500 font-mono tabular-nums">
          {transactions.length} {transactions.length === 1 ? 'registro' : 'registros'}
        </div>
      </div>

      {loading ? (
        <div className="p-5 space-y-3">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="h-10 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="py-14 px-6 text-center">
          <p className="text-sm font-medium text-[#111111]">
            Nenhum lançamento encontrado para os filtros atuais.
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Você pode cadastrar manualmente ou subir a foto de um comprovante para registrar vendas, pagamentos de tutores e despesas.
          </p>
          <button
            type="button"
            onClick={onCreateNew}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FFAA00] hover:bg-[#E59900] text-[#111111] text-xs font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            {emptyActionLabel}
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-[#F4F6FA] text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-4 whitespace-nowrap">Data</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Tipo / Produto</th>
                <th className="py-2.5 px-4">Descrição &amp; Contraparte</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Categoria &amp; Meio</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Comprovante</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Valor</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {transactions.map((tx) => {
                const isConfirming = confirmDeleteId === tx.id;
                const isDeleting = deletingId === tx.id;

                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-[#F4F6FA]/70 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap align-top">
                      {formatDateBR(tx.date)}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap align-top">
                      <TypeIndicator type={tx.type} />
                      <div className="text-xs text-slate-500 mt-0.5">{tx.product}</div>
                    </td>

                    <td className="py-3 px-4 align-top min-w-[220px]">
                      <div className="font-medium text-[#111111] leading-snug">
                        {tx.description}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {tx.counterparty}
                        {tx.notes ? ` · ${tx.notes}` : ''}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap align-top">
                      <div className="text-xs font-medium text-slate-700">{tx.category}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{tx.paymentMethod}</div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap align-top">
                      {tx.receiptUrl ? (
                        <button
                          type="button"
                          onClick={() => onPreviewReceipt(tx)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2365C4] hover:text-[#022659] hover:underline"
                        >
                          <FileImage className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          Ver imagem
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {tx.entryMethod === 'receipt' ? 'Comprovante' : 'Manual'}
                        </span>
                      )}
                    </td>

                    <td
                      className={`py-3 px-4 text-right font-mono text-sm font-semibold tabular-nums whitespace-nowrap align-top ${
                        tx.type === 'sale'
                          ? 'text-[#15803D]'
                          : tx.type === 'deduction'
                          ? 'text-[#B45309]'
                          : 'text-[#DC2626]'
                      }`}
                    >
                      {tx.type === 'sale' ? '+' : '-'} {formatBRL(tx.amount)}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap align-top">
                      {isConfirming ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => handleConfirmDelete(tx.id)}
                            className="text-xs font-semibold text-[#DC2626] hover:underline disabled:opacity-50"
                          >
                            {isDeleting ? 'Excluindo...' : 'Confirmar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs text-slate-500 hover:text-slate-800"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEdit(tx)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-[#022659] hover:bg-slate-100 transition-colors"
                            aria-label={`Editar ${TYPE_LABELS[tx.type]}: ${tx.description}`}
                            title="Editar lançamento"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(tx.id)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-[#DC2626] hover:bg-red-50 transition-colors"
                            aria-label={`Excluir ${TYPE_LABELS[tx.type]}: ${tx.description}`}
                            title="Excluir lançamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
