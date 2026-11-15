import { FileImage, Pencil, X } from 'lucide-react';
import type { Transaction } from '../types/finance';
import { formatBRL, formatDateBR, TYPE_LABELS } from '../utils/format';

interface ReceiptPreviewModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onEdit: (tx: Transaction) => void;
}

export function ReceiptPreviewModal({
  transaction,
  onClose,
  onEdit,
}: ReceiptPreviewModalProps) {
  if (!transaction) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#022659]/70 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-preview-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 max-h-[88vh]">
        {/* Image Frame */}
        <div className="md:col-span-7 bg-[#022659] flex items-center justify-center p-4 min-h-[280px] max-h-[60vh] md:max-h-[88vh]">
          {transaction.receiptUrl ? (
            <img
              src={transaction.receiptUrl}
              alt={`Comprovante: ${transaction.description}`}
              className="max-w-full max-h-[75vh] object-contain rounded-lg"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="text-center text-white/75 p-6">
              <FileImage className="w-10 h-10 mx-auto mb-2 opacity-60" />
              <p className="text-sm">Imagem do comprovante indisponível.</p>
            </div>
          )}
        </div>

        {/* Metadata Column */}
        <div className="md:col-span-5 p-6 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-[#2365C4]">
                  {TYPE_LABELS[transaction.type]} · {transaction.product}
                </div>
                <h3
                  id="receipt-preview-title"
                  className="text-lg font-semibold text-[#111111] mt-1 leading-snug"
                >
                  {transaction.description}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-500 hover:text-[#111111] hover:bg-slate-100"
                aria-label="Fechar visualização"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-200 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Valor</span>
                <span className="font-mono font-semibold text-base text-[#022659] tabular-nums">
                  {formatBRL(transaction.amount)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Data</span>
                <span className="font-mono text-slate-800 tabular-nums">
                  {formatDateBR(transaction.date)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Contraparte</span>
                <span className="font-medium text-slate-800 text-right">
                  {transaction.counterparty}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Categoria</span>
                <span className="text-slate-800 text-right">{transaction.category}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Pagamento</span>
                <span className="text-slate-800 text-right">{transaction.paymentMethod}</span>
              </div>
              {transaction.notes && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-xs text-slate-500 mb-1">Observações</div>
                  <p className="text-xs text-slate-700 leading-relaxed">{transaction.notes}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(transaction);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#033584] hover:bg-[#022659] text-white text-xs font-semibold transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Editar Lançamento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
