import React, { useState, useEffect } from 'react';
import { AdminMapper } from './App';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function AdminDashboard() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [view, setView] = useState<'dashboard' | 'mapper'>('dashboard');
  
  // Analytics State
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, byDate: {}, byLocation: {} });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'wx64mbxg') {
      setIsAuthenticated(true);
      fetchStats();
    } else {
      alert('Incorrect password.');
      setPassword('');
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/counter');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats', error);
    }
    setLoading(false);
  };

  // Convert raw objects into arrays for the charts
  const dateData = Object.entries(stats.byDate)
    .map(([date, count]) => ({ date, count }))
    .slice(-7); // Only show the last 7 days

  const locationData = Object.entries(stats.byLocation)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => Number(b.count) - Number(a.count)) // Sort highest to lowest
    .slice(0, 5); // Only show top 5 locations

  // --- LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <form onSubmit={handleLogin} style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', width: '320px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ margin: 0, color: '#0f172a', textAlign: 'center' }}>🔒 Admin Gateway</h2>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="custom-input" placeholder="Enter Admin Password" autoFocus />
          <button type="submit" className="btn-primary" style={{ width: '100%' }}>Login</button>
        </form>
      </div>
    );
  }

  // --- MAPPING EDITOR VIEW ---
  if (view === 'mapper') return <AdminMapper onExit={() => setView('dashboard')} />;

  // --- DASHBOARD VIEW ---
  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
      
      <header className="top-nav">
        <h1 className="nav-title">🔒 GOS18 Admin Portal</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={fetchStats} className="btn-primary" style={{ backgroundColor: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1' }}>🔄 Refresh Data</button>
          <button onClick={() => window.location.href = '/'} className="btn-primary" style={{ backgroundColor: '#64748b' }}>← Public Generator</button>
        </div>
      </header>

      <main style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', flex: 1 }}>
        
        {/* TOP ROW: Total & Tools */}
        <div style={{ display: 'flex', gap: '24px' }}>
          <div className="panel-card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 className="section-heading" style={{ border: 'none', margin: 0 }}>Total Global Usage</h2>
              <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>GDPR Compliant Tally</p>
            </div>
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#0284c7' }}>
              {loading ? '...' : stats.total}
            </div>
          </div>

          <div className="panel-card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
             <div>
              <h2 className="section-heading" style={{ border: 'none', margin: 0 }}>Developer Tools</h2>
              <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>Modify PDF coordinates</p>
            </div>
            <button onClick={() => setView('mapper')} className="btn-primary" style={{ backgroundColor: '#0f172a' }}>⚙️ Open PDF Mapper</button>
          </div>
        </div>

        {/* BOTTOM ROW: Charts */}
        <div style={{ display: 'flex', gap: '24px', height: '400px' }}>
          
          {/* Daily Usage Chart */}
          <div className="panel-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2 className="section-heading">Usage (Last 7 Days)</h2>
            <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dateData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Locations Chart */}
          <div className="panel-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2 className="section-heading">Top 5 Locations</h2>
            <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationData} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#0f172a', fontWeight: 600 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" fill="#818cf8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}