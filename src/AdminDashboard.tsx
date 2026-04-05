import React, { useState } from 'react';
import { AdminMapper } from './App'; // Imports your secure mapping tool!

export default function AdminDashboard() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pdfCount, setPdfCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Controls what the admin is currently looking at
  const [view, setView] = useState<'dashboard' | 'mapper'>('dashboard');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'wx64mbxg') {
      setIsAuthenticated(true);
      fetchStats();
    } else {
      alert('Incorrect password. Access denied.');
      setPassword('');
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/counter');
      const data = await response.json();
      setPdfCount(data.count);
    } catch (error) {
      console.error('Failed to fetch stats', error);
      setPdfCount(0);
    }
    setLoading(false);
  };

  // --- LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <form onSubmit={handleLogin} style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', width: '320px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ margin: 0, color: '#0f172a', textAlign: 'center' }}>🔒 Admin Gateway</h2>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="custom-input"
            placeholder="Enter Admin Password" 
            autoFocus
          />
          <button type="submit" className="btn-primary" style={{ width: '100%' }}>Login</button>
        </form>
      </div>
    );
  }

  // --- MAPPING EDITOR VIEW ---
  // If the admin clicks the Mapping button, we render your exact tool.
  // When they click 'Exit' inside the mapper, it sets the view back to 'dashboard'.
  if (view === 'mapper') {
    return <AdminMapper onExit={() => setView('dashboard')} />;
  }

  // --- DASHBOARD VIEW ---
  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
      
      <header className="top-nav">
        <h1 className="nav-title">🔒 GOS18 Admin Portal</h1>
        <button onClick={() => window.location.href = '/'} className="btn-primary" style={{ backgroundColor: '#64748b' }}>
          ← Back to Public Generator
        </button>
      </header>

      <main style={{ padding: '40px', display: 'flex', gap: '32px', justifyContent: 'center', alignItems: 'flex-start' }}>
        
        {/* STATS CARD */}
        <div className="panel-card" style={{ width: '400px', textAlign: 'center', padding: '40px' }}>
          <h2 className="section-heading" style={{ textAlign: 'center', border: 'none' }}>Live Usage</h2>
          
          {loading ? (
            <p style={{ color: '#64748b' }}>Loading live data...</p>
          ) : (
            <div style={{ fontSize: '72px', fontWeight: 'bold', color: '#0284c7', margin: '20px 0' }}>
              {pdfCount}
            </div>
          )}
          
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
            Total PDFs successfully generated globally. No patient data or clinical details are tracked or stored.
          </p>
        </div>

        {/* TOOLS CARD */}
        <div className="panel-card" style={{ width: '400px', textAlign: 'center', padding: '40px' }}>
          <h2 className="section-heading" style={{ textAlign: 'center', border: 'none' }}>Developer Tools</h2>
          
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.5', marginBottom: '24px' }}>
            Modify the pixel coordinates and dimensions of the dynamic PDF overlay boxes.
          </p>

          <button 
            onClick={() => setView('mapper')} 
            className="btn-primary" 
            style={{ width: '100%', padding: '16px', fontSize: '16px', backgroundColor: '#0f172a' }}
          >
            ⚙️ Open PDF Mapper
          </button>
        </div>

      </main>
    </div>
  );
}