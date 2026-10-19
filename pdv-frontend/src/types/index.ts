// ── Tipos compartilhados do domínio ───────────────────────────────────────────

export type Cargo = 'gerente' | 'vendedor' | 'caixa';

export interface Usuario {
  id_usuario: number;
  nome: string;
  email: string;
  cargo: Cargo;
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
}

// ── Categoria ─────────────────────────────────────────────────────────────────
export interface Categoria {
  id_categoria: number;
  nome: string;
  descricao?: string | null;
  ativo?: number | boolean;
}

// ── Variações de Produto (Grade) ──────────────────────────────────────────────
export interface ProdutoVariacao {
  id_variacao: number;
  id_produto: number;
  cor: string;
  tamanho: string;
  codigo_barras?: string | null;
  quantidade_estoque: number;
  ativo?: number | boolean;
}

export interface VariacaoEntrada {
  id_variacao?: number;
  cor: string;
  tamanho: string;
  codigo_barras?: string | null;
  quantidade_estoque: number;
}

// ── Produto ───────────────────────────────────────────────────────────────────
export interface Produto {
  id_produto: number;
  id_categoria?: number | null;
  nome_categoria?: string | null;
  codigo_barras?: string | null;
  nome: string;
  descricao?: string | null;
  cor?: string | null;
  tamanho?: string | null;
  preco_custo: number;
  preco_unitario: number;
  preco_venda?: number; // alias para compatibilidade
  quantidade_estoque: number;
  estoque_minimo: number;
  foto_url?: string | null;
  ativo: number | boolean;
  margem_lucro?: number;
  variacoes?: ProdutoVariacao[];
  variacao_selecionada?: ProdutoVariacao;
  criado_em?: string;
}

// ── Cliente ───────────────────────────────────────────────────────────────────
export interface Cliente {
  id_cliente: number;
  nome: string;
  cpf?: string | null;
  email?: string | null;
  telefone?: string | null;
  criado_em?: string;
}

// ── Formas de Pagamento e Parcelas ─────────────────────────────────────────────
export type FormaPagamento = 'pix' | 'cartao_credito' | 'cartao_debito' | 'boleto';
export type StatusPagamento = 'pendente' | 'aprovado' | 'recusado' | 'cancelado';

export interface ParcelaInfo {
  parcela: number;
  valor_parcela: number;
  total: number;
  descricao: string;
}

export interface OpcoesPagamento {
  valor_total: number;
  pix: {
    forma: 'pix';
    titulo: string;
    valor: number;
    chave_pix: string;
    qrcode_copia_cola: string;
    expiracao: string;
    instrucoes: string;
  };
  cartao_credito: {
    forma: 'cartao_credito';
    titulo: string;
    valor: number;
    max_parcelas: number;
    parcelas: ParcelaInfo[];
    bandeiras_aceitas: string[];
    instrucoes: string;
  };
  cartao_debito: {
    forma: 'cartao_debito';
    titulo: string;
    valor: number;
    bandeiras_aceitas: string[];
    instrucoes: string;
  };
  boleto: {
    forma: 'boleto';
    titulo: string;
    valor: number;
    data_vencimento: string;
    linha_digitavel: string;
    codigo_barras: string;
    instrucoes: string;
  };
}

export interface Pagamento {
  id_pagamento: number;
  id_venda: number;
  forma_pagamento: FormaPagamento;
  valor: number;
  status: StatusPagamento;
  parcelas: number;
  detalhes: string | null;
  data_pagamento: string;
}

// ── Item da Venda ─────────────────────────────────────────────────────────────
export interface ItemVenda {
  id_item?: number;
  id_venda?: number;
  id_produto: number;
  id_variacao?: number | null;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  nome_produto?: string;
  codigo_barras?: string | null;
  cor?: string | null;
  tamanho?: string | null;
}

// ── Venda ────────────────────────────────────────────────────────────────────
export type StatusVenda = 'aberta' | 'finalizada' | 'cancelada';

export interface Venda {
  id_venda: number;
  id_usuario: number;
  id_cliente: number | null;
  data_venda?: string;
  subtotal: number;
  desconto: number;
  total: number;
  status: StatusVenda;
  nome_usuario?: string;
  nome_cliente?: string | null;
  itens?: ItemVenda[];
  pagamento?: Pagamento | null;
}

// ── Relatório de Lucro e Vendas ──────────────────────────────────────────────
export interface ItemVendaComLucro extends ItemVenda {
  preco_custo: number;
  custo_total: number;
  lucro_item: number;
  margem_lucro_item: number;
  frase_resumo: string;
}

export interface VendaComLucroDetalhado extends Venda {
  email_usuario?: string;
  cargo_usuario?: string;
  cpf_cliente?: string | null;
  telefone_cliente?: string | null;
  forma_pagamento?: FormaPagamento | null;
  status_pagamento?: StatusPagamento | null;
  itens: ItemVendaComLucro[];
  custo_total: number;
  lucro_total: number;
  margem_lucro_total: number;
}

export interface RelatorioLucroGeral {
  resumo: {
    total_faturado: number;
    total_custo: number;
    total_lucro: number;
    margem_geral_porcentagem: number;
    quantidade_vendas: number;
  };
  vendas: VendaComLucroDetalhado[];
}

// ── Utilitários ───────────────────────────────────────────────────────────────
export type ApiError = {
  erro?: string;
  message?: string;
};

