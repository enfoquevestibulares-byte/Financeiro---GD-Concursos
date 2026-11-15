export type TransactionType = 'sale' | 'deduction' | 'expense';

export type EntryMethod = 'manual' | 'receipt';

export type MentorshipProduct =
  | 'Mentoria Mapa'
  | 'GPS da Aprovação'
  | 'Rota Certa'
  | 'Preparação Emocional'
  | 'TAF — Avaliação Física'
  | 'Geral / Institucional';

export const MENTORSHIP_PRODUCTS: MentorshipProduct[] = [
  'Mentoria Mapa',
  'GPS da Aprovação',
  'Rota Certa',
  'Preparação Emocional',
  'TAF — Avaliação Física',
  'Geral / Institucional',
];

export const CATEGORIES_BY_TYPE: Record<TransactionType, string[]> = {
  sale: [
    'Matrícula Integral',
    'Parcela / Recorrência',
    'Renovação',
    'Combo / Pacote',
    'Workshop / Imersão',
  ],
  deduction: [
    'Pagamento de Tutor',
    'Material Didático',
    'Correção de Simulados',
    'Taxa de Plataforma',
    'Comissão / Afiliado',
    'Desconto Comercial',
  ],
  expense: [
    'Tráfego Pago',
    'Ferramentas & Software',
    'Estúdio & Equipamentos',
    'Contabilidade & Impostos',
    'Eventos & Presencial',
    'Outras Despesas',
  ],
};

export const PAYMENT_METHODS: string[] = [
  'PIX',
  'Cartão de Crédito',
  'Plataforma (Hotmart/Kiwify)',
  'Transferência TED',
  'Boleto',
  'Dinheiro',
];

export interface Transaction {
  id: string;
  type: TransactionType;
  date: string; // YYYY-MM-DD
  description: string;
  counterparty: string;
  product: MentorshipProduct;
  category: string;
  paymentMethod: string;
  amount: number;
  entryMethod: EntryMethod;
  receiptUrl?: string;
  receiptName?: string;
  notes?: string;
  createdAt: string;
}

export interface TransactionPayload {
  type: TransactionType;
  date: string;
  description: string;
  counterparty: string;
  product: MentorshipProduct;
  category: string;
  paymentMethod: string;
  amount: number;
  entryMethod: EntryMethod;
  receiptDataUrl?: string;
  receiptName?: string;
  removeReceipt?: boolean;
  notes?: string;
}

export interface ExtractedReceiptData {
  type: TransactionType;
  amount: number;
  date: string;
  description: string;
  counterparty: string;
  product: MentorshipProduct;
  category: string;
  paymentMethod: string;
  notes: string;
  confidenceNote: string;
}
