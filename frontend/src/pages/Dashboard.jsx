import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/stats').then(r => setStats(r.data));
  }, []);

  const cards = [
    { label: 'استلام الراجع', key: 'receptions', icon: '📥', color: '#1565C0', path: '/reception' },
    { label: 'عناصر الجرد', key: 'inventory', icon: '📋', color: '#1976D2', path: '/inventory' },
    { label: 'في التدقيق', key: 'audit_pending', icon: '🔍', color: '#7B1FA2', path: '/audit' },
    { label: 'الراجع الشغال', key: 'working', icon: '✅', color: '#2E7D32', path: '/working-returns' },
    { label: 'الراجع التالف', key: 'damaged', icon: '⚠️', color: '#E65100', path: '/damaged-returns' },
    { label: 'راجع للزبون', key: 'customer_return', icon: '🔄', color: '#0277BD', path: '/customer-returns' },
    { label: 'الايتمات المعلقة', key: 'pending', icon: '⏳', color: '#F57F17', path: '/pending-items' },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">لوحة التحكم</div>
          <div className="page-subtitle">نظرة عامة على نظام إدارة الراجع</div>
        </div>
      </div>

      {!stats ? <div className="loading"><div className="spinner"/><p>جارٍ التحميل...</p></div> : (
        <div className="stats-grid">
          {cards.map(c => (
            <div key={c.key} className="stat-card" style={{ borderTopColor: c.color }} onClick={() => navigate(c.path)}>
              <div style={{fontSize:'2rem', marginBottom:'8px'}}>{c.icon}</div>
              <div className="stat-num" style={{color: c.color}}>{stats[c.key] ?? 0}</div>
              <div className="stat-label">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-title">مراحل النظام</div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:'16px'}}>
          {[
            { title: 'المرحلة 1', sub: 'استلام الراجع', desc: 'تسجيل المرتجعات الواردة من الزبائن', icon: '📥', path: '/reception' },
            { title: 'المرحلة 2', sub: 'الجرد', desc: 'إجراء الجرد وإدخال العناصر بالباركود', icon: '📋', path: '/inventory' },
            { title: 'المرحلة 3', sub: 'التدقيق', desc: 'مراجعة العناصر واتخاذ القرار', icon: '🔍', path: '/audit' },
          ].map(s => (
            <div key={s.title} style={{padding:'20px', background:'#f5f9ff', borderRadius:'8px', cursor:'pointer', border:'1px solid #BBDEFB'}}
              onClick={() => navigate(s.path)}>
              <div style={{fontSize:'2rem'}}>{s.icon}</div>
              <div style={{fontWeight:'700', color:'var(--primary)', marginTop:'8px'}}>{s.title}: {s.sub}</div>
              <div style={{fontSize:'0.85rem', color:'var(--text-light)', marginTop:'4px'}}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
