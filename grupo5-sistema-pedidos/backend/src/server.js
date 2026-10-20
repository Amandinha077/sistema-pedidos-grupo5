import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { localPool, producerPool } from './db.js';
import { synchronizeProducts } from './integrationService.js';

dotenv.config();
const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await localPool.query('SELECT 1');
    res.json({ status: 'ok', banco_local: 'conectado' });
  } catch (error) {
    res.status(503).json({ status: 'erro', mensagem: 'Não foi possível conectar ao banco local.' });
  }
});

app.get('/api/produtos', async (_req, res) => {
  try {
    const { rows } = await localPool.query(`
      SELECT produto_id, id_produto_origem, nome, descricao, categoria, preco,
             unidade_medida, ativo, atualizado_em_origem, sincronizado_em
      FROM produtos_integrados
      ORDER BY nome
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ erro: 'Não foi possível consultar os produtos locais.' });
  }
});

app.post('/api/integracoes/produtos/sincronizar', async (_req, res) => {
  try {
    const result = await synchronizeProducts();
    res.json(result);
  } catch (error) {
    console.error('Falha estrutural na integração:', error.message);
    res.status(502).json({
      erro: 'Falha ao consultar a view do Grupo 3 ou iniciar a integração.',
      detalhe: error.message,
      sugestao: 'Verifique host, credenciais, rede e existência de vw_integracao_produtos.'
    });
  }
});

app.get('/api/integracoes', async (_req, res) => {
  try {
    const { rows } = await localPool.query('SELECT * FROM integracoes ORDER BY integracao_id DESC LIMIT 20');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ erro: 'Não foi possível consultar o histórico.' });
  }
});

app.get('/api/integracoes/:id/erros', async (req, res) => {
  try {
    const { rows } = await localPool.query(
      'SELECT * FROM erros_integracao WHERE integracao_id=$1 ORDER BY erro_id',
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ erro: 'Não foi possível consultar os erros.' });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`API Grupo 5 disponível em http://localhost:${port}`));

process.on('SIGINT', async () => {
  await Promise.allSettled([localPool.end(), producerPool.end()]);
  process.exit(0);
});
