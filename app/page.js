'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const USER_MONTHLY_LIMIT = 5;
const WINE_COLLECTION_LIMIT = 20;

export default function Home() {
  // Auth
  const [user, setUser] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirm, setAuthConfirm] = useState('');
  const [authError, setAuthError] = useState(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // App
  const [activeTab, setActiveTab] = useState('home');
  const [wineCollection, setWineCollection] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({ rating: 0, notes: '', tastingDate: '', wouldBuyAgain: null });
  const [hydrated, setHydrated] = useState(false);
  const [cookieConsent, setCookieConsent] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [allProfiles, setAllProfiles] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [analysisUsage, setAnalysisUsage] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [sharedInviteUrl, setSharedInviteUrl] = useState(null);
  const [sharedInviteLoading, setSharedInviteLoading] = useState(false);
  const [inviteToken, setInviteToken] = useState(null);
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState(null);

  const loadWines = async (userId, partnerId = null) => {
    let query = supabase.from('wines').select('*');
    if (partnerId) {
      query = query.or(`user_id.eq.${userId},user_id.eq.${partnerId}`);
    } else {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (!error) setWineCollection(data || []);
  };

  const loadProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setUserProfile(data ?? null);
    if (data?.cellar_partner_id) {
      loadWines(userId, data.cellar_partner_id);
    }
  };

  const loadAllProfiles = async () => {
    setAdminLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) alert(`Erro ao carregar usuários: ${error.message}`);
    setAllProfiles(data || []);
    setAdminLoading(false);
  };

  const loadUsage = async () => {
    const { data } = await supabase.rpc('get_user_usage');
    setAnalysisUsage(data?.used ?? 0);
  };

  const toggleAdmin = async (profileId, currentValue) => {
    if (!confirm(`${currentValue ? 'Remover' : 'Conceder'} acesso de administrador para este usuário?`)) return;
    const { error } = await supabase.from('profiles').update({ is_admin: !currentValue }).eq('id', profileId);
    if (error) { alert(`Erro: ${error.message}`); return; }
    setAllProfiles(prev => prev.map(p => p.id === profileId ? { ...p, is_admin: !currentValue } : p));
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setSessionLoading(false);
      if (session?.user) { loadWines(session.user.id); loadProfile(session.user.id); loadUsage(); }
      setCookieConsent(localStorage.getItem('lgpd_consent'));
      setHydrated(true);
      const params = new URLSearchParams(window.location.search);
      if (params.get('payment') === 'success') {
        window.history.replaceState({}, '', '/');
        alert('✅ Assinatura confirmada! Bem-vindo ao plano Premium!');
        if (session?.user) loadProfile(session.user.id);
      }
      const inviteParam = params.get('invite');
      if (inviteParam) {
        setInviteToken(inviteParam);
        window.history.replaceState({}, '', '/');
        if (session?.user) setInviteModal(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'PASSWORD_RECOVERY') { setUser(null); setAuthMode('update-password'); return; }
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
        loadUsage();
        setInviteToken(prev => { if (prev) setInviteModal(true); return prev; });
      } else {
        setWineCollection([]); setUserProfile(null); setAnalysisUsage(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('lgpd_consent', 'accepted');
    setCookieConsent('accepted');
  };

  // ── AUTH HANDLERS ──

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
    if (error) setAuthError(error.message);
    setAuthSubmitting(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (authPassword !== authConfirm) { setAuthError('As senhas não coincidem.'); return; }
    if (authPassword.length < 6) { setAuthError('A senha deve ter pelo menos 6 caracteres.'); return; }
    setAuthError(null);
    setAuthSubmitting(true);
    const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
    if (error) setAuthError(error.message);
    else setAuthError('✓ Conta criada! Verifique seu e-mail para confirmar o cadastro.');
    setAuthSubmitting(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
      redirectTo: window.location.origin,
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('rate limit') || msg.includes('too many')) {
        setAuthError('Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.');
      } else {
        setAuthError(error.message);
      }
    } else {
      setAuthError('✓ Link enviado! Verifique seu e-mail para redefinir a senha.');
    }
    setAuthSubmitting(false);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (authPassword !== authConfirm) { setAuthError('As senhas não coincidem.'); return; }
    if (authPassword.length < 6) { setAuthError('A senha deve ter pelo menos 6 caracteres.'); return; }
    setAuthError(null);
    setAuthSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: authPassword });
    if (error) setAuthError(error.message);
    else { setAuthError('✓ Senha atualizada com sucesso!'); setAuthMode('login'); }
    setAuthSubmitting(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setWineCollection([]);
    setUserProfile(null);
    setAnalysisUsage(null);
    setActiveTab('home');
  };

  const handleCheckout = async (plan) => {
    setCheckoutLoading(plan);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err) {
      alert(`Erro ao iniciar pagamento: ${err.message}`);
      setCheckoutLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    setSharedInviteLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/invite/create', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSharedInviteUrl(`${window.location.origin}?invite=${data.token}`);
    } catch (err) {
      alert(`Erro ao gerar convite: ${err.message}`);
    } finally {
      setSharedInviteLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    setInviteLoading(true);
    setInviteError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ token: inviteToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInviteModal(false);
      setInviteToken(null);
      await loadProfile(user.id);
      alert('✅ Adega compartilhada ativada!');
    } catch (err) {
      setInviteError(err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const handlePortal = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
  };

  // ── IMAGE RESIZE ──

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
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
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
        setAnalysisUsage(prev => prev !== null ? prev + 1 : 1);
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

  // ── WINE CRUD ──

  const addToCollection = async () => {
    if (!currentAnalysis || !user) return;
    const exists = wineCollection.some(w => w.wine_name.toLowerCase() === currentAnalysis.wine_name.toLowerCase());
    if (exists) { alert('Este vinho já está na sua coleção.'); return; }
    const ownWines = wineCollection.filter(w => w.user_id === user.id).length;
    if (!userProfile?.is_premium && ownWines >= WINE_COLLECTION_LIMIT) {
      alert(`Você atingiu o limite de ${WINE_COLLECTION_LIMIT} vinhos no plano gratuito. Assine um plano para adicionar mais.`);
      return;
    }
    const { data, error } = await supabase.from('wines').insert({
      user_id: user.id,
      wine_name: currentAnalysis.wine_name,
      wine_type: currentAnalysis.wine_type,
      region: currentAnalysis.region,
      grape: currentAnalysis.grape,
      confidence: currentAnalysis.confidence,
      date_added: new Date().toLocaleDateString('pt-BR'),
    }).select().single();
    if (error) { alert(`Erro ao salvar: ${error.message}`); return; }
    setWineCollection(prev => [data, ...prev]);
    setAnalysisResult(false);
    setCurrentAnalysis(null);
    setActiveTab('collection');
  };

  const deleteWine = async (id) => {
    if (!confirm('Remover este vinho da coleção?')) return;
    const { error } = await supabase.from('wines').delete().eq('id', id);
    if (error) { alert(`Erro ao remover: ${error.message}`); return; }
    setWineCollection(prev => prev.filter(w => w.id !== id));
  };

  const openFeedback = (vinho) => {
    setFeedbackForm({
      rating: vinho.feedback?.rating || 0,
      notes: vinho.feedback?.notes || '',
      tastingDate: vinho.feedback?.tastingDate || new Date().toISOString().split('T')[0],
      wouldBuyAgain: vinho.feedback?.wouldBuyAgain ?? null,
    });
    setFeedbackModal(vinho.id);
  };

  const saveFeedback = async () => {
    const { error } = await supabase.from('wines').update({ feedback: feedbackForm }).eq('id', feedbackModal);
    if (error) { alert(`Erro ao salvar degustação: ${error.message}`); return; }
    setWineCollection(prev => prev.map(w => w.id === feedbackModal ? { ...w, feedback: feedbackForm } : w));
    setFeedbackModal(null);
  };

  const formatarData = (isoDate) => {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  };

  // ── STATS ──

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

  // ── COMPONENTS ──

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

  const CardVinho = ({ vinho, exibirBotoes }) => (
    <div className="wine-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <p className="wine-name">{vinho.wine_name}</p>
          <span className={`type-badge ${typeBadgeClass(vinho.wine_type)}`}>{vinho.wine_type}</span>
          <p className="wine-detail" style={{ marginTop: '8px' }}>📍 {vinho.region}</p>
          <p className="wine-detail">🍇 {vinho.grape}</p>
          <p className="wine-detail" style={{ fontSize: '11px', color: '#bbb', marginTop: '4px' }}>Adicionado em {vinho.date_added}</p>
        </div>
        {exibirBotoes && <button className="btn-delete" onClick={() => deleteWine(vinho.id)}>✕</button>}
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
        <button className="btn-degustacao" onClick={() => openFeedback(vinho)}>
          {vinho.feedback ? '✏️ Editar degustação' : '+ Registrar degustação'}
        </button>
      )}
    </div>
  );

  // ── RENDER GUARDS ──

  if (!hydrated || sessionLoading) return (
    <div className="session-loading">
      <div className="session-loading-emoji">🍷</div>
      <p className="session-loading-text">Carregando...</p>
    </div>
  );

  // ── AUTH SCREEN ──

  if (!user) return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-logo">🍷</span>
          <h1 className="auth-title">Wine Tracker</h1>
          <p className="auth-sub">Sua adega pessoal, em qualquer lugar</p>
        </div>

        {authMode !== 'reset' && authMode !== 'update-password' && (
          <div className="auth-tabs">
            <button className={`auth-tab ${authMode === 'login' ? 'active' : ''}`} onClick={() => { setAuthMode('login'); setAuthError(null); }}>Entrar</button>
            <button className={`auth-tab ${authMode === 'register' ? 'active' : ''}`} onClick={() => { setAuthMode('register'); setAuthError(null); }}>Criar conta</button>
          </div>
        )}

        {authMode === 'reset' ? (
          <form onSubmit={handleResetPassword} className="auth-form">
            <input type="email" className="auth-input" placeholder="E-mail" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required autoComplete="email" />
            {authError && <p className={`auth-msg ${authError.startsWith('✓') ? 'auth-success' : 'auth-error'}`}>{authError}</p>}
            <button type="submit" className="auth-btn" disabled={authSubmitting}>
              {authSubmitting ? 'Aguarde...' : 'Enviar link de recuperação'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => { setAuthMode('login'); setAuthError(null); }}>Voltar ao login</button>
          </form>
        ) : authMode === 'update-password' ? (
          <form onSubmit={handleUpdatePassword} className="auth-form">
            <p style={{ fontSize: '14px', color: '#888', textAlign: 'center', marginBottom: '4px' }}>Digite sua nova senha</p>
            <input type="password" className="auth-input" placeholder="Nova senha" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required autoComplete="new-password" />
            <input type="password" className="auth-input" placeholder="Confirmar nova senha" value={authConfirm} onChange={e => setAuthConfirm(e.target.value)} required autoComplete="new-password" />
            {authError && <p className={`auth-msg ${authError.startsWith('✓') ? 'auth-success' : 'auth-error'}`}>{authError}</p>}
            <button type="submit" className="auth-btn" disabled={authSubmitting}>
              {authSubmitting ? 'Aguarde...' : 'Salvar nova senha'}
            </button>
          </form>
        ) : (
          <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="auth-form">
            <input type="email" className="auth-input" placeholder="E-mail" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required autoComplete="email" />
            <input type="password" className="auth-input" placeholder="Senha" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} />
            {authMode === 'register' && (
              <input type="password" className="auth-input" placeholder="Confirmar senha" value={authConfirm} onChange={e => setAuthConfirm(e.target.value)} required autoComplete="new-password" />
            )}
            {authError && <p className={`auth-msg ${authError.startsWith('✓') ? 'auth-success' : 'auth-error'}`}>{authError}</p>}
            <button type="submit" className="auth-btn" disabled={authSubmitting}>
              {authSubmitting ? 'Aguarde...' : authMode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
            {authMode === 'login' && (
              <button type="button" className="btn-ghost" style={{ marginTop: '-4px', fontSize: '13px' }} onClick={() => { setAuthMode('reset'); setAuthError(null); }}>
                Esqueci minha senha
              </button>
            )}
          </form>
        )}

        <p className="auth-lgpd">🔒 Seus dados são armazenados com segurança e nunca compartilhados com terceiros. Conforme a LGPD (Lei 13.709/2018).</p>
      </div>
    </div>
  );

  // ── MAIN APP ──

  return (
    <div className="app-container">

      <div className="app-header">
        <span className="header-logo">🍷</span>
        <div style={{ flex: 1 }}>
          <div className="header-title">Wine Tracker</div>
          <div className="header-sub">Sua adega pessoal</div>
        </div>
        <div className="header-user">
          <span className="header-email">{user.email}</span>
          <button className="btn-logout" onClick={handleLogout}>Sair</button>
        </div>
      </div>

      <div className="tab-nav">
        {[
          { id: 'home', icon: '🏠', label: 'Início' },
          { id: 'stats', icon: '📊', label: 'Painel' },
          { id: 'collection', icon: '🗂️', label: 'Coleção' },
          { id: 'search', icon: '🔍', label: 'Buscar' },
          ...(userProfile?.is_admin ? [{ id: 'admin', icon: '⚙️', label: 'Admin' }] : []),
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
            <>
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
              {userProfile?.is_premium ? (
                <>
                  <p className="usage-indicator premium-active">
                    {userProfile.subscription_plan === 'shared' ? '🍾 Plano Adega Compartilhada — análises ilimitadas' : '⭐ Plano Análises Ilimitadas'}
                  </p>
                  {userProfile.subscription_plan === 'shared' && (
                    <div className="shared-cellar-box">
                      {userProfile.cellar_partner_id ? (
                        <p className="shared-cellar-status">✅ Adega compartilhada ativa com seu parceiro</p>
                      ) : (
                        <>
                          <p className="shared-cellar-status">Convide seu parceiro para compartilhar a adega:</p>
                          {sharedInviteUrl ? (
                            <div className="invite-url-box">
                              <input className="invite-url-input" readOnly value={sharedInviteUrl} />
                              <button className="btn-copy" onClick={() => {
                                if (navigator.clipboard && navigator.clipboard.writeText) {
                                  navigator.clipboard.writeText(sharedInviteUrl).then(() => alert('Link copiado!')).catch(() => {
                                    const el = document.querySelector('.invite-url-input');
                                    el.select(); el.setSelectionRange(0, 99999);
                                    document.execCommand('copy');
                                    alert('Link copiado!');
                                  });
                                } else {
                                  const el = document.querySelector('.invite-url-input');
                                  el.select(); el.setSelectionRange(0, 99999);
                                  document.execCommand('copy');
                                  alert('Link copiado!');
                                }
                              }}>Copiar</button>
                            </div>
                          ) : (
                            <button className="btn-invite" onClick={handleCreateInvite} disabled={sharedInviteLoading}>
                              {sharedInviteLoading ? 'Gerando...' : '🔗 Gerar link de convite'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  <button className="btn-portal" onClick={handlePortal}>Gerenciar assinatura</button>
                </>
              ) : analysisUsage !== null && (
                <>
                  <p className={`usage-indicator${USER_MONTHLY_LIMIT - analysisUsage <= 2 ? ' usage-low' : ''}`}>
                    {USER_MONTHLY_LIMIT - analysisUsage <= 0
                      ? '⚠️ Limite de análises gratuitas atingido este mês'
                      : `${USER_MONTHLY_LIMIT - analysisUsage} de ${USER_MONTHLY_LIMIT} análises gratuitas restantes`}
                  </p>
                  <div className="upgrade-card">
                    <p className="upgrade-title">Escolha seu plano</p>
                    <div className="plans-row">
                      <div className="plan-option">
                        <p className="plan-name">⭐ Análises Ilimitadas</p>
                        <p className="plan-price">R$4,99<span>/mês</span></p>
                        <p className="plan-desc">Analise quantos vinhos quiser, sem limite mensal</p>
                        <button className="btn-upgrade" onClick={() => handleCheckout('premium')} disabled={checkoutLoading === 'premium'}>
                          {checkoutLoading === 'premium' ? 'Aguarde...' : 'Assinar'}
                        </button>
                      </div>
                      <div className="plan-option plan-option-featured">
                        <p className="plan-name">🍾 Adega Compartilhada</p>
                        <p className="plan-price">R$7,99<span>/mês</span></p>
                        <p className="plan-desc">Análises ilimitadas + compartilhe sua adega com outra pessoa</p>
                        <button className="btn-upgrade" onClick={() => handleCheckout('shared')} disabled={checkoutLoading === 'shared'}>
                          {checkoutLoading === 'shared' ? 'Aguarde...' : 'Assinar'}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
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
                {currentAnalysis.description && (
                  <div className="result-description">
                    <p>{currentAnalysis.description}</p>
                  </div>
                )}
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
            wineCollection.map(vinho => <CardVinho key={vinho.id} vinho={vinho} exibirBotoes={true} />)
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
          />
          {searchResults.length === 0 ? (
            <div className="empty-state">
              {searchQuery ? `😕 Nenhum resultado para "${searchQuery}".` : 'Digite para buscar na sua coleção.'}
            </div>
          ) : (
            searchResults.map(vinho => <CardVinho key={vinho.id} vinho={vinho} exibirBotoes={false} />)
          )}
        </div>
      )}

      {/* ── ADMIN ── */}
      {activeTab === 'admin' && userProfile?.is_admin && (
        <div className="tab-content">
          <h2 className="section-title">Administração de usuários</h2>
          <button className="btn-primary" onClick={loadAllProfiles} disabled={adminLoading} style={{ marginBottom: '16px' }}>
            {adminLoading ? 'Carregando...' : '🔄 Atualizar lista'}
          </button>
          {allProfiles.length === 0 && !adminLoading && (
            <div className="empty-state">Clique em "Atualizar lista" para ver todos os usuários cadastrados.</div>
          )}
          {allProfiles.map(profile => (
            <div key={profile.id} className="admin-user-card">
              <div className="admin-user-info">
                <p className="admin-user-email">{profile.email}</p>
                <p className="admin-user-date">Desde {new Date(profile.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="admin-user-actions">
                {profile.is_admin && <span className="admin-badge">Admin</span>}
                <button
                  className={profile.is_admin ? 'btn-revoke-admin' : 'btn-grant-admin'}
                  onClick={() => toggleAdmin(profile.id, profile.is_admin)}
                  disabled={profile.id === user.id}
                >
                  {profile.id === user.id ? 'Você' : profile.is_admin ? 'Remover admin' : 'Dar admin'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL CONVITE ── */}
      {inviteModal && (
        <div className="modal-fundo" onClick={() => { setInviteModal(false); setInviteError(null); }}>
          <div className="modal-painel" onClick={e => e.stopPropagation()}>
            <div className="modal-alca" />
            <div className="modal-titulo">🍾 Convite de adega compartilhada</div>
            <p style={{ fontSize: '14px', color: '#666', textAlign: 'center', margin: '0 0 16px' }}>
              Você foi convidado para compartilhar uma adega. Aceitar vai unir sua coleção de vinhos com a de quem te convidou.
            </p>
            {inviteError && <p className="auth-msg auth-error">{inviteError}</p>}
            <button className="btn-salvar" onClick={handleAcceptInvite} disabled={inviteLoading}>
              {inviteLoading ? 'Aguarde...' : '✅ Aceitar convite'}
            </button>
            <button className="btn-cancelar" onClick={() => { setInviteModal(false); setInviteError(null); }}>Recusar</button>
          </div>
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
              🔒 <strong>Privacidade:</strong> Sua coleção é armazenada em servidor seguro com criptografia. As imagens enviadas são processadas por inteligência artificial para identificação do vinho e não são armazenadas permanentemente. Nenhum dado pessoal é compartilhado com terceiros. Em conformidade com a <strong>LGPD</strong> (Lei 13.709/2018).
            </p>
            <button className="lgpd-btn" onClick={acceptCookies}>Entendi e aceito</button>
          </div>
        </div>
      )}

    </div>
  );
}
