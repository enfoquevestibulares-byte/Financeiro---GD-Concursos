import { FileImage, Upload } from 'lucide-react';
import type { Transaction } from '../types/finance';
import { formatBRL, formatDateBR, TYPE_LABELS } from '../utils/format';

interface ReceiptsGalleryProps {
  transactions: Transaction[];
  onPreviewReceipt: (tx: Transaction) => void;
  onUploadNew: () => void;
}

export function ReceiptsGallery({
  transactions,
  onPreviewReceipt,
  onUploadNew,
}: ReceiptsGalleryProps) {
  const withReceipts = transactions.filter((t) => Boolean(t.receiptUrl));

  return (
    <section className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#022659]">
            Arquivo de Comprovantes e Recibos
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Todos os comprovantes de vendas, pagamentos de tutores e notas de despesas anexados
          </p>
        </div>
        <button
          type="button"
          onClick={onUploadNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FFAA00] hover:bg-[#E59900] text-[#111111] text-xs font-semibold transition-colors whitespace-nowrap"
        >
          <Upload className="w-4 h-4" />
          Subir Novo Comprovante
        </button>
      </div>

      {withReceipts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-16 px-6 text-center">
          <div className="w-12 h-12 rounded-full bg-[#F4F6FA] text-[#022659] flex items-center justify-center mx-auto mb-3">
            <FileImage className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-[#111111]">
            Nenhum comprovante em imagem anexado ainda
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Ao subir um recibo de venda, comprovante PIX de tutor ou nota fiscal de despesa, o arquivo fica salvo aqui para conferência rápida.
          </p>
          <button
            type="button"
            onClick={onUploadNew}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#033584] hover:bg-[#022659] text-white text-xs font-semibold transition-colors"
          >
            <Upload className="w-4 h-4" />
            Enviar Primeiro Comprovante
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {withReceipts.map((tx) => (
            <button
              key={tx.id}
              type="button"
              onClick={() => onPreviewReceipt(tx)}
              className="text-left bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-[#2365C4] transition-colors group"
            >
              <div className="h-44 bg-[#F4F6FA] border-b border-slate-200 flex items-center justify-center overflow-hidden p-2">
                <img
                  src={tx.receiptUrl}
                  alt={tx.description}
                  className="max-h-full max-w-full object-contain group-hover:scale-[1.02] transition-transform"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{TYPE_LABELS[tx.type]}</span>
                  <span className="font-mono tabular-nums">{formatDateBR(tx.date)}</span>
                </div>
                <div className="mt-1 text-sm font-semibold text-[#111111] truncate">
                  {tx.description}
                </div>
                <div className="mt-0.5 text-xs text-slate-500 truncate">{tx.counterparty}</div>
                <div className="mt-2.5 text-sm font-mono font-semibold text-[#022659] tabular-nums">
                  {formatBRL(tx.amount)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
