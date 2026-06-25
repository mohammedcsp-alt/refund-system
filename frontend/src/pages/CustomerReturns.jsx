import { useState, useEffect } from 'react';
import axios from 'axios';

export default function CustomerReturns() {
  const [customers, setCustomers] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState({ customer_code: '', list_sequence: '', date_from: '', date_to: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => { axios.get('/api/customers').then(r => setCustomers(r.data)); }, []);

  const loadSequences = (code) => {
    if (code) axios.get(`/api/reception/sequences/${code}`).then(r => setSequences(r.data));
  };

  const load = () => {
    const p = new URLSearchParams(filter).toString();
    axios.get(`/api/customer-returns?${p}`).then(r => setItems(r.data));
  };

  useEffect(() => { load(); }, [filter.list_sequence, filter.customer_code]);

  const restore = async (id) => {
    if (!confirm('هل تريد إعادة العنصر إلى مرحلة التدقيق؟')) return;
    await axios.post('/api/audit/restore', { source: 'customer', record_id: id });
    setMsg('✅ تمت إعادة العنصر للتدقيق'); load();
  };

  return (
    <>
      <div className="page-header">
        <div><div className="page-title">🔄 الراجع للزبون بعد الفحص</div><div className="page-subtitle">العناصر المُعادة للزبون بدون تعويض</div></div>
        <div style={{display:'flex',gap:'8px'}} className="no-print">
          <button className="btn btn-secondary btn-sm" onClick={() => window.open('/api/export/customer_returns','_blank')}>📊 تصدير</button>
          <button className="btn btn-outline btn-sm" onClick={() => window.print()}>🖨️ طباعة</button>
        </div>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="card no-print">
        <div className="card-title">البحث والفلترة</div>
        <div className="filter-bar" style={{padding:0,background:'none',border:'none'}}>
          <div className="form-group">
            <label>الزبون</label>
            <select value={filter.customer_code} onChange={e => { setFilter({...filter, customer_code: e.target.value, list_sequence: ''}); loadSequences(e.target.value); }}>
              <option value="">الكل</option>
              {customers.map(c => <option key={c.id} value={c.customer_code}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>تسلسل القائمة</label>
            <select value={filter.list_sequence} onChange={e => setFilter({...filter, list_sequence: e.target.value})}>
              <option value="">الكل</option>
              {sequences.map(s => <option key={s.list_sequence} value={s.list_sequence}>{s.list_sequence}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>من تاريخ</label>
            <input type="date" value={filter.date_from} onChange={e => setFilter({...filter, date_from: e.target.value})} />
          </div>
          <div className="form-group">
            <label>إلى تاريخ</label>
            <input type="date" value={filter.date_to} onChange={e => setFilter({...filter, date_to: e.target.value})} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={load}>🔍 بحث</button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="info-row">
          <span className="info-chip">إجمالي العناصر: {items.length}</span>
          <span className="info-chip">إجمالي الكمية: {items.reduce((s,i)=>s+i.qty,0)}</span>
        </div>
      )}

      <div className="card">
        <div className="card-title">قائمة الراجع للزبون بعد الفحص</div>
        {items.length === 0 ? (
          <div className="empty-state"><div className="icon">🔄</div><p>لا توجد عناصر</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr>
                <th>#</th><th>اسم العنصر</th><th>الكمية</th>
                <th>الزبون</th><th>تسلسل القائمة</th><th>المفتش</th><th>التاريخ</th><th>ملاحظة</th><th className="no-print">إجراءات</th>
              </tr></thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id}>
                    <td>{i+1}</td>
                    <td><strong>{item.item_name}</strong></td>
                    <td>{item.qty}</td>
                    <td>{item.customer_name}<br/><small style={{color:'var(--text-light)'}}>{item.customer_code}</small></td>
                    <td><span className="badge badge-blue">{item.list_sequence}</span></td>
                    <td>{item.inspector_name}</td>
                    <td>{item.added_date}</td>
                    <td>{item.note || '-'}</td>
                    <td className="no-print">
                      <button className="btn btn-warning btn-xs" onClick={() => restore(item.id)} title="إعادة للتدقيق">↩️ إعادة</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
