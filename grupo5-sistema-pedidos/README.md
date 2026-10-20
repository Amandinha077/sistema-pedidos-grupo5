# Grupo 5 — Sistema de Pedidos

Starter de integração PostgreSQL entre Grupo 3 (produtor) e Grupo 5 (consumidor), usando Node.js/Express e React/Vite.

## Requisitos
- Node.js 20+
- PostgreSQL
- Credenciais de leitura do banco do Grupo 3 e acesso de escrita ao banco local do Grupo 5

## 1. Banco local
No pgAdmin 4, crie um banco `grupo5_pedidos_db`. Abra o Query Tool desse banco e execute `sql/01_schema_grupo5.sql`.

## 2. Backend
```bash
cd backend
cp .env.example .env
npm install
```
Preencha `backend/.env` com os dados reais dos dois bancos. Não compartilhe nem versione o `.env`.
Inicie:
```bash
npm run dev
```
API: http://localhost:3000
Verificação: http://localhost:3000/api/health

## 3. Frontend
Em outro terminal:
```bash
cd frontend
npm install
npm run dev
```
Abra a URL indicada pelo Vite.

## 4. Executar integração
Na interface, clique em **Sincronizar produtos**. Ou use:
```bash
curl -X POST http://localhost:3000/api/integracoes/produtos/sincronizar
```

## Regras implementadas
- Lê `vw_integracao_produtos` no banco remoto do Grupo 3, sem escrita nele.
- Valida os campos do contrato.
- Usa `id_produto_origem` único para evitar duplicidade.
- Insere novos produtos e atualiza existentes.
- Registra cada execução e os registros rejeitados.
- Produto inativo é importado com `ativo=false`.
- Processamento por registro: uma linha inválida não impede as outras.
- `atualizado_em_origem` é usado para detectar alterações; se a data não avançar, o conteúdo ainda é comparado.

## Importante
O contrato não informa host, porta, banco, usuário, senha nem frequência exata; combine esses dados com o Grupo 3. A view e a coluna `atualizado_em` precisam existir no banco produtor. Se a view não estiver disponível ou o banco estiver inacessível, a execução falha e a API retorna erro. Não coloque credenciais reais no código.
