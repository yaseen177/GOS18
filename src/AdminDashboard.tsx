import React, { useState } from 'react';

export default function AdminDashboard() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pdfCount, setPdfCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

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
      // Fetches the live count from Cloudflare
      const response = await fetch('/api/counter');
      const data = await response.json();
      setPdfCount(data.count);
    } catch (error) {
      console.error('Failed to fetch stats', error);
      setPdfCount(0); // Fallback if API fails
    }
    setLoading(false);
  };

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <form onSubmit={handleLogin} style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', width: '300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ margin: 0, color: '#0f172a', textAlign: 'center' }}>Admin Login</h2>
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

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
      <header className="top-nav">
        <h1 className="nav-title">🔒 GOS18 Admin Portal</h1>
        <button onClick={() => window.location.href = '/'} className="btn-primary" style={{ backgroundColor: '#64748b' }}>
          Back to Generator
        </button>
      </header>

      <main style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
        <div className="panel-card" style={{ width: '400px', textAlign: 'center', padding: '40px' }}>
          <h2 className="section-heading" style={{ textAlign: 'center', border: 'none' }}>Total PDFs Generated</h2>
          
          {loading ? (
            <p style={{ color: '#64748b' }}>Loading live data...</p>
          ) : (
            <div style={{ fontSize: '72px', fontWeight: 'bold', color: '#0284c7', margin: '20px 0' }}>
              {pdfCount}
            </div>
          )}
          
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.5' }}>
            This number represents the total usage rate across all practices. No patient data or PDFs are stored on this server.
          </p>
        </div>
      </main>
    </div>
  );
}