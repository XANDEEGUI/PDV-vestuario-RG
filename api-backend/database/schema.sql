CREATE DATABASE IF NOT EXISTS pdv_vestuario CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pdv_vestuario;

CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario   INT AUTO_INCREMENT PRIMARY KEY,
    nome         VARCHAR(100) NOT NULL,
    email        VARCHAR(100) NOT NULL UNIQUE,
    senha_hash   VARCHAR(255) NOT NULL,
    cargo        ENUM('vendedor', 'caixa', 'gerente') NOT NULL,
    ativo        TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS clientes (
    id_cliente  INT AUTO_INCREMENT PRIMARY KEY,
    nome        VARCHAR(100) NOT NULL,
    cpf         VARCHAR(14) UNIQUE,
    telefone    VARCHAR(20)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS produtos (
    id_produto          INT AUTO_INCREMENT PRIMARY KEY,
    codigo_barras       VARCHAR(50) UNIQUE,
    nome                VARCHAR(100) NOT NULL,
    tamanho             VARCHAR(5),
    cor                 VARCHAR(30),
    preco_custo         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    preco_unitario      DECIMAL(10,2) NOT NULL,
    quantidade_estoque  INT NOT NULL DEFAULT 0,
    estoque_minimo      INT NOT NULL DEFAULT 5,
    ativo               TINYINT(1) NOT NULL DEFAULT 1,
    CHECK (quantidade_estoque >= 0)
) ENGINE=InnoDB;

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

CREATE TABLE IF NOT EXISTS itens_venda (
    id_item         INT AUTO_INCREMENT PRIMARY KEY,
    id_venda        INT NOT NULL,
    id_produto      INT NOT NULL,
    quantidade      INT NOT NULL CHECK (quantidade > 0),
    preco_unitario  DECIMAL(10,2) NOT NULL,
    subtotal        DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (id_venda)   REFERENCES vendas(id_venda),
    FOREIGN KEY (id_produto) REFERENCES produtos(id_produto),
    UNIQUE (id_venda, id_produto)
) ENGINE=InnoDB;

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
