import React from 'react';
import { useEffect, useState } from 'react';

const API = 'http://localhost:3000/api';

export default function App() {
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [report, setReport] = useState(null);

  async function load() {
    try {
      const [p, h] = await Promise.all([fetch(`${API}/produtos`), fetch(`${API}/integracoes`)]);
      if (!p.ok || !h.ok) throw new Error('API indisponível');
      setProducts(await p.json());
      setHistory(await h.json());
    } catch {
      setMessage('Não foi possível acessar a API. Confira se o backend está rodando em localhost:3000.');
    }
  }

  useEffect(() => { load(); }, []);

  async function sync() {
    setLoading(true); setMessage('Executando integração com o Grupo 3...'); setReport(null);
    try {
      const response = await fetch(`${API}/integracoes/produtos/sincronizar`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detalhe || data.erro || 'Falha na integração');
      setReport(data);
      setMessage(`Integração ${data.status === 'CONCLUIDA' ? 'concluída' : 'finalizada com ocorrências'}.`);
      await load();
    } catch (error) {
      setMessage(`Erro: ${error.message}`);
    } finally { setLoading(false); }
  }

  return <main className="shell">
    <header className="hero">
      <div className="eyebrow">INTEGRAÇÃO DE APLICAÇÕES · POSTGRESQL</div>
      <h1>Sistema de <span>Pedidos</span></h1>
      <p>Grupo 5 · Sincronização de produtos do Grupo 3</p>
      <button onClick={sync} disabled={loading}>{loading ? 'Sincronizando...' : '↻ Sincronizar produtos'}</button>
    </header>

    {message && <div className="notice" role="status">{message}</div>}
    {report && <section className="stats">
      <Stat label="Consultados" value={report.total_consultado}/>
      <Stat label="Inseridos" value={report.inseridos}/>
      <Stat label="Atualizados" value={report.atualizados}/>
      <Stat label="Rejeitados" value={report.rejeitados}/>
    </section>}

    <section className="panel">
      <div className="section-head"><div><div className="eyebrow">CATÁLOGO LOCAL</div><h2>Produtos integrados</h2></div><span className="count">{products.length} produtos</span></div>
      <div className="table-wrap"><table><thead><tr>
        <th>ID origem</th><th>Produto</th><th>Categoria</th><th>Preço</th><th>Unidade</th><th>Status</th><th>Atualizado na origem</th>
      </tr></thead><tbody>
        {products.map(p => <tr key={p.id_produto_origem}>
          <td>#{p.id_produto_origem}</td><td><strong>{p.nome}</strong><small>{p.descricao || 'Sem descrição'}</small></td>
          <td>{p.categoria}</td><td>{Number(p.preco).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
          <td>{p.unidade_medida}</td><td><span className={`pill ${p.ativo ? 'active' : 'inactive'}`}>{p.ativo ? 'Ativo' : 'Inativo'}</span></td>
          <td>{new Date(p.atualizado_em_origem).toLocaleString('pt-BR')}</td>
        </tr>)}
        {!products.length && <tr><td colSpan="7" className="empty">Nenhum produto integrado ainda. Execute a sincronização.</td></tr>}
      </tbody></table></div>
    </section>

    <section className="panel">
      <div className="section-head"><div><div className="eyebrow">AUDITORIA</div><h2>Histórico de integrações</h2></div></div>
      <div className="table-wrap"><table><thead><tr><th>ID</th><th>Início</th><th>Consultados</th><th>Processados</th><th>Rejeitados</th><th>Status</th></tr></thead><tbody>
        {history.map(h => <tr key={h.integracao_id}><td>#{h.integracao_id}</td><td>{new Date(h.data_inicio).toLocaleString('pt-BR')}</td><td>{h.total_registros}</td><td>{h.processados}</td><td>{h.rejeitados}</td><td>{h.status}</td></tr>)}
        {!history.length && <tr><td colSpan="6" className="empty">Nenhuma execução registrada.</td></tr>}
      </tbody></table></div>
    </section>
    <footer>Grupo 5 · Sistema de Pedidos · Banco local independente</footer>
  </main>;
}

function Stat({label,value}) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong></div>;
}
