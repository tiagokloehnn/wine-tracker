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
  const [mounted, setMounted] = useState(false);
  const [cookieConsent, setCookieConsent] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('wines');
    if (stored) setWineCollection(JSON.parse(stored));
    setCookieConsent(localStorage.getItem('lgpd_consent'));
    setMounted(true);
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('lgpd_consent', 'accepted');
    setCookieConsent('accepted');
  };

  const resizeImage = (dataUrl) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1024;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else { width = Math.round(width * MAX / height); height = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = dataUrl;
  });

  const handlePhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const resized = await resizeImage(e.target.result);
      await analyzeWine(resized.split(',')[1], 'image/jpeg');
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
      const rawText = await response.text();
      let data;
      try { data = JSON.parse(rawText); }
      catch { throw new Error(`Resposta inválida do servidor (HTTP ${response.status}): ${rawText.slice(0, 200)}`); }
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      const { analysis } = data;
      if (analysis && analysis.wine_name) {
        setCurrentAnalysis(analysis);
        setAnalysisResult(true);
        setActiveTab('home');
      } else {
        alert('❌ Não consegui identificar o vinho. Tente uma foto mais nítida do rótulo.');
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
    const exists = wineCollection.some(w => w.wine_name.toLowerCase() === currentAnalysis.wine_name.toLowerCase());
    if (exists) { alert('Este vinho já está na sua coleção.'); return; }
    const updated = [...wineCollection, { ...currentAnalysis, dateAdded: new Date().toLocaleDateString('pt-BR') }];
    setWineCollection(updated);
    localStorage.setItem('wines', JSON.stringify(updated));
    setAnalysisResult(false);
    setCurrentAnalysis(null);
    setActiveTab('collection');
  };

  const deleteWine = (idx) => {
    if (confirm('Remover este vinho da coleção?')) {
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
    const updated = wineCollection.map((w, i) => i === feedbackModal ? { ...w, feedback: feedbackForm } : w);
    setWineCollection(updated);
    localStorage.setItem('wines', JSON.stringify(updated));
    setFeedbackModal(null);
  };

  const formatarData = (isoDate) => {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  };

  const total = wineCollection.length;
  const byType = wineCollection.reduce((acc, w) => { acc[w.wine_type] = (acc[w.wine_type] || 0) + 1; return acc; }, {});
  const withRating = wineCollection.filter(w => w.feedback?.rating > 0);
  const avgRating = withRating.length ? withRating.reduce((s, w) => s + w.feedback.rating, 0) / withRating.length : 0;
  const ratedCount = wineCollection.filter(w => w.feedback?.wouldBuyAgain != null).length;
  const wouldBuyCount = wineCollection.filter(w => w.feedback?.wouldBuyAgain === true).length;
  const regionCount = wineCollection.reduce((acc, w) => { if (w.region) acc[w.region] = (acc[w.region] || 0) + 1; return acc; }, {});
  const topRegions = Object.entries(regionCount).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const searchResults = wineCollection.filter(w =>
    w.wine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (w.region || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (w.grape || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const wineExists = currentAnalysis && wineCollection.some(w => w.wine_name.toLowerCase() === currentAnalysis.wine_name.toLowerCase());

  const typeBadgeClass = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('tinto')) return 'badge-tinto';
    if (t.includes('branco')) return 'badge-branco';
    if (t.includes('ros')) return 'badge-rose';
    if (t.includes('espumante')) return 'badge-espumante';
    return 'badge-outro';
  };

  const Estrelas = ({ nota, interativo = false, aoSelecionar }) => (
    <div style={{ display: 'flex', gap: '3px' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} onClick={interativo ? () => aoSelecionar(n) : undefined}
          style={{ fontSize: interativo ? '30px' : '14px', cursor: interativo ? 'pointer' : 'default', color: n <= nota ? '#C9A96E' : '#ddd', userSelect: 'none', lineHeight: 1 }}>
          ★
        </span>
      ))}
    </div>
  );

  const CardVinho = ({ vinho, idx, exibirBotoes }) => (
    <div className="wine-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <p className="wine-name">{vinho.wine_name}</p>
          <span className={`type-badge ${typeBadgeClass(vinho.wine_type)}`}>{vinho.wine_type}</span>
          <p className="wine-detail" style={{ marginTop: '8px' }}>📍 {vinho.region}</p>
          <p className="wine-detail">🍇 {vinho.grape}</p>
          <p className="wine-detail" style={{ fontSize: '11px', color: '#bbb', marginTop: '4px' }}>Adicionado em {vinho.dateAdded}</p>
        </div>
        {exibirBotoes && <button className="btn-delete" onClick={() => deleteWine(idx)}>✕</button>}
      </div>
      {vinho.feedback && (
        <div className="resumo-degustacao">
          {vinho.feedback.rating > 0 && <Estrelas nota={vinho.feedback.rating} />}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
            {vinho.feedback.tastingDate && <span className="etiqueta">📅 {formatarData(vinho.feedback.tastingDate)}</span>}
            {vinho.feedback.wouldBuyAgain === true && <span className="etiqueta etiqueta-sim">✓ Compraria</span>}
            {vinho.feedback.wouldBuyAgain === false && <span className="etiqueta etiqueta-nao">✗ Não compraria</span>}
          </div>
          {vinho.feedback.notes && <p style={{ fontSize: '13px', color: '#777', margin: '8px 0 0', lineHeight: 1.5, fontStyle: 'italic' }}>"{vinho.feedback.notes}"</p>}
        </div>
      )}
      {exibirBotoes && (
        <button className="btn-degustacao" onClick={() => openFeedback(idx)}>
          {vinho.feedback ? '✏️ Editar degustação' : '+ Registrar degustação'}
        </button>
      )}
    </div>
  );

  if (!mounted) return null;

  return (
    <div className="app-container">

      <div className="app-header">
        <span className="header-logo">🍷</span>
        <div>
          <div className="header-title">Wine Tracker</div>
          <div className="header-sub">Sua adega pessoal</div>
        </div>
      </div>

      <div className="tab-nav">
        {[
          { id: 'home', icon: '🏠', label: 'Início' },
          { id: 'stats', icon: '📊', label: 'Painel' },
          { id: 'collection', icon: '🗂️', label: 'Coleção' },
          { id: 'search', icon: '🔍', label: 'Buscar' },
        ].map(tab => (
          <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── INÍCIO ── */}
      {activeTab === 'home' && (
        <div className="tab-content">
          {!analysisResult && !loading && wineCollection.length === 0 && (
            <div className="hero">
              <div className="hero-icon">🍾</div>
              <h2 className="hero-title">Bem-vindo ao Wine Tracker</h2>
              <p className="hero-sub">Fotografe o rótulo de qualquer vinho e nossa IA identifica tudo para você.</p>
            </div>
          )}

          {!analysisResult && (
            <div className="upload-group">
              <label className="btn-upload">
                <span>📷</span> Fotografar rótulo
                <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} disabled={loading} />
              </label>
              <label className="btn-upload btn-upload-alt">
                <span>🖼️</span> Escolher da galeria
                <input type="file" accept="image/*" onChange={handlePhoto} disabled={loading} />
              </label>
            </div>
          )}

          {loading && (
            <div className="loading-box">
              <div className="loading-emoji">🍷</div>
              <p className="loading-text">Analisando o rótulo com IA...</p>
              <p className="loading-sub">Isso pode levar alguns segundos</p>
            </div>
          )}

          {analysisResult && currentAnalysis && (
            <div>
              <div className="result-card">
                <div className="result-top">
                  <span style={{ fontSize: '36px' }}>🍾</span>
                  <div style={{ flex: 1 }}>
                    <div className="result-name">{currentAnalysis.wine_name}</div>
                    <span className={`type-badge ${typeBadgeClass(currentAnalysis.wine_type)}`}>{currentAnalysis.wine_type}</span>
                  </div>
                </div>
                <div className="result-details">
                  <div className="detail-row"><span className="detail-icon">📍</span><span><strong>Região</strong><br />{currentAnalysis.region}</span></div>
                  <div className="detail-row"><span className="detail-icon">🍇</span><span><strong>Uva</strong><br />{currentAnalysis.grape}</span></div>
                  <div className="detail-row"><span className="detail-icon">🎯</span><span><strong>Confiança</strong><br />{currentAnalysis.confidence}</span></div>
                </div>
                <div className={`status-pill ${wineExists ? 'pill-exists' : 'pill-new'}`}>
                  {wineExists ? '✓ Já está na sua coleção' : '✨ Novo vinho descoberto!'}
                </div>
              </div>
              {!wineExists && (
                <button className="btn-primary" onClick={addToCollection}>➕ Adicionar à minha coleção</button>
              )}
              <button className="btn-ghost" onClick={() => { setAnalysisResult(false); setCurrentAnalysis(null); }}>
                Analisar outro vinho
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── PAINEL ── */}
      {activeTab === 'stats' && (
        <div className="tab-content">
          <h2 className="section-title">Painel da adega</h2>

          {total === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
              <p>Adicione vinhos para ver suas estatísticas aqui.</p>
              <button className="btn-primary" style={{ marginTop: '16px' }} onClick={() => setActiveTab('home')}>Adicionar primeiro vinho</button>
            </div>
          ) : (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-num">{total}</div>
                  <div className="stat-lbl">Vinhos</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num">{withRating.length > 0 ? avgRating.toFixed(1) : '—'}</div>
                  <div className="stat-lbl">Nota média</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num">{ratedCount > 0 ? Math.round(wouldBuyCount / ratedCount * 100) + '%' : '—'}</div>
                  <div className="stat-lbl">Compraria de novo</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num">{wineCollection.filter(w => w.feedback).length}</div>
                  <div className="stat-lbl">Degustações</div>
                </div>
              </div>

              {Object.keys(byType).length > 0 && (
                <div className="stats-section">
                  <h3 className="stats-subtitle">🍷 Por tipo</h3>
                  {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                    <div key={type} className="bar-row">
                      <span className="bar-label">{type}</span>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${Math.round(count / total * 100)}%` }} />
                      </div>
                      <span className="bar-count">{count}</span>
                    </div>
                  ))}
                </div>
              )}

              {topRegions.length > 0 && (
                <div className="stats-section">
                  <h3 className="stats-subtitle">📍 Principais regiões</h3>
                  {topRegions.map(([region, count], i) => (
                    <div key={region} className="region-row">
                      <span className="region-rank">#{i + 1}</span>
                      <span className="region-name">{region}</span>
                      <span className="region-count">{count} {count === 1 ? 'vinho' : 'vinhos'}</span>
                    </div>
                  ))}
                </div>
              )}

              {withRating.length > 0 && (
                <div className="stats-section">
                  <h3 className="stats-subtitle">🏆 Melhor avaliado</h3>
                  {[...wineCollection].filter(w => w.feedback?.rating > 0).sort((a, b) => b.feedback.rating - a.feedback.rating).slice(0, 1).map((w, i) => (
                    <div key={i} className="best-card">
                      <div className="best-name">{w.wine_name}</div>
                      <Estrelas nota={w.feedback.rating} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── COLEÇÃO ── */}
      {activeTab === 'collection' && (
        <div className="tab-content">
          <h2 className="section-title">
            Minha coleção&nbsp;
            {total > 0 && <span className="count-badge">{total}</span>}
          </h2>
          {total === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🍾</div>
              <p>Sua coleção está vazia.</p>
              <button className="btn-primary" style={{ marginTop: '16px' }} onClick={() => setActiveTab('home')}>
                Adicionar primeiro vinho
              </button>
            </div>
          ) : (
            wineCollection.map((vinho, idx) => <CardVinho key={idx} vinho={vinho} idx={idx} exibirBotoes={true} />)
          )}
        </div>
      )}

      {/* ── BUSCAR ── */}
      {activeTab === 'search' && (
        <div className="tab-content">
          <input
            type="text"
            className="search-input"
            placeholder="Nome do vinho, região ou uva..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchResults.length === 0 ? (
            <div className="empty-state">
              {searchQuery ? '😕 Nenhum resultado para "' + searchQuery + '".' : 'Digite para buscar na sua coleção.'}
            </div>
          ) : (
            searchResults.map((vinho, idx) => <CardVinho key={idx} vinho={vinho} idx={idx} exibirBotoes={false} />)
          )}
        </div>
      )}

      {/* ── MODAL DEGUSTAÇÃO ── */}
      {feedbackModal !== null && (
        <div className="modal-fundo" onClick={() => setFeedbackModal(null)}>
          <div className="modal-painel" onClick={e => e.stopPropagation()}>
            <div className="modal-alca" />
            <div className="modal-titulo">Registrar degustação</div>
            <div className="modal-secao">
              <span className="modal-rotulo">Avaliação</span>
              <Estrelas nota={feedbackForm.rating} interativo aoSelecionar={(v) => setFeedbackForm(f => ({ ...f, rating: v }))} />
            </div>
            <div className="modal-secao">
              <span className="modal-rotulo">Data da degustação</span>
              <input type="date" value={feedbackForm.tastingDate} onChange={e => setFeedbackForm(f => ({ ...f, tastingDate: e.target.value }))} />
            </div>
            <div className="modal-secao">
              <span className="modal-rotulo">Notas de degustação</span>
              <textarea rows={4} placeholder="Aroma, sabor, textura, harmonização..." value={feedbackForm.notes} onChange={e => setFeedbackForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="modal-secao">
              <span className="modal-rotulo">Compraria novamente?</span>
              <div className="grupo-toggle">
                <button className={`btn-toggle btn-toggle-sim ${feedbackForm.wouldBuyAgain === true ? 'ativo' : ''}`} onClick={() => setFeedbackForm(f => ({ ...f, wouldBuyAgain: true }))}>Sim</button>
                <button className={`btn-toggle btn-toggle-nao ${feedbackForm.wouldBuyAgain === false ? 'ativo' : ''}`} onClick={() => setFeedbackForm(f => ({ ...f, wouldBuyAgain: false }))}>Não</button>
              </div>
            </div>
            <button className="btn-salvar" onClick={saveFeedback}>Salvar degustação</button>
            <button className="btn-cancelar" onClick={() => setFeedbackModal(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* ── BANNER LGPD ── */}
      {cookieConsent !== 'accepted' && (
        <div className="lgpd-banner">
          <div className="lgpd-content">
            <p className="lgpd-text">
              🔒 <strong>Privacidade:</strong> Sua coleção é salva <strong>apenas no seu dispositivo</strong>. As imagens dos rótulos são enviadas à IA Groq para análise e não são armazenadas. Nenhum dado pessoal é coletado. Em conformidade com a <strong>LGPD</strong>.
            </p>
            <button className="lgpd-btn" onClick={acceptCookies}>Entendi e aceito</button>
          </div>
        </div>
      )}

    </div>
  );
}
