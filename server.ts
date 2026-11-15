import 'dotenv/config';
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { GoogleGenAI, Type } from '@google/genai';

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const LEDGER_FILE = path.join(DATA_DIR, 'ledger.json');

interface ServerTransaction {
  id: string;
  type: 'sale' | 'deduction' | 'expense';
  date: string;
  description: string;
  counterparty: string;
  product: string;
  category: string;
  paymentMethod: string;
  amount: number;
  entryMethod: 'manual' | 'receipt';
  receiptUrl?: string;
  receiptName?: string;
  notes?: string;
  createdAt: string;
}

const INITIAL_SEED: ServerTransaction[] = [
  {
    id: 'tx_seed_01',
    type: 'sale',
    date: '2026-11-12',
    description: 'Matrícula Turma Polícia Federal — Plano Semestral',
    counterparty: 'Lucas Andrade Ferreira',
    product: 'Mentoria Mapa',
    category: 'Matrícula Integral',
    paymentMethod: 'PIX',
    amount: 2890,
    entryMethod: 'manual',
    notes: 'Pagamento à vista via PIX direto',
    createdAt: '2026-11-12T10:15:00.000Z',
  },
  {
    id: 'tx_seed_02',
    type: 'sale',
    date: '2026-11-10',
    description: 'Inscrição GPS da Aprovação — Ciclo Tribunais',
    counterparty: 'Mariana Costa Ribeiro',
    product: 'GPS da Aprovação',
    category: 'Matrícula Integral',
    paymentMethod: 'Plataforma (Hotmart/Kiwify)',
    amount: 1997,
    entryMethod: 'manual',
    notes: 'Venda confirmada na plataforma em 10x',
    createdAt: '2026-11-10T14:20:00.000Z',
  },
  {
    id: 'tx_seed_03',
    type: 'deduction',
    date: '2026-11-11',
    description: 'Repasse semanal de tutoria e planos de estudo',
    counterparty: 'Prof. Rafael Mendes (Tutor)',
    product: 'Mentoria Mapa',
    category: 'Pagamento de Tutor',
    paymentMethod: 'PIX',
    amount: 950,
    entryMethod: 'manual',
    notes: 'Acompanhamento de 14 mentorados — semana 45',
    createdAt: '2026-11-11T17:05:00.000Z',
  },
  {
    id: 'tx_seed_04',
    type: 'deduction',
    date: '2026-11-08',
    description: 'Impressão e encadernação de apostilas de Direito Administrativo',
    counterparty: 'Gráfica Central Concursos',
    product: 'Rota Certa',
    category: 'Material Didático',
    paymentMethod: 'Transferência TED',
    amount: 480,
    entryMethod: 'manual',
    notes: 'Lote com 40 cadernos de questões comentadas',
    createdAt: '2026-11-08T11:40:00.000Z',
  },
  {
    id: 'tx_seed_05',
    type: 'expense',
    date: '2026-11-06',
    description: 'Campanha de captação — Meta Ads (Edital PRF/PF)',
    counterparty: 'Meta Platforms Brasil',
    product: 'Geral / Institucional',
    category: 'Tráfego Pago',
    paymentMethod: 'Cartão de Crédito',
    amount: 1450,
    entryMethod: 'manual',
    notes: 'Fatura mensal de anúncios de conversão',
    createdAt: '2026-11-06T09:30:00.000Z',
  },
  {
    id: 'tx_seed_06',
    type: 'sale',
    date: '2026-11-04',
    description: 'Combo Rota Certa + Preparação Emocional',
    counterparty: 'Camila Duarte Nogueira',
    product: 'Rota Certa',
    category: 'Combo / Pacote',
    paymentMethod: 'Cartão de Crédito',
    amount: 2450,
    entryMethod: 'manual',
    notes: 'Inclui módulo de controle de ansiedade pré-prova',
    createdAt: '2026-11-04T16:12:00.000Z',
  },
  {
    id: 'tx_seed_07',
    type: 'deduction',
    date: '2026-11-03',
    description: 'Correção de discursivas e simulados comentados',
    counterparty: 'Profa. Juliana Alencar (Corretora)',
    product: 'Preparação Emocional',
    category: 'Correção de Simulados',
    paymentMethod: 'PIX',
    amount: 620,
    entryMethod: 'manual',
    notes: '31 redações corrigidas com áudio individual',
    createdAt: '2026-11-03T19:00:00.000Z',
  },
  {
    id: 'tx_seed_08',
    type: 'sale',
    date: '2026-10-25',
    description: 'Programa TAF — Preparação Física Intensiva (Turma Outubro)',
    counterparty: 'Bruno Henrique Teles',
    product: 'TAF — Avaliação Física',
    category: 'Matrícula Integral',
    paymentMethod: 'PIX',
    amount: 1290,
    entryMethod: 'manual',
    notes: 'Planilha de barra fixa, corrida e impulsão',
    createdAt: '2026-10-25T13:10:00.000Z',
  },
  {
    id: 'tx_seed_09',
    type: 'deduction',
    date: '2026-10-20',
    description: 'Honorários de preparador físico parceiro',
    counterparty: 'Coach Thiago Rocha',
    product: 'TAF — Avaliação Física',
    category: 'Pagamento de Tutor',
    paymentMethod: 'PIX',
    amount: 550,
    entryMethod: 'manual',
    notes: 'Avaliação biomecânica e feedbacks em vídeo',
    createdAt: '2026-10-20T18:20:00.000Z',
  },
  {
    id: 'tx_seed_10',
    type: 'expense',
    date: '2026-10-15',
    description: 'Assinatura plataforma de hospedagem de aulas e CRM',
    counterparty: 'ActiveCampaign & Vimeo',
    product: 'Geral / Institucional',
    category: 'Ferramentas & Software',
    paymentMethod: 'Cartão de Crédito',
    amount: 540,
    entryMethod: 'manual',
    notes: 'Licenças recorrentes mensais',
    createdAt: '2026-10-15T10:00:00.000Z',
  },
  {
    id: 'tx_seed_11',
    type: 'sale',
    date: '2026-10-12',
    description: 'Renovação Mentoria Mapa — Trimestre Final',
    counterparty: 'Fernanda Pires Souza',
    product: 'Mentoria Mapa',
    category: 'Renovação',
    paymentMethod: 'PIX',
    amount: 1650,
    entryMethod: 'manual',
    createdAt: '2026-10-12T15:45:00.000Z',
  },
  {
    id: 'tx_seed_12',
    type: 'sale',
    date: '2026-09-22',
    description: 'Matrícula GPS da Aprovação — Turma Setembro',
    counterparty: 'Rodrigo Azevedo Lima',
    product: 'GPS da Aprovação',
    category: 'Matrícula Integral',
    paymentMethod: 'Plataforma (Hotmart/Kiwify)',
    amount: 3994,
    entryMethod: 'manual',
    notes: '2 matrículas fechadas após aula aberta',
    createdAt: '2026-09-22T20:10:00.000Z',
  },
  {
    id: 'tx_seed_13',
    type: 'deduction',
    date: '2026-09-24',
    description: 'Taxa de intermediação da plataforma de vendas',
    counterparty: 'Hotmart Pagamentos',
    product: 'GPS da Aprovação',
    category: 'Taxa de Plataforma',
    paymentMethod: 'Plataforma (Hotmart/Kiwify)',
    amount: 395,
    entryMethod: 'manual',
    createdAt: '2026-09-24T09:00:00.000Z',
  },
  {
    id: 'tx_seed_14',
    type: 'expense',
    date: '2026-09-18',
    description: 'Honorários contábeis e emissão de notas fiscais',
    counterparty: 'Contabilize Educação Ltda',
    product: 'Geral / Institucional',
    category: 'Contabilidade & Impostos',
    paymentMethod: 'Boleto',
    amount: 680,
    entryMethod: 'manual',
    createdAt: '2026-09-18T11:30:00.000Z',
  },
];

async function ensureStorage(): Promise<void> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  try {
    await fs.access(LEDGER_FILE);
  } catch {
    await fs.writeFile(LEDGER_FILE, JSON.stringify(INITIAL_SEED, null, 2), 'utf-8');
  }
}

async function readLedger(): Promise<ServerTransaction[]> {
  await ensureStorage();
  const raw = await fs.readFile(LEDGER_FILE, 'utf-8');
  const parsed = JSON.parse(raw) as ServerTransaction[];
  return parsed.sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) return byDate;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

async function writeLedger(items: ServerTransaction[]): Promise<void> {
  await ensureStorage();
  await fs.writeFile(LEDGER_FILE, JSON.stringify(items, null, 2), 'utf-8');
}

async function saveDataUrlImage(dataUrl: string, id: string): Promise<string | undefined> {
  const match = /^data:(image\/(png|jpeg|jpg|webp|gif));base64,(.+)$/i.exec(dataUrl);
  if (!match) return undefined;
  const rawExt = match[2].toLowerCase();
  const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
  const buffer = Buffer.from(match[3], 'base64');
  const filename = `${id}.${ext}`;
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOADS_DIR, filename), buffer);
  return `/api/uploads/${filename}`;
}

async function deleteReceiptFile(receiptUrl?: string): Promise<void> {
  if (!receiptUrl || !receiptUrl.startsWith('/api/uploads/')) return;
  const safeName = path.basename(receiptUrl);
  const fullPath = path.join(UPLOADS_DIR, safeName);
  try {
    await fs.unlink(fullPath);
  } catch {
    // Ignore if file already missing
  }
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  await ensureStorage();

  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/uploads/:filename', async (req, res) => {
    const safeName = path.basename(req.params.filename);
    const filePath = path.join(UPLOADS_DIR, safeName);
    try {
      await fs.access(filePath);
      res.sendFile(filePath);
    } catch {
      res.status(404).json({ error: 'Comprovante não encontrado.' });
    }
  });

  app.get('/api/transactions', async (_req, res) => {
    try {
      const items = await readLedger();
      res.json({ transactions: items });
    } catch (error) {
      console.error('Failed to read ledger:', error);
      res.status(500).json({ error: 'Não foi possível carregar os lançamentos.' });
    }
  });

  app.post('/api/transactions', async (req, res) => {
    try {
      const body = req.body ?? {};
      const type = body.type;
      if (type !== 'sale' && type !== 'deduction' && type !== 'expense') {
        res.status(400).json({ error: 'Tipo de lançamento inválido.' });
        return;
      }

      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        res.status(400).json({ error: 'Informe um valor financeiro válido maior que zero.' });
        return;
      }

      const description = String(body.description ?? '').trim();
      const counterparty = String(body.counterparty ?? '').trim();
      if (!description || !counterparty) {
        res.status(400).json({ error: 'Descrição e nome do aluno/tutor/fornecedor são obrigatórios.' });
        return;
      }

      const id = `tx_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      let receiptUrl: string | undefined;
      if (typeof body.receiptDataUrl === 'string' && body.receiptDataUrl.startsWith('data:image/')) {
        receiptUrl = await saveDataUrlImage(body.receiptDataUrl, id);
      }

      const item: ServerTransaction = {
        id,
        type,
        date: typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
          ? body.date
          : new Date().toISOString().slice(0, 10),
        description,
        counterparty,
        product: String(body.product || 'Geral / Institucional'),
        category: String(body.category || (type === 'sale' ? 'Matrícula Integral' : type === 'deduction' ? 'Pagamento de Tutor' : 'Outras Despesas')),
        paymentMethod: String(body.paymentMethod || 'PIX'),
        amount: Math.round(amount * 100) / 100,
        entryMethod: body.entryMethod === 'receipt' ? 'receipt' : 'manual',
        receiptUrl,
        receiptName: receiptUrl ? String(body.receiptName || 'comprovante.png') : undefined,
        notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : undefined,
        createdAt: new Date().toISOString(),
      };

      const ledger = await readLedger();
      ledger.unshift(item);
      await writeLedger(ledger);
      res.status(201).json({ transaction: item });
    } catch (error) {
      console.error('Failed to create transaction:', error);
      res.status(500).json({ error: 'Erro ao salvar o lançamento.' });
    }
  });

  app.put('/api/transactions/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const ledger = await readLedger();
      const idx = ledger.findIndex((item) => item.id === id);
      if (idx === -1) {
        res.status(404).json({ error: 'Lançamento não encontrado.' });
        return;
      }

      const existing = ledger[idx];
      const body = req.body ?? {};
      const amount = Number(body.amount ?? existing.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        res.status(400).json({ error: 'Informe um valor financeiro válido maior que zero.' });
        return;
      }

      let receiptUrl = existing.receiptUrl;
      let receiptName = existing.receiptName;

      if (body.removeReceipt) {
        await deleteReceiptFile(existing.receiptUrl);
        receiptUrl = undefined;
        receiptName = undefined;
      }

      if (typeof body.receiptDataUrl === 'string' && body.receiptDataUrl.startsWith('data:image/')) {
        await deleteReceiptFile(existing.receiptUrl);
        const saved = await saveDataUrlImage(body.receiptDataUrl, `${id}_${Date.now()}`);
        if (saved) {
          receiptUrl = saved;
          receiptName = String(body.receiptName || 'comprovante.png');
        }
      }

      const updated: ServerTransaction = {
        ...existing,
        type: body.type === 'sale' || body.type === 'deduction' || body.type === 'expense' ? body.type : existing.type,
        date: typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : existing.date,
        description: String(body.description ?? existing.description).trim() || existing.description,
        counterparty: String(body.counterparty ?? existing.counterparty).trim() || existing.counterparty,
        product: String(body.product ?? existing.product),
        category: String(body.category ?? existing.category),
        paymentMethod: String(body.paymentMethod ?? existing.paymentMethod),
        amount: Math.round(amount * 100) / 100,
        entryMethod: body.entryMethod === 'receipt' || body.entryMethod === 'manual' ? body.entryMethod : existing.entryMethod,
        receiptUrl,
        receiptName,
        notes: typeof body.notes === 'string' ? (body.notes.trim() || undefined) : existing.notes,
      };

      ledger[idx] = updated;
      await writeLedger(ledger);
      res.json({ transaction: updated });
    } catch (error) {
      console.error('Failed to update transaction:', error);
      res.status(500).json({ error: 'Erro ao atualizar o lançamento.' });
    }
  });

  app.delete('/api/transactions/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const ledger = await readLedger();
      const target = ledger.find((item) => item.id === id);
      if (!target) {
        res.status(404).json({ error: 'Lançamento não encontrado.' });
        return;
      }
      await deleteReceiptFile(target.receiptUrl);
      const next = ledger.filter((item) => item.id !== id);
      await writeLedger(next);
      res.json({ ok: true });
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      res.status(500).json({ error: 'Erro ao excluir o lançamento.' });
    }
  });

  app.post('/api/extract-receipt', async (req, res) => {
    try {
      const { imageDataUrl, preferredType } = req.body ?? {};
      if (typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
        res.status(400).json({ error: 'Envie uma imagem válida de comprovante (PNG, JPG ou WEBP).' });
        return;
      }

      const match = /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/.exec(imageDataUrl);
      if (!match) {
        res.status(400).json({ error: 'Formato de imagem inválido.' });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error: 'Leitura automática indisponível no momento (chave da API não configurada). O comprovante permanece anexado para preenchimento manual.',
        });
        return;
      }

      const mimeType = match[1];
      const base64Data = match[2];
      const todayIso = new Date().toISOString().slice(0, 10);

      const prompt = [
        'Analise esta imagem de comprovante, recibo, nota fiscal ou tela de venda referente a uma mentoria de concursos públicos ("Gustavo Dias Concursos").',
        'Extraia os dados financeiros em português do Brasil com máxima precisão.',
        `Se o usuário já indicou uma preferência de tipo: "${preferredType || 'auto'}". Se for "sale", "deduction" ou "expense", considere esse contexto caso o comprovante seja ambíguo.`,
        `Se a data não estiver legível na imagem, use "${todayIso}".`,
        'Produtos possíveis da mentoria: "Mentoria Mapa", "GPS da Aprovação", "Rota Certa", "Preparação Emocional", "TAF — Avaliação Física", "Geral / Institucional".',
        'Categorias de venda ("sale"): "Matrícula Integral", "Parcela / Recorrência", "Renovação", "Combo / Pacote", "Workshop / Imersão".',
        'Categorias de desconto/repasse ("deduction"): "Pagamento de Tutor", "Material Didático", "Correção de Simulados", "Taxa de Plataforma", "Comissão / Afiliado", "Desconto Comercial".',
        'Categorias de despesa ("expense"): "Tráfego Pago", "Ferramentas & Software", "Estúdio & Equipamentos", "Contabilidade & Impostos", "Eventos & Presencial", "Outras Despesas".',
        'Meios de pagamento possíveis: "PIX", "Cartão de Crédito", "Plataforma (Hotmart/Kiwify)", "Transferência TED", "Boleto", "Dinheiro".',
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            { text: prompt },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              type: {
                type: Type.STRING,
                description: 'Classificação financeira: sale, deduction ou expense.',
              },
              amount: {
                type: Type.NUMBER,
                description: 'Valor total em reais (apenas número decimal positivo, ex: 1290.50).',
              },
              date: {
                type: Type.STRING,
                description: 'Data do comprovante no formato YYYY-MM-DD.',
              },
              description: {
                type: Type.STRING,
                description: 'Descrição clara e objetiva do lançamento em português.',
              },
              counterparty: {
                type: Type.STRING,
                description: 'Nome do aluno, tutor, corretor, loja ou fornecedor identificado.',
              },
              product: {
                type: Type.STRING,
                description: 'Produto da mentoria relacionado ou Geral / Institucional.',
              },
              category: {
                type: Type.STRING,
                description: 'Categoria correspondente ao tipo.',
              },
              paymentMethod: {
                type: Type.STRING,
                description: 'Meio de pagamento identificado.',
              },
              notes: {
                type: Type.STRING,
                description: 'Observações extras do comprovante (banco, ID de transação, parcelas).',
              },
              confidenceNote: {
                type: Type.STRING,
                description: 'Resumo curto explicando o que foi extraído da imagem.',
              },
            },
            required: [
              'type',
              'amount',
              'date',
              'description',
              'counterparty',
              'product',
              'category',
              'paymentMethod',
              'notes',
              'confidenceNote',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({ extracted: parsed });
    } catch (error) {
      console.error('Receipt extraction failed:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido na leitura do comprovante.';
      res.status(500).json({
        error: `Não foi possível ler automaticamente o comprovante (${message}). Você pode preencher os campos manualmente mantendo a imagem anexada.`,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gustavo Dias Concursos server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
