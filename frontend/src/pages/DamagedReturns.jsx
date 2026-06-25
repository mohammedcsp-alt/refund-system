import { useState, useEffect } from 'react';
import axios from 'axios';

export default function DamagedReturns() {
  const [customers, setCustomers] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState({ customer_code: '', list_sequence: '', date_from: '', date_to: '' });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [msg, setMsg] = useState('');

  useEffect(() => { axios.get('/api/customers').then(r => setCustomers(r.data)); }, []);

  const loadSequences = (code) => {
    if (code) axios.get(`/api/reception/sequences/${code}`).then(r => setSequences(r.data));
  };

  const load = () => {
    const p = new URLSearchParams(filter).toString();
    axios.get(`/api/damaged-returns?${p}`).then(r => setItems(r.data));
  };

  useEffect(() => { load(); }, [filter.list_sequence, filter.customer_code]);

  const saveEdit = async (id) => {
    await axios.put(`/api/damaged-returns/${id}`, editForm);
    setEditId(null); load();
  };

  const restore = async (id) => {
    if (!confirm('هل تريد إعادة العنصر إلى مرحلة التدقيق؟')) return;
    await axios.post('/api/audit/restore', { source: 'damaged', record_id: id });
    setMsg('✅ تمت إعادة العنصر للتدقيق'); load();
  };

  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const totalVal = items.reduce((s, i) => s + i.qty * (i.compensation_type === 'half' ? i.price/2 : i.price), 0);

  return (
    <>
      <div className="page-header">
        <div><div className="page-title">⚠️ الراجع التالف</div><div className="page-subtitle">العناصر التالفة مع نوع التعويض</div></div>
        <div style={{display:'flex',gap:'8px'}} className="no-print">
          <button className="btn btn-secondary btn-sm" onClick={() => window.open('/api/export/damaged_returns','_blank')}>📊 تصدير</button>
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
          <span className="info-chip">إجمالي الكمية: {totalQty}</span>
          <span className="info-chip">قيمة التعويض: {totalVal.toFixed(2)}</span>
        </div>
      )}

      <div className="card">
        <div className="card-title">قائمة الراجع التالف</div>
        <div className="alert alert-warning">
          ملاحظة: الايتم الذي ينزل هنا ينزل من حساب الزبون ولا تضاف الكمية إلى قاعدة البيانات
        </div>
        {items.length === 0 ? (
          <div className="empty-state"><div className="icon">⚠️</div><p>لا توجد عناصر</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr>
                <th>#</th><th>اسم العنصر</th><th>الكمية</th>
                <th>السعر</th><th>التعويض</th><th>قيمة التعويض</th>
                <th>الزبون</th><th>تسلسل القائمة</th><th>المفتش</th><th>ملاحظة</th><th className="no-print">إجراءات</th>
              </tr></thead>
              <tbody>
                {items.map((item, i) => {
                  const compVal = item.compensation_type === 'half' ? item.price/2 : item.price;
                  return (
                    <tr key={item.id}>
                      <td>{i+1}</td>
                      <td><strong>{item.item_name}</strong></td>
                      <td>{item.qty}</td>
                      <td>
                        {editId===item.id
                          ? <input type="number" value={editForm.price} onChange={e=>setEditForm({...editForm,price:+e.target.value})} style={{width:'80px'}} />
                          : item.price}
                      </td>
                      <td>
                        {editId===item.id
                          ? <select value={editForm.compensation_type} onChange={e=>setEditForm({...editForm,compensation_type:e.target.value})}>
                              <option value="full">تعويض كامل</option>
                              <option value="half">تعويض نصفي</option>
                            </select>
                          : <span className={`badge ${item.compensation_type==='full'?'badge-green':'badge-orange'}`}>
                              {item.compensation_type==='full' ? 'كامل' : 'نصفي'}
                            </span>
                        }
                      </td>
                      <td>{(item.qty * compVal).toFixed(2)}</td>
                      <td>{item.customer_name}<br/><small style={{color:'var(--text-light)'}}>{item.customer_code}</small></td>
                      <td><span className="badge badge-blue">{item.list_sequence}</span></td>
                      <td>{item.inspector_name}</td>
                      <td>
                        {editId===item.id
                          ? <input value={editForm.note||''} onChange={e=>setEditForm({...editForm,note:e.target.value})} style={{width:'100%'}} />
                          : item.note||'-'}
                      </td>
                      <td className="no-print">
                        <div className="td-actions">
                          {editId===item.id ? <>
                            <button className="btn btn-success btn-xs" onClick={() => saveEdit(item.id)}>💾</button>
                            <button className="btn btn-secondary btn-xs" onClick={() => setEditId(null)}>✖</button>
                          </> : <>
                            <button className="btn btn-outline btn-xs" onClick={() => { setEditId(item.id); setEditForm({price: item.price, compensation_type: item.compensation_type, note: item.note||''}); }}>✏️</button>
                            <button className="btn btn-warning btn-xs" onClick={() => restore(item.id)} title="إعادة للتدقيق">↩️</button>
                          </>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{background:'#fff8e1', fontWeight:'bold'}}>
                  <td colSpan="2">المجموع</td>
                  <td>{totalQty}</td>
                  <td></td><td></td>
                  <td>{totalVal.toFixed(2)}</td>
                  <td colSpan="5"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
