-- Execute no banco local do Grupo 5 (ex.: grupo5_pedidos_db).
CREATE TABLE IF NOT EXISTS produtos_integrados (
    produto_id BIGSERIAL PRIMARY KEY,
    id_produto_origem INTEGER NOT NULL UNIQUE,
    nome VARCHAR(120) NOT NULL,
    descricao VARCHAR(500),
    categoria VARCHAR(100) NOT NULL,
    preco NUMERIC(12,2) NOT NULL CHECK (preco > 0),
    unidade_medida VARCHAR(20) NOT NULL,
    ativo BOOLEAN NOT NULL,
    atualizado_em_origem TIMESTAMPTZ NOT NULL,
    sincronizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedidos (
    pedido_id BIGSERIAL PRIMARY KEY,
    numero_pedido VARCHAR(40) NOT NULL UNIQUE,
    cliente_nome VARCHAR(160) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE'
        CHECK (status IN ('PENDENTE','CONFIRMADO','CANCELADO','CONCLUIDO')),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS itens_pedido (
    item_pedido_id BIGSERIAL PRIMARY KEY,
    pedido_id BIGINT NOT NULL REFERENCES pedidos(pedido_id) ON DELETE CASCADE,
    produto_id BIGINT NOT NULL REFERENCES produtos_integrados(produto_id),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    preco_unitario NUMERIC(12,2) NOT NULL CHECK (preco_unitario > 0),
    UNIQUE (pedido_id, produto_id)
);

CREATE TABLE IF NOT EXISTS integracoes (
    integracao_id BIGSERIAL PRIMARY KEY,
    data_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    data_fim TIMESTAMPTZ,
    sistema_origem VARCHAR(80) NOT NULL DEFAULT 'Grupo 3 - Sistema de Produtos',
    sistema_destino VARCHAR(80) NOT NULL DEFAULT 'Grupo 5 - Sistema de Pedidos',
    total_registros INTEGER NOT NULL DEFAULT 0,
    processados INTEGER NOT NULL DEFAULT 0,
    inseridos INTEGER NOT NULL DEFAULT 0,
    atualizados INTEGER NOT NULL DEFAULT 0,
    rejeitados INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'EM_ANDAMENTO'
);

CREATE TABLE IF NOT EXISTS erros_integracao (
    erro_id BIGSERIAL PRIMARY KEY,
    integracao_id BIGINT REFERENCES integracoes(integracao_id) ON DELETE SET NULL,
    registro_origem TEXT,
    campo VARCHAR(100),
    tipo_erro VARCHAR(60) NOT NULL,
    descricao TEXT NOT NULL,
    data_ocorrencia TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Estrutura para futura integração de saída com o Grupo 7.
-- Ajustar o contrato de saída conjuntamente com o Grupo 7 antes de conceder acesso.
CREATE OR REPLACE VIEW vw_integracao_pedidos AS
SELECT
    p.pedido_id,
    p.numero_pedido,
    p.cliente_nome,
    p.status,
    p.criado_em
FROM pedidos p;
