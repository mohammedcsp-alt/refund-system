import { useState, useEffect } from 'react';
import axios from 'axios';

export default function PendingItems() {
  const [customers, setCustomers] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState({ customer_code: '', list_sequence: '', date_from: '', date_to: '' });
  const [msg, setMsg] = useState('');
  const [transferModal, setTransferModal] = useState(null);
  const [tForm, setTForm] = useState({ destination: '', price: 0, compensation_type: 'full', note: '' });

  useEffect(() => { axios.get('/api/customers').then(r => setCustomers(r.data)); }, []);

  const loadSequences = (code) => {
    if (code) axios.get(`/api/reception/sequences/${code}`).then(r => setSequences(r.data));
  };

  const load = () => {
    const p = new URLSearchParams(filter).toString();
    axios.get(`/api/pending-items?${p}`).then(r => setItems(r.data));
  };

  useEffect(() => { load(); }, [filter.list_sequence, filter.customer_code]);

  const doTransfer = async () => {
    if (!tForm.destination) return setMsg('❌ اختر الوجهة');
    try {
      await axios.post('/api/pending-items/transfer', {
        pending_id: transferModal.id, ...tForm, price: +tForm.price
      });
      setTransferModal(null);
      setMsg(`✅ تم نقل العنصر بنجاح`);
      load();
    } catch (e) { setMsg('❌ ' + (e.response?.data?.error || 'خطأ')); }
  };

  const DEST_LABELS = { working: 'الراجع الشغال', damaged: 'الراجع التالف', customer_return: 'الراجع للزبون بعد الفحص' };

  return (
    <>
      <div className="page-header">
        <div><div className="page-title">⏳ الايتمات المعلقة</div><div className="page-subtitle">العناصر بانتظار القرار النهائي</div></div>
        <div style={{display:'flex',gap:'8px'}} className="no-print">
          <button className="btn btn-secondary btn-sm" onClick={() => window.open('/api/export/pending_items','_blank')}>📊 تصدير</button>
          <button className="btn btn-outline btn-sm" onClick={() => window.print()}>🖨️ طباعة</button>
        </div>
      </div>

      {msg && <div className={`alert ${msg.startsWith('✅')?'alert-success':'alert-danger'}`}>{msg}</div>}

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

      <div className="card">
        <div className="card-title">قائمة الايتمات المعلقة</div>
        <div className="alert alert-warning">
          تُخزن جميع الايتمات المعلقة بشكل تراكمي ويمكن تحويلها إلى أي واجهة
        </div>
        {items.length === 0 ? (
          <div className="empty-state"><div className="icon">⏳</div><p>لا توجد عناصر معلقة</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr>
                <th>#</th><th>اسم العنصر</th><th>الكمية</th>
                <th>الزبون</th><th>تسلسل القائمة</th><th>المفتش</th><th>التاريخ</th><th>ملاحظة</th><th className="no-print">تحويل إلى</th>
              </tr></thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id}>
                    <td>{i+1}</td>
                    <td><strong>{item.item_name}</strong></td>
                    <td>{item.qty}</td>
                    <td>{item.customer_name}<br/><small style={{color:'var(--text-light)'}}>{item.customer_code}</small></td>
                    <td><span className="badge badge-orange">{item.list_sequence}</span></td>
                    <td>{item.inspector_name}</td>
                    <td>{item.added_date}</td>
                    <td>{item.note || '-'}</td>
                    <td className="no-print">
                      <button className="btn btn-primary btn-xs" onClick={() => { setTransferModal(item); setTForm({ destination:'', price:0, compensation_type:'full', note:'' }); }}>
                        نقل ➜
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transfer Modal */}
      {transferModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">تحويل: {transferModal.item_name}</div>
            <div className="form-grid">
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <label>الوجهة *</label>
                <select value={tForm.destination} onChange={e => setTForm({...tForm, destination: e.target.value})}>
                  <option value="">-- اختر الوجهة --</option>
                  <option value="working">الراجع الشغال</option>
                  <option value="damaged">الراجع التالف</option>
                  <option value="customer_return">الراجع للزبون بعد الفحص</option>
                </select>
              </div>
              {(tForm.destination === 'working' || tForm.destination === 'damaged') && (
                <div className="form-group">
                  <label>السعر</label>
                  <input type="number" value={tForm.price} onChange={e => setTForm({...tForm, price: +e.target.value})} />
                </div>
              )}
              {tForm.destination === 'damaged' && (
                <div className="form-group">
                  <label>نوع التعويض</label>
                  <select value={tForm.compensation_type} onChange={e => setTForm({...tForm, compensation_type: e.target.value})}>
                    <option value="full">تعويض كامل</option>
                    <option value="half">تعويض نصفي</option>
                  </select>
                </div>
              )}
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <label>ملاحظة</label>
                <textarea rows="2" value={tForm.note} onChange={e => setTForm({...tForm, note: e.target.value})} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setTransferModal(null)}>إلغاء</button>
              <button className="btn btn-primary" onClick={doTransfer}>✅ تأكيد التحويل</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
