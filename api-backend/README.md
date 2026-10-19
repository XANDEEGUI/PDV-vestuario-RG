# API PDV Vestuário

Backend de um sistema de Ponto de Venda (PDV) para loja de vestuário desenvolvido em **Node.js**, **TypeScript** e **MySQL**, utilizando a arquitetura **MCR** (Models, Controllers, Routes).

## 🚀 Tecnologias Utilizadas

- **Node.js** com **TypeScript** (ES Modules)
- **Express** para roteamento e middlewares
- **MySQL2** com Connection Pool
- **JWT (jsonwebtoken)** para autenticação e autorização
- **bcryptjs** para hashing de senhas

---

## ⚙️ Configuração do Ambiente

1. Clone o repositório:
   ```bash
   git clone <URL_DO_REPOSITORIO>
   cd api-backend
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Crie o arquivo `.env` na raiz baseado no `.env.example`:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=sua_senha
   DB_NAME=pdv_vestuario
   JWT_SECRET=sua_chave_secreta_jwt
   ```

4. Crie o banco de dados e as tabelas:
   ```bash
   npm run setup:db
   ```

5. Popule os usuários padrão (Gerente, Vendedor, Caixa):
   ```bash
   npm run seed
   ```

6. Inicie o servidor em modo de desenvolvimento:
   ```bash
   npm run dev
   ```

---

## 📌 Rotas Principais

### 🔑 Autenticação
- `POST /api/login` - Autenticação e geração de token JWT
- `GET /api/login/me` - Consulta de dados do usuário logado

### 👥 Clientes
- `GET /api/clientes` - Listagem com busca por nome/CPF/telefone
- `GET /api/clientes/:id` - Detalhes do cliente
- `POST /api/clientes` - Cadastro (validação de CPF único)
- `PUT /api/clientes/:id` - Atualização
- `DELETE /api/clientes/:id` - Exclusão (*restrito a gerente*)

### 👕 Produtos
- `GET /api/produtos` - Listagem com margem de lucro calculada
- `GET /api/produtos/:id` - Detalhes do produto com simulação de opções de pagamento
- `GET /api/produtos/:id/pagamento` - Opções detalhadas de pagamento para a compra do produto
- `GET /api/produtos/alerta-estoque` - Alerta de estoque crítico
- `POST /api/produtos` - Cadastro (validação financeira: `preco_unitario > preco_custo`)
- `PUT /api/produtos/:id` - Atualização
- `DELETE /api/produtos/:id` - Exclusão lógica/desativação (*restrito a gerente*)

### 🛒 Vendas (PDV)
- `POST /api/vendas/abrir` - Abertura de venda vinculada ao operador
- `PUT /api/vendas/:id/cliente` - Vincular/alterar cliente da venda
- `POST /api/vendas/:id/itens` - Adicionar itens com validação de estoque
- `DELETE /api/vendas/:id/itens/:idProduto` - Remover item e recalcular totais
- `POST /api/vendas/:id/desconto` - Aplicação de desconto (*restrito a gerente*)
- `GET /api/vendas/:id` - Detalhes da venda e opções de pagamento disponíveis
- `GET /api/vendas/:id/pagamento` ou `/checkout` - Opções completas de pagamento da venda aberta
- `POST /api/vendas/:id/pagamento` - Registrar/processar pagamento da venda
- `POST /api/vendas/:id/finalizar` - Finalização da venda com baixa de estoque e registro de pagamento
- `POST /api/vendas/:id/cancelar` - Cancelamento com estorno de estoque e cancelamento de pagamento
- `GET /api/vendas` - Histórico detalhado de vendas com dados de pagamento

---

## 💳 Formas de Pagamento Suportadas

O sistema disponibiliza e calcula 4 modalidades de pagamento no momento da compra:

1. **PIX**:
   - Chave Pix do estabelecimento
   - Código Copia e Cola (Payload padrão BR Code EMV)
   - Prazo de expiração (30 min) e aprovação imediata

2. **Cartão de Crédito**:
   - Tabela de parcelamento calculada de 1x até 12x sem juros
   - Bandeiras aceitas: Visa, Mastercard, Elo, Hipercard, Amex

3. **Cartão de Débito**:
   - Pagamento à vista via maquininha/TEF
   - Bandeiras aceitas: Visa Débito, Mastercard Maestro, Elo Débito

4. **Boleto Bancário**:
   - Data de vencimento automática (D+3)
   - Linha digitável e Código de barras simulados para pagamento bancário
