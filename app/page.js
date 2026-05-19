'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('home');
  const [wineCollection, setWineCollection] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({ rating: 0, notes: '', tastingDate: '', wouldBuyAgain: null });

  useEffect(() => {
    const stored = localStorage.getItem('wines');
    if (stored) {
      setWineCollection(JSON.parse(stored));
    }
  }, []);

  const handlePhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      const mimeType = dataUrl.split(';')[0].split(':')[1];
      const base64Data = dataUrl.split(',')[1];
      await analyzeWine(base64Data, mimeType);
    };
    reader.readAsDataURL(file);
  };

  const analyzeWine = async (base64Data, mimeType = 'image/jpeg') => {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: base64Data, mimeType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro desconhecido.');
      }

      const { analysis } = data;

      if (analysis && analysis.wine_name) {
        setCurrentAnalysis(analysis);
        setAnalysisResult(true);
        setActiveTab('home');
      } else {
        alert('❌ Não consegui identificar o vinho nesta imagem. Tente outra foto mais clara.');
      }
    } catch (error) {
      console.error(error);
      alert(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addToCollection = () => {
    if (!currentAnalysis) return;

    const exists = wineCollection.some(
      w => w.wine_name.toLowerCase() === currentAnalysis.wine_name.toLowerCase()
    );

    if (!exists) {
      const newWine = {
        ...currentAnalysis,
        dateAdded: new Date().toLocaleDateString('pt-BR')
      };
      const updated = [...wineCollection, newWine];
      setWineCollection(updated);
      localStorage.setItem('wines', JSON.stringify(updated));
      alert('✓ Vinho adicionado à sua coleção!');
      setAnalysisResult(false);
      setCurrentAnalysis(null);
    } else {
      alert('Este vinho já está na sua coleção.');
    }
  };

  const deleteWine = (idx) => {
    if (confirm('Tem certeza que deseja remover este vinho?')) {
      const updated = wineCollection.filter((_, i) => i !== idx);
      setWineCollection(updated);
      localStorage.setItem('wines', JSON.stringify(updated));
    }
  };

  const openFeedback = (idx) => {
    const wine = wineCollection[idx];
    setFeedbackForm({
      rating: wine.feedback?.rating || 0,
      notes: wine.feedback?.notes || '',
      tastingDate: wine.feedback?.tastingDate || new Date().toISOString().split('T')[0],
      wouldBuyAgain: wine.feedback?.wouldBuyAgain ?? null,
    });
    setFeedbackModal(idx);
  };

  const saveFeedback = () => {
    const updated = wineCollection.map((w, i) =>
      i === feedbackModal ? { ...w, feedback: feedbackForm } : w
    );
    setWineCollection(updated);
    localStorage.setItem('wines', JSON.stringify(updated));
    setFeedbackModal(null);
  };

  const formatarData = (isoDate) => {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  };

  const searchResults = wineCollection.filter(w =>
    w.wine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.grape.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const wineExists = currentAnalysis && wineCollection.some(
    w => w.wine_name.toLowerCase() === currentAnalysis.wine_name.toLowerCase()
  );

  const Estrelas = ({ nota, interativo = false, aoSelecionar }) => (
    <div style={{ display: 'flex', gap: '4px' }}>
      {[1, 2, 3, 4, 5].map(estrela => (
        <span
          key={estrela}
          onClick={interativo ? () => aoSelecionar(estrela) : undefined}
          style={{
            fontSize: interativo ? '32px' : '14px',
            cursor: interativo ? 'pointer' : 'default',
            color: estrela <= nota ? '#FFB800' : '#ddd',
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          ★
        </span>
      ))}
    </div>
  );

  const CardVinho = ({ vinho, idx, exibirBotoes }) => (
    <div className="wine-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div style={{ flex: 1 }}>
          <p className="wine-name">{vinho.wine_name}</p>
          <p className="wine-detail">{vinho.wine_type} • {vinho.region}</p>
          <p className="wine-detail">🍇 {vinho.grape}</p>
          <p className="wine-detail" style={{ fontSize: '12px', marginTop: '8px' }}>
            Adicionado em {vinho.dateAdded}
          </p>
        </div>
        {exibirBotoes && (
          <button className="btn-delete" onClick={() => deleteWine(idx)}>✕</button>
        )}
      </div>

      {vinho.feedback && (
        <div className="resumo-degustacao">
          {vinho.feedback.rating > 0 && (
            <Estrelas nota={vinho.feedback.rating} />
          )}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
            {vinho.feedback.tastingDate && (
              <span className="etiqueta">📅 {formatarData(vinho.feedback.tastingDate)}</span>
            )}
            {vinho.feedback.wouldBuyAgain === true && (
              <span className="etiqueta etiqueta-sim">✓ Compraria novamente</span>
            )}
            {vinho.feedback.wouldBuyAgain === false && (
              <span className="etiqueta etiqueta-nao">✗ Não compraria</span>
            )}
          </div>
          {vinho.feedback.notes && (
            <p style={{ fontSize: '13px', color: '#555', margin: '6px 0 0', lineHeight: 1.4 }}>
              "{vinho.feedback.notes}"
            </p>
          )}
        </div>
      )}

      {exibirBotoes && (
        <button className="btn-degustacao" onClick={() => openFeedback(idx)}>
          {vinho.feedback ? '✏️ Editar degustação' : '+ Registrar degustação'}
        </button>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: '380px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #f9f9f9; }
        .tab-nav {
          display: flex;
          border-bottom: 0.5px solid #e5e5e5;
          background: white;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .tab-btn {
          flex: 1;
          padding: 12px;
          text-align: center;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          font-size: 14px;
          color: #999;
          transition: all 0.2s;
        }
        .tab-btn.active { color: #000; border-bottom-color: #000; }
        .tab-content { display: none; padding: 16px 12px; background: white; min-height: 300px; }
        .tab-content.active { display: block; }
        .wine-card {
          background: white;
          border: 0.5px solid #e5e5e5;
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 12px;
        }
        .wine-name { font-weight: 500; font-size: 15px; margin: 0 0 8px 0; }
        .wine-detail { font-size: 13px; color: #666; margin: 4px 0; }
        .btn-upload {
          width: 100%;
          padding: 12px;
          background: #007AFF;
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-size: 14px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 500;
        }
        .btn-upload:hover { background: #0051d5; }
        .btn-delete {
          font-size: 12px;
          color: #ff3b30;
          cursor: pointer;
          background: transparent;
          border: none;
          padding: 4px 8px;
          flex-shrink: 0;
        }
        .stat-box {
          background: #f5f5f5;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 12px;
          text-align: center;
        }
        .stat-label { font-size: 12px; color: #999; margin-bottom: 4px; }
        .stat-number { font-size: 24px; font-weight: 500; color: #000; }
        .result-box {
          background: #f5f5f5;
          border-radius: 12px;
          padding: 16px;
          margin: 12px 0;
        }
        .result-title { font-size: 16px; font-weight: 500; margin-bottom: 8px; }
        .badge { padding: 10px; border-radius: 8px; text-align: center; font-size: 13px; margin-top: 12px; }
        .badge-new { background: #e3f2fd; color: #1976d2; }
        .badge-exists { background: #fff3e0; color: #f57c00; }
        .btn-primary {
          width: 100%;
          padding: 12px;
          background: transparent;
          border: 0.5px solid #ccc;
          border-radius: 12px;
          cursor: pointer;
          font-size: 14px;
          color: #007AFF;
          margin-top: 12px;
          font-weight: 500;
        }
        .btn-primary:hover { background: #f5f5f5; }
        input[type="file"] { display: none; }
        input[type="text"] {
          width: 100%;
          padding: 10px;
          border: 0.5px solid #e5e5e5;
          border-radius: 8px;
          margin-bottom: 12px;
          font-size: 14px;
        }
        .empty-state { text-align: center; color: #999; font-size: 14px; padding: 20px 0; }
        .loading { text-align: center; color: #999; padding: 20px; }
        .btn-degustacao {
          display: inline-block;
          margin-top: 10px;
          font-size: 12px;
          color: #007AFF;
          background: transparent;
          border: 0.5px solid #007AFF;
          border-radius: 8px;
          padding: 5px 12px;
          cursor: pointer;
          font-family: inherit;
        }
        .resumo-degustacao {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 0.5px solid #f0f0f0;
        }
        .etiqueta {
          font-size: 11px;
          color: #666;
          background: #f5f5f5;
          border-radius: 4px;
          padding: 2px 7px;
        }
        .etiqueta-sim { background: #e8f5e9; color: #2e7d32; }
        .etiqueta-nao { background: #fce4ec; color: #c2185b; }
        .modal-fundo {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.45);
          z-index: 100;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .modal-painel {
          background: white;
          border-radius: 20px 20px 0 0;
          padding: 20px 16px 36px;
          width: 100%;
          max-width: 380px;
          max-height: 88vh;
          overflow-y: auto;
        }
        .modal-alca {
          width: 36px;
          height: 4px;
          background: #ddd;
          border-radius: 2px;
          margin: 0 auto 16px;
        }
        .modal-titulo { font-size: 17px; font-weight: 600; margin-bottom: 20px; text-align: center; }
        .modal-rotulo { font-size: 13px; color: #666; margin-bottom: 8px; display: block; }
        .modal-secao { margin-bottom: 20px; }
        textarea {
          width: 100%;
          padding: 10px;
          border: 0.5px solid #e5e5e5;
          border-radius: 8px;
          font-size: 14px;
          resize: none;
          font-family: inherit;
          line-height: 1.5;
        }
        input[type="date"] {
          width: 100%;
          padding: 10px;
          border: 0.5px solid #e5e5e5;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
        }
        .grupo-toggle { display: flex; gap: 8px; }
        .btn-toggle {
          flex: 1;
          padding: 10px;
          border: 0.5px solid #e5e5e5;
          border-radius: 8px;
          background: transparent;
          cursor: pointer;
          font-size: 14px;
          font-family: inherit;
        }
        .btn-toggle-sim.ativo { background: #e8f5e9; border-color: #4caf50; color: #2e7d32; font-weight: 500; }
        .btn-toggle-nao.ativo { background: #fce4ec; border-color: #e91e63; color: #c2185b; font-weight: 500; }
        .btn-salvar {
          width: 100%;
          padding: 14px;
          background: #000;
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-size: 15px;
          font-weight: 500;
          margin-bottom: 8px;
          font-family: inherit;
        }
        .btn-cancelar {
          width: 100%;
          padding: 12px;
          background: transparent;
          color: #666;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-family: inherit;
        }
      `}</style>

      <div className="tab-nav">
        <button className={`tab-btn ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          🏠 Início
        </button>
        <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          📜 Histórico
        </button>
        <button className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}>
          🔍 Buscar
        </button>
      </div>

      <div className={`tab-content ${activeTab === 'home' ? 'active' : ''}`}>
        <div className="stat-box">
          <div className="stat-label">Vinhos catalogados</div>
          <div className="stat-number">{wineCollection.length}</div>
        </div>

        <label className="btn-upload" style={{ cursor: 'pointer' }}>
          📷 Fotografar vinho
          <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} disabled={loading} />
        </label>

        <label className="btn-upload" style={{ cursor: 'pointer' }}>
          🖼️ Escolher da galeria
          <input type="file" accept="image/*" onChange={handlePhoto} disabled={loading} />
        </label>

        {loading && <div className="loading">🔍 Analisando imagem com IA...</div>}

        {analysisResult && currentAnalysis && (
          <div>
            <div className="result-box">
              <div className="result-title">{currentAnalysis.wine_name}</div>
              <div className="wine-detail">🍷 Tipo: {currentAnalysis.wine_type}</div>
              <div className="wine-detail">📍 Região: {currentAnalysis.region}</div>
              <div className="wine-detail">🍇 Uva: {currentAnalysis.grape}</div>
              <div className={`badge ${wineExists ? 'badge-exists' : 'badge-new'}`}>
                {wineExists ? '✓ Você já provou este vinho!' : 'Novo vinho descoberto!'}
              </div>
            </div>
            <button className="btn-primary" onClick={addToCollection}>
              ➕ Adicionar à minha coleção
            </button>
          </div>
        )}
      </div>

      <div className={`tab-content ${activeTab === 'history' ? 'active' : ''}`}>
        {wineCollection.length === 0 ? (
          <div className="empty-state">Nenhum vinho catalogado ainda. Comece fotografando um!</div>
        ) : (
          wineCollection.map((vinho, idx) => (
            <CardVinho key={idx} vinho={vinho} idx={idx} exibirBotoes={true} />
          ))
        )}
      </div>

      <div className={`tab-content ${activeTab === 'search' ? 'active' : ''}`}>
        <input
          type="text"
          placeholder="Digite o nome do vinho..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchResults.length === 0 ? (
          <div className="empty-state">
            {searchQuery ? 'Nenhum resultado encontrado.' : 'Comece a digitar...'}
          </div>
        ) : (
          searchResults.map((vinho, idx) => (
            <CardVinho key={idx} vinho={vinho} idx={idx} exibirBotoes={false} />
          ))
        )}
      </div>

      {feedbackModal !== null && (
        <div className="modal-fundo" onClick={() => setFeedbackModal(null)}>
          <div className="modal-painel" onClick={e => e.stopPropagation()}>
            <div className="modal-alca" />
            <div className="modal-titulo">Registrar degustação</div>

            <div className="modal-secao">
              <span className="modal-rotulo">Avaliação</span>
              <Estrelas
                nota={feedbackForm.rating}
                interativo
                aoSelecionar={(v) => setFeedbackForm(f => ({ ...f, rating: v }))}
              />
            </div>

            <div className="modal-secao">
              <span className="modal-rotulo">Data da degustação</span>
              <input
                type="date"
                value={feedbackForm.tastingDate}
                onChange={e => setFeedbackForm(f => ({ ...f, tastingDate: e.target.value }))}
              />
            </div>

            <div className="modal-secao">
              <span className="modal-rotulo">Notas de degustação</span>
              <textarea
                rows={4}
                placeholder="Descreva o aroma, sabor, textura..."
                value={feedbackForm.notes}
                onChange={e => setFeedbackForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div className="modal-secao">
              <span className="modal-rotulo">Compraria novamente?</span>
              <div className="grupo-toggle">
                <button
                  className={`btn-toggle btn-toggle-sim ${feedbackForm.wouldBuyAgain === true ? 'ativo' : ''}`}
                  onClick={() => setFeedbackForm(f => ({ ...f, wouldBuyAgain: true }))}
                >
                  Sim
                </button>
                <button
                  className={`btn-toggle btn-toggle-nao ${feedbackForm.wouldBuyAgain === false ? 'ativo' : ''}`}
                  onClick={() => setFeedbackForm(f => ({ ...f, wouldBuyAgain: false }))}
                >
                  Não
                </button>
              </div>
            </div>

            <button className="btn-salvar" onClick={saveFeedback}>Salvar</button>
            <button className="btn-cancelar" onClick={() => setFeedbackModal(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
