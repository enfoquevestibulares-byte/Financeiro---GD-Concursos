import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  FileImage,
  LayoutDashboard,
  Menu,
  MinusCircle,
  PenLine,
  Plus,
  Search,
  Upload,
  X,
} from 'lucide-react';
import { BrandMark } from './components/BrandMark';
import { CashflowCharts } from './components/CashflowCharts';
import { KpiStrip } from './components/KpiStrip';
import { ReceiptPreviewModal } from './components/ReceiptPreviewModal';
import { ReceiptsGallery } from './components/ReceiptsGallery';
import { TransactionModal } from './components/TransactionModal';
import { TransactionTable } from './components/TransactionTable';
import {
  MENTORSHIP_PRODUCTS,
  type EntryMethod,
  type Transaction,
  type TransactionPayload,
  type TransactionType,
} from './types/finance';
import { exportTransactionsCsv, formatBRL } from './utils/format';

type NavSection = 'overview' | 'sales' | 'deductions' | 'expenses' | 'receipts';
type PeriodFilter = 'all' | 'current-month' | 'prev-month' | 'last-90';

const NAV_ITEMS: { id: NavSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'sales', label: 'Vendas', icon: ArrowUpRight },
  { id: 'deductions', label: 'Descontos e Tutores', icon: MinusCircle },
  { id: 'expenses', label: 'Despesas', icon: ArrowDownRight },
  { id: 'receipts', label: 'Comprovantes', icon: FileImage },
];

const SECTION_META: Record<
  NavSection,
  { title: string; subtitle: string; defaultTxType: TransactionType }
> = {
  overview: {
    title: 'Visão Geral',
    subtitle: 'Fluxo completo de entradas, repasses a tutores, materiais e despesas operacionais',
    defaultTxType: 'sale',
  },
  sales: {
    title: 'Vendas da Mentoria',
    subtitle: 'Matrículas, renovações e combos registrados manualmente ou por recibo',
    defaultTxType: 'sale',
  },
  deductions: {
    title: 'Descontos e Tutores',
    subtitle: 'Pagamentos de tutores, materiais didáticos, correções de simulados e taxas',
    defaultTxType: 'deduction',
  },
  expenses: {
    title: 'Despesas Operacionais',
    subtitle: 'Tráfego pago, softwares, estúdio, contabilidade e custos fixos da mentoria',
    defaultTxType: 'expense',
  },
  receipts: {
    title: 'Comprovantes',
    subtitle: 'Repositório de imagens de recibos, comprovantes PIX e notas fiscais anexadas',
    defaultTxType: 'sale',
  },
};

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [productFilter, setProductFilter] = useState<string>('all');

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalType, setModalType] = useState<TransactionType>('sale');
  const [modalEntryMethod, setModalEntryMethod] = useState<EntryMethod>('receipt');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const [previewTx, setPreviewTx] = useState<Transaction | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch('/api/transactions');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao carregar os dados.');
      }
      setTransactions(data.transactions ?? []);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Erro ao conectar com o servidor financeiro.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const now = useMemo(() => new Date(), []);
  const currentMonthPrefix = useMemo(() => now.toISOString().slice(0, 7), [now]);
  const prevMonthPrefix = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [now]);

  const filteredByToolbar = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const cutoff90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    return transactions.filter((t) => {
      if (periodFilter === 'current-month' && !t.date.startsWith(currentMonthPrefix)) {
        return false;
      }
      if (periodFilter === 'prev-month' && !t.date.startsWith(prevMonthPrefix)) {
        return false;
      }
      if (periodFilter === 'last-90' && t.date < cutoff90) {
        return false;
      }
      if (productFilter !== 'all' && t.product !== productFilter) {
        return false;
      }
      if (query) {
        const haystack = `${t.description} ${t.counterparty} ${t.category} ${t.product} ${t.notes ?? ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [transactions, searchQuery, periodFilter, productFilter, currentMonthPrefix, prevMonthPrefix, now]);

  const sectionTransactions = useMemo(() => {
    if (activeSection === 'sales') {
      return filteredByToolbar.filter((t) => t.type === 'sale');
    }
    if (activeSection === 'deductions') {
      return filteredByToolbar.filter((t) => t.type === 'deduction');
    }
    if (activeSection === 'expenses') {
      return filteredByToolbar.filter((t) => t.type === 'expense');
    }
    return filteredByToolbar;
  }, [filteredByToolbar, activeSection]);

  const openCreateModal = (entryMethod: EntryMethod, forcedType?: TransactionType) => {
    setEditingTx(null);
    setModalType(forcedType ?? SECTION_META[activeSection].defaultTxType);
    setModalEntryMethod(entryMethod);
    setModalOpen(true);
  };

  const openEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setModalType(tx.type);
    setModalEntryMethod(tx.entryMethod);
    setModalOpen(true);
  };

  const handleSaveTransaction = async (payload: TransactionPayload, editingId?: string) => {
    const url = editingId ? `/api/transactions/${editingId}` : '/api/transactions';
    const method = editingId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Erro ao salvar lançamento.');
    }

    await fetchTransactions();
  };

  const handleDeleteTransaction = async (id: string) => {
    const response = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Erro ao excluir lançamento.');
    }
    setTransactions((prev) => prev.filter((item) => item.id !== id));
  };

  // Focused breakdown cards for Deductions or Expenses tabs
  const categoryBreakdown = useMemo(() => {
    if (activeSection !== 'deductions' && activeSection !== 'expenses') return [];
    const targetType = activeSection === 'deductions' ? 'deduction' : 'expense';
    const map = new Map<string, number>();
    for (const item of filteredByToolbar) {
      if (item.type !== targetType) continue;
      map.set(item.category, (map.get(item.category) ?? 0) + item.amount);
    }
    return Array.from(map.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }, [filteredByToolbar, activeSection]);

  const sectionTotal = useMemo(
    () => sectionTransactions.reduce((acc, item) => acc + item.amount, 0),
    [sectionTransactions],
  );

  const meta = SECTION_META[activeSection];

  const SidebarContent = (
    <div className="flex flex-col h-full bg-[#022659] text-white">
      <div className="px-6 py-6 border-b border-white/10">
        <BrandMark variant="dark-bg" showSubtitle />
      </div>

      <nav aria-label="Navegação principal" className="flex-1 px-3 py-5 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveSection(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-[#033584] text-white'
                  : 'text-white/75 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#FFAA00]' : 'text-white/70'}`}
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-2">
        <div className="text-[11px] font-medium text-white/60 px-1">
          Acesso rápido de lançamento
        </div>
        <button
          type="button"
          onClick={() => {
            setMobileMenuOpen(false);
            openCreateModal('receipt');
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-[#FFAA00] hover:bg-[#E59900] text-[#111111] text-xs font-semibold transition-colors whitespace-nowrap"
        >
          <Upload className="w-3.5 h-3.5 shrink-0" />
          Subir Comprovante
        </button>
        <button
          type="button"
          onClick={() => {
            setMobileMenuOpen(false);
            openCreateModal('manual');
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors whitespace-nowrap"
        >
          <PenLine className="w-3.5 h-3.5 shrink-0" />
          Cadastrar Manualmente
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F4F6FA] text-[#111111]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[260px] shrink-0 border-r border-[#033584]">
        <div className="sticky top-0 h-screen">{SidebarContent}</div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#022659]/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-[270px] max-w-[82vw] h-full shadow-2xl z-10">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb on left + Single Primary Action on right */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-8 h-16 flex items-center justify-between gap-6 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-[#022659] hover:bg-slate-100"
              aria-label="Abrir menu lateral"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="font-semibold text-[#022659] whitespace-nowrap">
                Gestão Financeira
              </span>
              <span className="text-slate-400" aria-hidden="true">
                /
              </span>
              <span className="text-slate-600 truncate">{meta.title}</span>
            </div>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => openCreateModal('receipt')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FFAA00] hover:bg-[#E59900] text-[#111111] text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              Novo Lançamento
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-8 py-6 max-w-[1440px] w-full mx-auto space-y-6">
          {/* Page Header + Dual Insertion Buttons */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#022659] tracking-tight">
                {meta.title}
              </h1>
              <p className="text-sm text-slate-600 mt-0.5">{meta.subtitle}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => openCreateModal('receipt')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#033584] hover:bg-[#022659] text-white text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <FileImage className="w-4 h-4 text-[#FFAA00]" />
                Inserir por Comprovante
              </button>
              <button
                type="button"
                onClick={() => openCreateModal('manual')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:border-[#022659] text-[#022659] text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <PenLine className="w-4 h-4 text-[#2365C4]" />
                Cadastro Manual
              </button>
              <button
                type="button"
                onClick={() => exportTransactionsCsv(sectionTransactions)}
                disabled={sectionTransactions.length === 0}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                Exportar CSV
              </button>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-1">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por descrição, aluno, tutor, gráfica ou categoria..."
                aria-label="Buscar lançamentos"
                className="w-full pl-9 pr-3 py-2 text-sm bg-[#F4F6FA] border border-slate-200 rounded-lg focus:bg-white focus:border-[#2365C4] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
                aria-label="Filtrar por período"
                className="px-3 py-2 text-xs sm:text-sm bg-[#F4F6FA] border border-slate-200 rounded-lg focus:border-[#2365C4] focus:outline-none"
              >
                <option value="all">Todo o período</option>
                <option value="current-month">Mês atual</option>
                <option value="prev-month">Mês anterior</option>
                <option value="last-90">Últimos 90 dias</option>
              </select>

              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                aria-label="Filtrar por produto da mentoria"
                className="px-3 py-2 text-xs sm:text-sm bg-[#F4F6FA] border border-slate-200 rounded-lg focus:border-[#2365C4] focus:outline-none"
              >
                <option value="all">Todos os produtos</option>
                {MENTORSHIP_PRODUCTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-4 text-sm text-[#DC2626]">
              <span>{loadError}</span>
              <button
                type="button"
                onClick={fetchTransactions}
                className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-xs font-semibold hover:bg-red-100"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {/* Section Views */}
          {activeSection === 'overview' && (
            <>
              <KpiStrip transactions={filteredByToolbar} loading={loading} />
              <CashflowCharts transactions={filteredByToolbar} />
              <TransactionTable
                transactions={sectionTransactions}
                loading={loading}
                title="Livro-Caixa da Mentoria"
                subtitle="Histórico unificado de vendas, descontos com tutores/materiais e despesas"
                emptyActionLabel="Registrar Primeiro Lançamento"
                onCreateNew={() => openCreateModal('receipt', 'sale')}
                onEdit={openEditModal}
                onDelete={handleDeleteTransaction}
                onPreviewReceipt={(tx) => setPreviewTx(tx)}
              />
            </>
          )}

          {activeSection === 'sales' && (
            <>
              <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs font-medium text-slate-500">Total em Vendas Filtradas</div>
                  <div className="mt-2 text-2xl font-semibold text-[#15803D] font-mono tabular-nums">
                    {formatBRL(sectionTotal)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 tabular-nums">
                    {sectionTransactions.length}{' '}
                    {sectionTransactions.length === 1 ? 'venda' : 'vendas'}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs font-medium text-slate-500">Ticket Médio</div>
                  <div className="mt-2 text-2xl font-semibold text-[#022659] font-mono tabular-nums">
                    {formatBRL(
                      sectionTransactions.length > 0
                        ? sectionTotal / sectionTransactions.length
                        : 0,
                    )}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Por matrícula registrada</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs font-medium text-slate-500">Vendas com Recibo Anexado</div>
                  <div className="mt-2 text-2xl font-semibold text-[#111111] font-mono tabular-nums">
                    {sectionTransactions.filter((t) => Boolean(t.receiptUrl)).length}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Comprovantes conferidos</div>
                </div>
              </section>

              <TransactionTable
                transactions={sectionTransactions}
                loading={loading}
                title="Registro de Vendas"
                subtitle="Suba recibos das plataformas/PIX ou cadastre matrículas manualmente"
                emptyActionLabel="Cadastrar Primeira Venda"
                onCreateNew={() => openCreateModal('receipt', 'sale')}
                onEdit={openEditModal}
                onDelete={handleDeleteTransaction}
                onPreviewReceipt={(tx) => setPreviewTx(tx)}
              />
            </>
          )}

          {(activeSection === 'deductions' || activeSection === 'expenses') && (
            <>
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-4 bg-[#022659] text-white rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-medium text-white/75">
                      {activeSection === 'deductions'
                        ? 'Total em Descontos & Repasses'
                        : 'Total em Despesas Operacionais'}
                    </div>
                    <div className="mt-2 text-2xl font-semibold font-mono tabular-nums">
                      {formatBRL(sectionTotal)}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 text-xs text-white/75 tabular-nums">
                    {sectionTransactions.length}{' '}
                    {sectionTransactions.length === 1 ? 'lançamento no período' : 'lançamentos no período'}
                  </div>
                </div>

                <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-[#022659]">
                    Distribuição por Categoria
                  </h2>
                  {categoryBreakdown.length === 0 ? (
                    <p className="text-xs text-slate-500 mt-4">
                      Sem registros nesta visualização.
                    </p>
                  ) : (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {categoryBreakdown.map((item) => (
                        <div
                          key={item.category}
                          className="flex items-center justify-between gap-2 py-2 px-3 bg-[#F4F6FA] rounded-lg text-xs"
                        >
                          <span className="font-medium text-slate-700 truncate">
                            {item.category}
                          </span>
                          <span className="font-mono font-semibold text-[#111111] tabular-nums shrink-0">
                            {formatBRL(item.total)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <TransactionTable
                transactions={sectionTransactions}
                loading={loading}
                title={
                  activeSection === 'deductions'
                    ? 'Descontos, Tutores e Materiais'
                    : 'Despesas Operacionais'
                }
                subtitle={
                  activeSection === 'deductions'
                    ? 'Pagamentos de tutores, corretores, impressão de apostilas e taxas'
                    : 'Custos fixos e variáveis de operação da mentoria'
                }
                emptyActionLabel={
                  activeSection === 'deductions'
                    ? 'Registrar Desconto ou Tutor'
                    : 'Registrar Despesa'
                }
                onCreateNew={() =>
                  openCreateModal('receipt', activeSection === 'deductions' ? 'deduction' : 'expense')
                }
                onEdit={openEditModal}
                onDelete={handleDeleteTransaction}
                onPreviewReceipt={(tx) => setPreviewTx(tx)}
              />
            </>
          )}

          {activeSection === 'receipts' && (
            <ReceiptsGallery
              transactions={filteredByToolbar}
              onPreviewReceipt={(tx) => setPreviewTx(tx)}
              onUploadNew={() => openCreateModal('receipt', 'sale')}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <TransactionModal
        isOpen={modalOpen}
        initialType={modalType}
        initialEntryMethod={modalEntryMethod}
        editingTransaction={editingTx}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSaveTransaction}
      />

      <ReceiptPreviewModal
        transaction={previewTx}
        onClose={() => setPreviewTx(null)}
        onEdit={(tx) => openEditModal(tx)}
      />
    </div>
  );
}
