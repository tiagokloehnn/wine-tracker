'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('home');
  const [wineCollection, setWineCollection] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

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
      const imageData = e.target.result;
      const base64Data = imageData.split(',')[1];
      await analyzeWine(base64Data);
    };
    reader.readAsDataURL(file);
  };

  const analyzeWine = async (base64Data) => {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: [{
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: base64Data }
            }, {
              type: 'text',
              text: 'Analise esta imagem de vinho e responda APENAS em JSON (sem nenhum outro texto) com este formato: {"wine_name": "Nome do vinho", "wine_type": "Tipo (Tinto/Branco/Rosé/Espumante)", "region": "Região", "grape": "Variedade da uva", "confidence": "Alta/Média/Baixa"}. Se não for uma imagem de vinho, coloque null em wine_name.'
            }]
          }]
        })
      });

      const data = await response.json();
      const text = data.content[0]?.text || '';
      
      let analysis;
      try {
        analysis = JSON.parse(text);
      } catch {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      }

      if (analysis && analysis.wine_name) {
        setCurrentAnalysis(analysis);
        setAnalysisResult(true);
        setActiveTab('home');
      } else {
        alert('❌ Não consegui identificar o vinho nesta imagem. Tente outra foto mais clara.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao analisar a imagem. Verifique sua conexão.');
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

  const searchResults = wineCollection.filter(w =>
    w.wine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.grape.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const wineExists = currentAnalysis && wineCollection.some(
    w => w.wine_name.toLowerCase() === currentAnalysis.wine_name.toLowerCase()
  );

  return (
    <div style={{ maxWidth: '380px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #f9f9f9; }
        .tab-nav {
          display: flex;
          gap: 0;
          border-bottom: 0.5px solid #e5e5e5;
          margin-bottom: 0;
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
        .tab-btn.active {
          color: #000;
          border-bottom-color: #000;
        }
        .tab-content {
          display: none;
          padding: 16px 12px;
          background: white;
          min-height: 300px;
        }
        .tab-content.active {
          display: block;
        }
        .wine-card {
          background: white;
          border: 0.5px solid #e5e5e5;
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 12px;
        }
        .wine-name {
          font-weight: 500;
          font-size: 15px;
          margin: 0 0 8px 0;
        }
        .wine-detail {
          font-size: 13px;
          color: #666;
          margin: 4px 0;
        }
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
        .btn-upload:hover {
          background: #0051d5;
        }
        .btn-delete {
          font-size: 12px;
          color: #ff3b30;
          cursor: pointer;
          background: transparent;
          border: none;
          padding: 4px 8px;
        }
        .stat-box {
          background: #f5f5f5;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 12px;
          text-align: center;
        }
        .stat-label {
          font-size: 12px;
          color: #999;
          margin-bottom: 4px;
        }
        .stat-number {
          font-size: 24px;
          font-weight: 500;
          color: #000;
        }
        .result-box {
          background: #f5f5f5;
          border-radius: 12px;
          padding: 16px;
          margin: 12px 0;
          text-align: left;
        }
        .result-title {
          font-size: 16px;
          font-weight: 500;
          margin-bottom: 8px;
        }
        .badge {
          padding: 10px;
          border-radius: 8px;
          text-align: center;
          font-size: 13px;
          margin-top: 12px;
        }
        .badge-new {
          background: #e3f2fd;
          color: #1976d2;
        }
        .badge-exists {
          background: #fff3e0;
          color: #f57c00;
        }
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
        .btn-primary:hover {
          background: #f5f5f5;
        }
        input[type="file"] {
          display: none;
        }
        input[type="text"] {
          width: 100%;
          padding: 10px;
          border: 0.5px solid #e5e5e5;
          border-radius: 8px;
          margin-bottom: 12px;
          font-size: 14px;
        }
        .empty-state {
          text-align: center;
          color: #999;
          font-size: 14px;
          padding: 20px 0;
        }
        .loading {
          text-align: center;
          color: #999;
          padding: 20px;
        }
      `}</style>

      <div className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          🏠 Início
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 Histórico
        </button>
        <button
          className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
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
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhoto}
            disabled={loading}
          />
        </label>

        <label className="btn-upload" style={{ cursor: 'pointer' }}>
          🖼️ Escolher da galeria
          <input
            type="file"
            accept="image/*"
            onChange={handlePhoto}
            disabled={loading}
          />
        </label>

        {loading && (
          <div className="loading">
            🔍 Analisando imagem com IA...
          </div>
        )}

        {analysisResult && currentAnalysis && (
          <div>
            <div className="result-box">
              <div className="result-title">{currentAnalysis.wine_name}</div>
              <div className="wine-detail">🍷 Tipo: {currentAnalysis.wine_type}</div>
              <div className="wine-detail">📍 Região: {currentAnalysis.region}</div>
              <div className="wine-detail">🍇 Uva: {currentAnalysis.grape}</div>
              <div className={`badge ${wineExists ? 'badge-exists' : 'badge-new'}`}>
                {wineExists
                  ? '✓ Você já provou este vinho!'
                  : 'Novo vinho descoberto!'}
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
          <div className="empty-state">
            Nenhum vinho catalogado ainda. Comece fotografando um!
          </div>
        ) : (
          wineCollection.map((wine, idx) => (
            <div key={idx} className="wine-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <p className="wine-name">{wine.wine_name}</p>
                  <p className="wine-detail">
                    {wine.wine_type} • {wine.region}
                  </p>
                  <p className="wine-detail">🍇 {wine.grape}</p>
                  <p className="wine-detail" style={{ fontSize: '12px', marginTop: '8px' }}>
                    Adicionado em {wine.dateAdded}
                  </p>
                </div>
                <button
                  className="btn-delete"
                  onClick={() => deleteWine(idx)}
                >
                  ✕
                </button>
              </div>
            </div>
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
          searchResults.map((wine, idx) => (
            <div key={idx} className="wine-card">
              <p className="wine-name">{wine.wine_name}</p>
              <p className="wine-detail">
                {wine.wine_type} • {wine.region}
              </p>
              <p className="wine-detail">🍇 {wine.grape}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
