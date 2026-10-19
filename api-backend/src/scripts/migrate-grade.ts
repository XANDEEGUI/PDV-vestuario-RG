import { pool } from '../config/database';

export async function migrateDatabase(): Promise<void> {
  console.log('[Migração] Iniciando reestruturação do banco de dados MySQL...');

  // 1. Criação da tabela de categorias
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categorias (
      id_categoria INT AUTO_INCREMENT PRIMARY KEY,
      nome         VARCHAR(50) NOT NULL UNIQUE,
      descricao    VARCHAR(255) NULL,
      ativo        TINYINT(1) NOT NULL DEFAULT 1
    ) ENGINE=InnoDB;
  `);
  console.log('[Migração] Tabela `categorias` garantida.');

  // Inserir categorias padrão caso ainda não existam
  const categoriasIniciais = [
    { nome: 'Camisas', descricao: 'Camisas sociais, casuais e manga longa' },
    { nome: 'Polos', descricao: 'Camisas polo clássicas e slim' },
    { nome: 'Calças', descricao: 'Calças jeans, alfaiataria e sarja' },
    { nome: 'Alfaiataria', descricao: 'Ternos, blazers e trajes finos' },
    { nome: 'Vestidos', descricao: 'Vestidos e saias de alta costura' },
    { nome: 'Calçados', descricao: 'Sapatos clássicos, mocassins e sapatênis' },
    { nome: 'Acessórios', descricao: 'Cintos, gravatas e carteiras' },
  ];

  for (const cat of categoriasIniciais) {
    await pool.query(
      `INSERT INTO categorias (nome, descricao, ativo)
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE descricao = VALUES(descricao)`,
      [cat.nome, cat.descricao]
    );
  }
  console.log('[Migração] Categorias padrão cadastradas com sucesso.');

  // 2. Adicionar id_categoria na tabela produtos (se ainda não existir)
  try {
    await pool.query(`
      ALTER TABLE produtos
      ADD COLUMN IF NOT EXISTS id_categoria INT NULL AFTER nome,
      ADD CONSTRAINT fk_produtos_categoria
        FOREIGN KEY IF NOT EXISTS (id_categoria) REFERENCES categorias(id_categoria) ON DELETE SET NULL;
    `);
  } catch {
    try {
      await pool.query('ALTER TABLE produtos ADD COLUMN id_categoria INT NULL AFTER nome');
      await pool.query('ALTER TABLE produtos ADD CONSTRAINT fk_produtos_categoria FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria) ON DELETE SET NULL');
    } catch {}
  }
  console.log('[Migração] Coluna `id_categoria` verificada na tabela `produtos`.');

  // 3. Criação da tabela de variações de produtos (Grade: Cor e Tamanho)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS produto_variacoes (
      id_variacao         INT AUTO_INCREMENT PRIMARY KEY,
      id_produto          INT NOT NULL,
      cor                 VARCHAR(30) NOT NULL,
      tamanho             VARCHAR(10) NOT NULL,
      codigo_barras       VARCHAR(50) UNIQUE,
      quantidade_estoque  INT NOT NULL DEFAULT 0,
      ativo               TINYINT(1) NOT NULL DEFAULT 1,
      FOREIGN KEY (id_produto) REFERENCES produtos(id_produto) ON DELETE CASCADE,
      UNIQUE KEY uq_produto_cor_tamanho (id_produto, cor, tamanho)
    ) ENGINE=InnoDB;
  `);
  console.log('[Migração] Tabela `produto_variacoes` garantida.');

  // 4. Migração de dados legados: se existem produtos com cor e tamanho mas sem registro em produto_variacoes
  const [produtosLegados] = await pool.query<any[]>(`
    SELECT p.id_produto, p.codigo_barras, p.cor, p.tamanho, p.quantidade_estoque
    FROM produtos p
    LEFT JOIN produto_variacoes pv ON pv.id_produto = p.id_produto
    WHERE pv.id_variacao IS NULL AND p.ativo = 1;
  `);

  if (Array.isArray(produtosLegados) && produtosLegados.length > 0) {
    console.log(`[Migração] Migrando ${produtosLegados.length} produtos legados para a tabela de variações...`);
    for (const prod of produtosLegados) {
      const cor = prod.cor || 'Padrão';
      const tamanho = prod.tamanho || 'U';
      const cod = prod.codigo_barras || null;
      const qtd = Number(prod.quantidade_estoque) || 0;

      await pool.query(
        `INSERT IGNORE INTO produto_variacoes (id_produto, cor, tamanho, codigo_barras, quantidade_estoque, ativo)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [prod.id_produto, cor, tamanho, cod, qtd]
      );
    }
    console.log('[Migração] Produtos legados migrados para `produto_variacoes`.');
  }

  // 5. Adicionar id_variacao na tabela itens_venda (se não existir)
  try {
    await pool.query(`
      ALTER TABLE itens_venda
      ADD COLUMN IF NOT EXISTS id_variacao INT NULL AFTER id_produto,
      ADD CONSTRAINT fk_itens_venda_variacao
        FOREIGN KEY IF NOT EXISTS (id_variacao) REFERENCES produto_variacoes(id_variacao) ON DELETE SET NULL;
    `);
  } catch {
    try {
      await pool.query('ALTER TABLE itens_venda ADD COLUMN id_variacao INT NULL AFTER id_produto');
      await pool.query('ALTER TABLE itens_venda ADD CONSTRAINT fk_itens_venda_variacao FOREIGN KEY (id_variacao) REFERENCES produto_variacoes(id_variacao) ON DELETE SET NULL');
    } catch {}
  }

  // Ajustar o índice único de itens_venda caso estivesse estritamente em (id_venda, id_produto)
  try {
    await pool.query('ALTER TABLE itens_venda DROP INDEX id_venda');
  } catch {}

  console.log('[Migração] Reestruturação do Banco de Dados concluída com sucesso!');
}

if (require.main === module) {
  migrateDatabase()
    .then(() => pool.end())
    .catch((err) => {
      console.error('[Migração] Erro:', err);
      process.exit(1);
    });
}

