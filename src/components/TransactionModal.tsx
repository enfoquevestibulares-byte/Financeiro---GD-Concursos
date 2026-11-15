import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import { FileImage, Loader2, PenLine, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import {
  CATEGORIES_BY_TYPE,
  MENTORSHIP_PRODUCTS,
  PAYMENT_METHODS,
  type EntryMethod,
  type ExtractedReceiptData,
  type MentorshipProduct,
  type Transaction,
  type TransactionPayload,
  type TransactionType,
} from '../types/finance';

interface TransactionModalProps {
  isOpen: boolean;
  initialType: TransactionType;
  initialEntryMethod?: EntryMethod;
  editingTransaction: Transaction | null;
  onClose: () => void;
  onSubmit: (payload: TransactionPayload, editingId?: string) => Promise<void>;
}

async function compressImageFile(file: File): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo de imagem.'));
    reader.readAsDataURL(file);
  });

  if (file.size <= 1_400_000) {
    return rawDataUrl;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 1600;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(rawDataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

function parseBrazilianAmount(raw: string): number {
  const cleaned = raw.replace(/[^\d.,]/g, '').trim();
  if (!cleaned) return NaN;
  // If contains comma as decimal separator (e.g. 1.290,50 or 1290,50)
  if (cleaned.includes(',')) {
    const normalized = cleaned.replaceAll('.', '').replace(',', '.');
    return Number(normalized);
  }
  return Number(cleaned);
}

const COUNTERPARTY_LABELS: Record<TransactionType, string> = {
  sale: 'Aluno / Comprador',
  deduction: 'Tutor / Beneficiário / Gráfica',
  expense: 'Fornecedor / Serviço',
};

const DESCRIPTION_PLACEHOLDERS: Record<TransactionType, string> = {
  sale: 'Ex.: Matrícula Mentoria Mapa — Turma Polícia Federal',
  deduction: 'Ex.: Pagamento semanal de tutoria ou impressão de apostilas',
  expense: 'Ex.: Campanha Meta Ads ou assinatura de software',
};

export function TransactionModal({
  isOpen,
  initialType,
  initialEntryMethod = 'manual',
  editingTransaction,
  onClose,
  onSubmit,
}: TransactionModalProps) {
  const [type, setType] = useState<TransactionType>(initialType);
  const [entryMethod, setEntryMethod] = useState<EntryMethod>(initialEntryMethod);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [amountInput, setAmountInput] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [counterparty, setCounterparty] = useState<string>('');
  const [product, setProduct] = useState<MentorshipProduct>('Mentoria Mapa');
  const [category, setCategory] = useState<string>(CATEGORIES_BY_TYPE[initialType][0]);
  const [paymentMethod, setPaymentMethod] = useState<string>('PIX');
  const [notes, setNotes] = useState<string>('');

  const [receiptDataUrl, setReceiptDataUrl] = useState<string | undefined>(undefined);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | undefined>(undefined);
  const [receiptName, setReceiptName] = useState<string | undefined>(undefined);
  const [removeReceipt, setRemoveReceipt] = useState<boolean>(false);

  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractionNote, setExtractionNote] = useState<string | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    setExtractionNote(null);
    setExtractionError(null);
    setIsExtracting(false);
    setSubmitting(false);

    if (editingTransaction) {
      setType(editingTransaction.type);
      setEntryMethod(editingTransaction.entryMethod);
      setDate(editingTransaction.date);
      setAmountInput(editingTransaction.amount.toFixed(2).replace('.', ','));
      setDescription(editingTransaction.description);
      setCounterparty(editingTransaction.counterparty);
      setProduct(editingTransaction.product);
      setCategory(editingTransaction.category);
      setPaymentMethod(editingTransaction.paymentMethod);
      setNotes(editingTransaction.notes ?? '');
      setReceiptDataUrl(undefined);
      setExistingReceiptUrl(editingTransaction.receiptUrl);
      setReceiptName(editingTransaction.receiptName);
      setRemoveReceipt(false);
    } else {
      setType(initialType);
      setEntryMethod(initialEntryMethod);
      setDate(new Date().toISOString().slice(0, 10));
      setAmountInput('');
      setDescription('');
      setCounterparty('');
      setProduct(initialType === 'expense' ? 'Geral / Institucional' : 'Mentoria Mapa');
      setCategory(CATEGORIES_BY_TYPE[initialType][0]);
      setPaymentMethod('PIX');
      setNotes('');
      setReceiptDataUrl(undefined);
      setExistingReceiptUrl(undefined);
      setReceiptName(undefined);
      setRemoveReceipt(false);
    }
  }, [isOpen, editingTransaction, initialType, initialEntryMethod]);

  if (!isOpen) return null;

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    const validCategories = CATEGORIES_BY_TYPE[nextType];
    if (!validCategories.includes(category)) {
      setCategory(validCategories[0]);
    }
    if (nextType === 'expense' && product === 'Mentoria Mapa' && !description) {
      setProduct('Geral / Institucional');
    }
  };

  const runReceiptExtraction = async (dataUrl: string, preferredType: TransactionType) => {
    setIsExtracting(true);
    setExtractionError(null);
    setExtractionNote(null);

    try {
      const response = await fetch('/api/extract-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: dataUrl, preferredType }),
      });

      const data = await response.json();
      if (!response.ok) {
        setExtractionError(data.error || 'Não foi possível ler os dados do comprovante automaticamente.');
        return;
      }

      const extracted = data.extracted as ExtractedReceiptData;
      if (extracted.type === 'sale' || extracted.type === 'deduction' || extracted.type === 'expense') {
        setType(extracted.type);
        const cats = CATEGORIES_BY_TYPE[extracted.type];
        if (cats.includes(extracted.category)) {
          setCategory(extracted.category);
        } else {
          setCategory(cats[0]);
        }
      }
      if (typeof extracted.amount === 'number' && extracted.amount > 0) {
        setAmountInput(extracted.amount.toFixed(2).replace('.', ','));
      }
      if (extracted.date && /^\d{4}-\d{2}-\d{2}$/.test(extracted.date)) {
        setDate(extracted.date);
      }
      if (extracted.description) {
        setDescription(extracted.description);
      }
      if (extracted.counterparty) {
        setCounterparty(extracted.counterparty);
      }
      if (MENTORSHIP_PRODUCTS.includes(extracted.product)) {
        setProduct(extracted.product);
      }
      if (PAYMENT_METHODS.includes(extracted.paymentMethod)) {
        setPaymentMethod(extracted.paymentMethod);
      }
      if (extracted.notes) {
        setNotes(extracted.notes);
      }
      setExtractionNote(
        extracted.confidenceNote || 'Dados preenchidos a partir do comprovante. Revise antes de salvar.',
      );
    } catch {
      setExtractionError(
        'Falha de conexão ao analisar o comprovante. A imagem continua anexada para preenchimento manual.',
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const processSelectedFile = async (file: File, autoExtract: boolean) => {
    if (!file.type.startsWith('image/')) {
      setFormError('Selecione um arquivo de imagem válido (PNG, JPG ou WEBP).');
      return;
    }

    setFormError(null);
    const dataUrl = await compressImageFile(file);
    setReceiptDataUrl(dataUrl);
    setExistingReceiptUrl(undefined);
    setReceiptName(file.name);
    setRemoveReceipt(false);

    if (autoExtract) {
      setEntryMethod('receipt');
      await runReceiptExtraction(dataUrl, type);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processSelectedFile(file, entryMethod === 'receipt');
    }
    e.target.value = '';
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processSelectedFile(file, true);
    }
  };

  const handleClearReceipt = () => {
    setReceiptDataUrl(undefined);
    setExistingReceiptUrl(undefined);
    setReceiptName(undefined);
    setRemoveReceipt(true);
    setExtractionNote(null);
    setExtractionError(null);
  };

  const activePreviewUrl = receiptDataUrl || (!removeReceipt ? existingReceiptUrl : undefined);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = parseBrazilianAmount(amountInput);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError('Informe um valor válido em reais (ex.: 1.290,00).');
      return;
    }
    if (!description.trim()) {
      setFormError('Informe uma descrição para o lançamento.');
      return;
    }
    if (!counterparty.trim()) {
      setFormError(`Informe o campo "${COUNTERPARTY_LABELS[type]}".`);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(
        {
          type,
          date,
          description: description.trim(),
          counterparty: counterparty.trim(),
          product,
          category,
          paymentMethod,
          amount: parsedAmount,
          entryMethod: activePreviewUrl && entryMethod === 'receipt' ? 'receipt' : entryMethod,
          receiptDataUrl,
          receiptName,
          removeReceipt,
          notes: notes.trim() || undefined,
        },
        editingTransaction?.id,
      );
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Não foi possível salvar o lançamento.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#022659]/60 backdrop-blur-[2px] p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-[#022659] px-6 py-4 flex items-center justify-between gap-4 text-white">
          <div>
            <h2 id="modal-title" className="text-lg font-semibold leading-tight">
              {editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento Financeiro'}
            </h2>
            <p className="text-xs text-white/75 mt-0.5">
              Cadastre manualmente ou envie a imagem do comprovante para preenchimento automático
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Step 1: Record Type */}
          <div>
            <label className="block text-xs font-semibold text-[#022659] mb-2">
              Tipo de Movimentação
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-[#F4F6FA] rounded-xl border border-slate-200">
              {(
                [
                  { id: 'sale', label: 'Venda (Entrada)' },
                  { id: 'deduction', label: 'Desconto / Tutor' },
                  { id: 'expense', label: 'Despesa' },
                ] as const
              ).map((item) => {
                const active = type === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTypeChange(item.id)}
                    className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[#033584] text-white shadow-xs'
                        : 'text-slate-600 hover:text-[#111111] hover:bg-white/60'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Entry Method Switcher (Manual vs Comprovante) */}
          <div>
            <label className="block text-xs font-semibold text-[#022659] mb-2">
              Forma de Inserção dos Dados
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#F4F6FA] rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setEntryMethod('receipt')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  entryMethod === 'receipt'
                    ? 'bg-white text-[#022659] border border-slate-200 shadow-xs'
                    : 'text-slate-600 hover:text-[#111111]'
                }`}
              >
                <FileImage className="w-4 h-4 text-[#FFAA00]" aria-hidden="true" />
                Imagem de Comprovante
              </button>
              <button
                type="button"
                onClick={() => setEntryMethod('manual')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  entryMethod === 'manual'
                    ? 'bg-white text-[#022659] border border-slate-200 shadow-xs'
                    : 'text-slate-600 hover:text-[#111111]'
                }`}
              >
                <PenLine className="w-4 h-4 text-[#2365C4]" aria-hidden="true" />
                Cadastro Manual
              </button>
            </div>
          </div>

          {/* Receipt Upload Zone (always prominent in 'receipt' mode, optional compact attach in 'manual' mode) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleFileChange}
            className="hidden"
          />

          {entryMethod === 'receipt' && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`rounded-xl border-2 border-dashed p-4 transition-colors ${
                isDragging
                  ? 'border-[#FFAA00] bg-[#FFAA00]/5'
                  : 'border-slate-300 bg-[#F4F6FA]/70'
              }`}
            >
              {!activePreviewUrl ? (
                <div className="flex flex-col items-center text-center py-4">
                  <div className="w-11 h-11 rounded-full bg-[#022659] text-[#FFAA00] flex items-center justify-center mb-3">
                    <Upload className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-medium text-[#111111]">
                    Arraste o comprovante aqui ou selecione uma imagem
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    PIX, nota fiscal, recibo de tutor ou print de venda (PNG, JPG ou WEBP)
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 px-4 py-2 rounded-lg bg-[#FFAA00] hover:bg-[#E59900] text-[#111111] text-xs font-semibold transition-colors"
                  >
                    Escolher Imagem do Comprovante
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="w-full sm:w-36 h-36 rounded-lg overflow-hidden border border-slate-200 bg-white shrink-0 flex items-center justify-center">
                    <img
                      src={activePreviewUrl}
                      alt="Pré-visualização do comprovante"
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#022659] truncate">
                        {receiptName || 'Comprovante anexado'}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs font-medium text-[#2365C4] hover:underline"
                        >
                          Trocar imagem
                        </button>
                        <button
                          type="button"
                          onClick={handleClearReceipt}
                          className="p-1 text-slate-500 hover:text-[#DC2626]"
                          aria-label="Remover comprovante"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {isExtracting && (
                      <div className="flex items-center gap-2 text-xs text-[#033584] bg-white border border-slate-200 rounded-lg px-3 py-2">
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span>Lendo valor, data e descrição do comprovante...</span>
                      </div>
                    )}

                    {!isExtracting && extractionNote && (
                      <div className="text-xs text-[#15803D] bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                        {extractionNote}
                      </div>
                    )}

                    {!isExtracting && extractionError && (
                      <div className="text-xs text-[#B45309] bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        {extractionError}
                      </div>
                    )}

                    {receiptDataUrl && !isExtracting && (
                      <button
                        type="button"
                        onClick={() => runReceiptExtraction(receiptDataUrl, type)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#033584] hover:text-[#2365C4]"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Reanalisar comprovante
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Structured Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tx-amount" className="block text-xs font-medium text-slate-700 mb-1">
                Valor (R$) *
              </label>
              <input
                id="tx-amount"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:border-[#2365C4] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="tx-date" className="block text-xs font-medium text-slate-700 mb-1">
                Data *
              </label>
              <input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:border-[#2365C4] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="tx-counterparty" className="block text-xs font-medium text-slate-700 mb-1">
                {COUNTERPARTY_LABELS[type]} *
              </label>
              <input
                id="tx-counterparty"
                type="text"
                placeholder={
                  type === 'sale'
                    ? 'Nome completo do aluno'
                    : type === 'deduction'
                    ? 'Nome do tutor, corretor ou gráfica'
                    : 'Nome da empresa ou fornecedor'
                }
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:border-[#2365C4] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="tx-description" className="block text-xs font-medium text-slate-700 mb-1">
                Descrição *
              </label>
              <input
                id="tx-description"
                type="text"
                placeholder={DESCRIPTION_PLACEHOLDERS[type]}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:border-[#2365C4] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="tx-product" className="block text-xs font-medium text-slate-700 mb-1">
                Produto da Mentoria
              </label>
              <select
                id="tx-product"
                value={product}
                onChange={(e) => setProduct(e.target.value as MentorshipProduct)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:border-[#2365C4] focus:outline-none"
              >
                {MENTORSHIP_PRODUCTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="tx-category" className="block text-xs font-medium text-slate-700 mb-1">
                Categoria
              </label>
              <select
                id="tx-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:border-[#2365C4] focus:outline-none"
              >
                {CATEGORIES_BY_TYPE[type].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="tx-payment" className="block text-xs font-medium text-slate-700 mb-1">
                Meio de Pagamento
              </label>
              <select
                id="tx-payment"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:border-[#2365C4] focus:outline-none"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="tx-notes" className="block text-xs font-medium text-slate-700 mb-1">
                Observações (opcional)
              </label>
              <input
                id="tx-notes"
                type="text"
                placeholder="Parcelas, banco ou detalhes adicionais"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:border-[#2365C4] focus:outline-none"
              />
            </div>
          </div>

          {/* Optional image attach in Manual mode */}
          {entryMethod === 'manual' && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
              {activePreviewUrl ? (
                <div className="flex items-center gap-3">
                  <img
                    src={activePreviewUrl}
                    alt="Comprovante anexado"
                    className="w-10 h-10 rounded object-cover border border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-slate-700 font-medium truncate max-w-[220px]">
                    {receiptName || 'Comprovante anexado'}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearReceipt}
                    className="text-[#DC2626] hover:underline"
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <span className="text-slate-500">
                  Deseja guardar uma foto do comprovante junto ao cadastro manual?
                </span>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-[#022659] font-medium hover:bg-slate-50 transition-colors"
              >
                <FileImage className="w-3.5 h-3.5" />
                {activePreviewUrl ? 'Substituir imagem' : 'Anexar imagem'}
              </button>
            </div>
          )}

          {formError && (
            <div className="text-xs text-[#DC2626] bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
              {formError}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || isExtracting}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#FFAA00] hover:bg-[#E59900] text-[#111111] transition-colors disabled:opacity-60 inline-flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingTransaction ? 'Salvar Alterações' : 'Salvar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
