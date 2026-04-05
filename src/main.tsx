import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import AdminDashboard from './AdminDashboard.tsx'
import './index.css'

// Check what URL the user is trying to access
const path = window.location.pathname;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {path === '/admin-login' ? <AdminDashboard /> : <App />}
  </React.StrictMode>,
)