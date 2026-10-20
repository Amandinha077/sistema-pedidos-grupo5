import { localPool, producerPool } from './db.js';

function validateProduct(p) {
  const errors = [];
  const id = Number(p.id_produto);
  if (!Number.isInteger(id) || id <= 0) errors.push(['id_produto', 'CAMPO_INVALIDO', 'id_produto deve ser inteiro positivo.']);
  if (typeof p.nome !== 'string' || !p.nome.trim()) errors.push(['nome', 'OBRIGATORIO_INVALIDO', 'Nome vazio ou inválido.']);
  if (typeof p.categoria !== 'string' || !p.categoria.trim()) errors.push(['categoria', 'OBRIGATORIO_INVALIDO', 'Categoria vazia ou inválida.']);
  if (typeof p.preco !== 'string' && typeof p.preco !== 'number') errors.push(['preco', 'TIPO_INVALIDO', 'Preço ausente ou com tipo inválido.']);
  const price = Number(p.preco);
  if (!Number.isFinite(price) || price <= 0) errors.push(['preco', 'PRECO_INVALIDO', 'Preço deve ser maior que zero.']);
  if (typeof p.unidade_medida !== 'string' || !p.unidade_medida.trim()) errors.push(['unidade_medida', 'OBRIGATORIO_INVALIDO', 'Unidade de medida vazia ou inválida.']);
  if (typeof p.ativo !== 'boolean') errors.push(['ativo', 'TIPO_INVALIDO', 'ativo deve ser booleano.']);
  const date = new Date(p.atualizado_em);
  if (!p.atualizado_em || Number.isNaN(date.getTime())) errors.push(['atualizado_em', 'DATA_INVALIDA', 'Data de atualização ausente ou inválida.']);
  if (p.nome?.length > 120) errors.push(['nome', 'TAMANHO_EXCEDIDO', 'Nome excede 120 caracteres.']);
  if (p.descricao != null && (typeof p.descricao !== 'string' || p.descricao.length > 500)) errors.push(['descricao', 'TAMANHO_OU_TIPO_INVALIDO', 'Descrição deve ter até 500 caracteres ou ser NULL.']);
  if (p.categoria?.length > 100) errors.push(['categoria', 'TAMANHO_EXCEDIDO', 'Categoria excede 100 caracteres.']);
  if (p.unidade_medida?.length > 20) errors.push(['unidade_medida', 'TAMANHO_EXCEDIDO', 'Unidade de medida excede 20 caracteres.']);
  return errors;
}

export async function synchronizeProducts() {
  // Falha estrutural/conectividade impede a integração; os registros inválidos são tratados individualmente.
  const sourceResult = await producerPool.query(`
    SELECT id_produto, nome, descricao, categoria, preco,
           unidade_medida, ativo, atualizado_em
    FROM vw_integracao_produtos
    ORDER BY id_produto
  `);
  const products = sourceResult.rows;

  const runResult = await localPool.query(`
    INSERT INTO integracoes (total_registros, status)
    VALUES ($1, 'EM_ANDAMENTO')
    RETURNING integracao_id
  `, [products.length]);
  const integrationId = runResult.rows[0].integracao_id;

  const report = {
    integracao_id: integrationId,
    total_consultado: products.length,
    inseridos: 0,
    atualizados: 0,
    rejeitados: 0,
    erros: []
  };

  for (const p of products) {
    const errors = validateProduct(p);
    if (errors.length) {
      report.rejeitados++;
      for (const [field, type, description] of errors) {
        await localPool.query(`
          INSERT INTO erros_integracao
            (integracao_id, registro_origem, campo, tipo_erro, descricao)
          VALUES ($1, $2, $3, $4, $5)
        `, [integrationId, String(p.id_produto ?? 'desconhecido'), field, type, description]);
        report.erros.push({ id_produto: p.id_produto ?? null, campo: field, tipo_erro: type, descricao: description });
      }
      continue;
    }

    const client = await localPool.connect();
    try {
      await client.query('BEGIN');
      const existing = await client.query(
        `SELECT produto_id, nome, descricao, categoria, preco, unidade_medida, ativo, atualizado_em_origem
         FROM produtos_integrados WHERE id_produto_origem = $1 FOR UPDATE`,
        [Number(p.id_produto)]
      );

      const values = [
        Number(p.id_produto), p.nome.trim(), p.descricao ?? null,
        p.categoria.trim(), Number(p.preco), p.unidade_medida.trim(),
        p.ativo, new Date(p.atualizado_em).toISOString()
      ];

      if (existing.rowCount === 0) {
        await client.query(`
          INSERT INTO produtos_integrados
            (id_produto_origem, nome, descricao, categoria, preco, unidade_medida, ativo, atualizado_em_origem, sincronizado_em)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
        `, values);
        report.inseridos++;
      } else {
        const old = existing.rows[0];
        const changed =
          old.nome !== values[1] ||
          old.descricao !== values[2] ||
          old.categoria !== values[3] ||
          Number(old.preco) !== values[4] ||
          old.unidade_medida !== values[5] ||
          old.ativo !== values[6] ||
          new Date(old.atualizado_em_origem).getTime() !== new Date(values[7]).getTime();

        if (changed) {
          await client.query(`
            UPDATE produtos_integrados
            SET nome=$2, descricao=$3, categoria=$4, preco=$5, unidade_medida=$6,
                ativo=$7, atualizado_em_origem=$8, sincronizado_em=NOW()
            WHERE id_produto_origem=$1
          `, values);
          report.atualizados++;
        }
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      report.rejeitados++;
      const description = err.message || 'Erro desconhecido durante o processamento.';
      await localPool.query(`
        INSERT INTO erros_integracao
          (integracao_id, registro_origem, campo, tipo_erro, descricao)
        VALUES ($1, $2, NULL, 'ERRO_PROCESSAMENTO', $3)
      `, [integrationId, String(p.id_produto), description]);
      report.erros.push({ id_produto: p.id_produto, tipo_erro: 'ERRO_PROCESSAMENTO', descricao: description });
    } finally {
      client.release();
    }
  }

  const processed = report.inseridos + report.atualizados;
  const status = report.rejeitados > 0 ? 'CONCLUIDA_COM_ERROS' : 'CONCLUIDA';
  await localPool.query(`
    UPDATE integracoes
    SET data_fim=NOW(), processados=$2, inseridos=$3, atualizados=$4,
        rejeitados=$5, status=$6
    WHERE integracao_id=$1
  `, [integrationId, processed, report.inseridos, report.atualizados, report.rejeitados, status]);

  return { ...report, processados: processed, status };
}
