import { pool } from '../config/database';

async function setupDatabase(): Promise<void> {
  try {
    console.log('[DB Setup] Verificando e atualizando tabelas no MySQL...');

    // 1. Usuários
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id_usuario   INT AUTO_INCREMENT PRIMARY KEY,
        nome         VARCHAR(100) NOT NULL,
        email        VARCHAR(100) NOT NULL UNIQUE,
        senha_hash   VARCHAR(255) NOT NULL,
        cargo        ENUM('vendedor', 'caixa', 'gerente') NOT NULL,
        ativo        TINYINT(1) NOT NULL DEFAULT 1
      ) ENGINE=InnoDB;
    `);

    // 2. Clientes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id_cliente  INT AUTO_INCREMENT PRIMARY KEY,
        nome        VARCHAR(100) NOT NULL,
        cpf         VARCHAR(14) UNIQUE,
        telefone    VARCHAR(20)
      ) ENGINE=InnoDB;
    `);

    // 3. Categorias
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categorias (
        id_categoria INT AUTO_INCREMENT PRIMARY KEY,
        nome         VARCHAR(50) NOT NULL UNIQUE,
        descricao    VARCHAR(255) NULL,
        ativo        TINYINT(1) NOT NULL DEFAULT 1
      ) ENGINE=InnoDB;
    `);

    // 4. Produtos (Pai)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS produtos (
        id_produto          INT AUTO_INCREMENT PRIMARY KEY,
        id_categoria        INT NULL,
        codigo_barras       VARCHAR(50) UNIQUE,
        nome                VARCHAR(100) NOT NULL,
        tamanho             VARCHAR(10),
        cor                 VARCHAR(30),
        preco_custo         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        preco_unitario      DECIMAL(10,2) NOT NULL,
        quantidade_estoque  INT NOT NULL DEFAULT 0,
        estoque_minimo      INT NOT NULL DEFAULT 5,
        ativo               TINYINT(1) NOT NULL DEFAULT 1,
        FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria) ON DELETE SET NULL,
        CHECK (quantidade_estoque >= 0)
      ) ENGINE=InnoDB;
    `);

    // 5. Variações de Produtos (Grade: Cor e Tamanho)
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

    // 6. Vendas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vendas (
        id_venda    INT AUTO_INCREMENT PRIMARY KEY,
        id_usuario  INT NOT NULL,
        id_cliente  INT NULL,
        data_venda  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        subtotal    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        desconto    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        total       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        status      ENUM('aberta', 'finalizada', 'cancelada') NOT NULL DEFAULT 'aberta',
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
        FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE SET NULL,
        CHECK (desconto >= 0 AND desconto <= subtotal)
      ) ENGINE=InnoDB;
    `);

    // 7. Itens da Venda (suporta id_variacao)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS itens_venda (
        id_item         INT AUTO_INCREMENT PRIMARY KEY,
        id_venda        INT NOT NULL,
        id_produto      INT NOT NULL,
        id_variacao     INT NULL,
        quantidade      INT NOT NULL CHECK (quantidade > 0),
        preco_unitario  DECIMAL(10,2) NOT NULL,
        subtotal        DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (id_venda)       REFERENCES vendas(id_venda),
        FOREIGN KEY (id_produto)     REFERENCES produtos(id_produto),
        FOREIGN KEY (id_variacao)    REFERENCES produto_variacoes(id_variacao) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    // 8. Pagamentos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pagamentos (
        id_pagamento     INT AUTO_INCREMENT PRIMARY KEY,
        id_venda         INT NOT NULL,
        forma_pagamento  ENUM('pix', 'cartao_credito', 'cartao_debito', 'boleto') NOT NULL,
        valor            DECIMAL(10,2) NOT NULL,
        status           ENUM('pendente', 'aprovado', 'recusado', 'cancelado') NOT NULL DEFAULT 'aprovado',
        parcelas         INT NOT NULL DEFAULT 1,
        detalhes         TEXT NULL,
        data_pagamento   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_venda) REFERENCES vendas(id_venda) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    console.log('[DB Setup] Estrutura completa do banco de dados pronta e atualizada!');
  } catch (error) {
    console.error('[DB Setup] Erro ao configurar banco:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

setupDatabase();
