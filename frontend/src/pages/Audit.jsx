import { useState, useEffect } from 'react';
import axios from 'axios';

const PROBLEM_TYPES = [
  { value: 'warranty_working_after_inspection', label: 'داخل الضمان/ شغال بعد الفحص', dest: 'working', auto: true },
  { value: 'warranty_writing_error', label: 'داخل الضمان/ خطا كتابة', dest: 'working', auto: true },
  { value: 'warranty_high_price', label: 'داخل الضمان/ سعر مرتفع', dest: 'working', auto: true },
  { value: 'warranty_prep_error', label: 'داخل الضمان/ خطا تجهيز و جرد', dest: 'working', auto: true },
  { value: 'warranty_factory_defect', label: 'داخل الضمان/ تالف او خلل مصنعي', dest: 'damaged', auto: true },
  { value: 'not_ours', label: 'ليست لنا', dest: 'customer_return', auto: true },
  { value: 'out_warranty_working', label: 'خارج الضمان/ شغال', dests: ['working','customer_return','damaged'], auto: false },
  { value: 'out_warranty_broken', label: 'خارج الضمان/ كسر', dests: ['damaged','customer_return'], auto: false },
  { value: 'out_warranty_damaged', label: 'خارج الضمان/ تالف', dests: ['damaged','customer_return'], auto: false, needsNote: true },
  { value: 'out_warranty_used', label: 'خارج الضمان/ مستخدم', dests: ['damaged','customer_return'], auto: false, needsNote: true },
  { value: 'out_warranty_expired', label: 'خارج الضمان/ منتهي الصالحية', dests: ['damaged','customer_return'], auto: false, needsNote: true },
  { value: 'out_warranty_factory_fault', label: 'خارج الضمان/ عطل مصنعي', dests: ['damaged','customer_return'], auto: false, needsNote: true },
  { value: 'return_damaged', label: 'راجع تالف', dest: 'damaged', auto: true },
  { value: 'pending', label: 'معلق', dest: 'pending', auto: true },
];

const DEST_LABELS = { working: 'الراجع الشغال', damaged: 'الراجع التالف', customer_return: 'الراجع للزبون بعد الفحص', pending: 'المعلق' };
const DEST_COLORS = { working: 'badge-green', damaged: 'badge-red', customer_return: 'badge-blue', pending: 'badge-orange' };

export default function Audit() {
  const [customers, setCustomers] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState({ customer_code: '', list_sequence: '' });
  const [msg, setMsg] = useState('');
  const [transferModal, setTransferModal] = useState(null);
  const [transferForm, setTransferForm] = useState({ qty: 1, destination: '', note: '', compensation_type: 'full', price: 0 });
  const [editQtys, setEditQtys] = useState({});

  const getEditQty = (item) => {
    const v = editQtys[item.id];
    return v === undefined ? item.qty_remaining : v;
  };

  const clearEditQty = (itemId) => {
    setEditQtys(prev => { const cp = { ...prev }; delete cp[itemId]; return cp; });
  };

  useEffect(() => { axios.get('/api/customers').then(r => setCustomers(r.data)); }, []);

  const loadSequences = (code) => {
    if (code) axios.get(`/api/reception/sequences/${code}`).then(r => setSequences(r.data));
  };

  const load = () => {
    if (!filter.customer_code && !filter.list_sequence) return;
    const p = new URLSearchParams(filter).toString();
    axios.get(`/api/audit?${p}`).then(r => setItems(r.data));
  };

  useEffect(() => { load(); }, [filter.list_sequence, filter.customer_code]);

  const getProblemType = (v) => PROBLEM_TYPES.find(p => p.value === v);

  const openTransfer = (item) => {
    setTransferModal(item);
    setTransferForm({ qty: getEditQty(item), destination: '', note: '', compensation_type: 'full', price: item.price || 0 });
  };

  const doTransfer = async () => {
    const { qty, destination, note, compensation_type, price } = transferForm;
    const item = transferModal;
    const pt = PROBLEM_TYPES.find(p => p.value === item.problem_type);
    const dest = pt?.auto ? pt.dest : destination;
    if (!dest) return setMsg('❌ اختر الوجهة');
    if (qty < 1 || qty > item.qty_remaining) return setMsg('❌ كمية غير صحيحة');
    try {
      await axios.post('/api/audit/transfer', {
        audit_item_id: item.id, qty: +qty, problem_type: item.problem_type,
        destination: dest, note, compensation_type, price: +price
      });
      setTransferModal(null);
      setMsg(`✅ تم نقل ${qty} وحدة إلى "${DEST_LABELS[dest]}"`);
      clearEditQty(item.id);
      load();
    } catch (e) { setMsg('❌ ' + (e.response?.data?.error || 'خطأ')); }
  };

  const autoTransfer = async (item) => {
    const pt = getProblemType(item.problem_type);
    if (!pt?.auto || !item.problem_type) return;
    const qty = +getEditQty(item);
    if (qty < 1 || qty > item.qty_remaining) return setMsg('❌ كمية غير صحيحة');
    try {
      await axios.post('/api/audit/transfer', {
        audit_item_id: item.id, qty,
        problem_type: item.problem_type, destination: pt.dest,
        note: item.note, compensation_type: 'full', price: item.price
      });
      setMsg(`✅ تم نقل ${qty} من "${item.item_name}" إلى "${DEST_LABELS[pt.dest]}"`);
      clearEditQty(item.id);
      load();
    } catch (e) { setMsg('❌ ' + (e.response?.data?.error || 'خطأ')); }
  };

  const setProblemType = async (itemId, value) => {
    const updated = items.map(i => i.id === itemId ? { ...i, problem_type: value } : i);
    setItems(updated);
    const item = updated.find(i => i.id === itemId);
    const pt = getProblemType(value);
    if (pt?.auto) {
      setTimeout(() => autoTransfer(item), 200);
    }
  };

  const selectedCustomer = customers.find(c => c.customer_code === filter.customer_code);

  return (
    <>
      <div className="page-header">
        <div><div className="page-title">🔍 مرحلة التدقيق</div><div className="page-subtitle">المرحلة الثالثة - اتخاذ القرار</div></div>
      </div>

      {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`}>{msg}</div>}

      <div className="card">
        <div className="card-title">اختيار الزبون والتسلسل</div>
        <div className="form-grid">
          <div className="form-group">
            <label>الزبون *</label>
            <select value={filter.customer_code} onChange={e => { setFilter({...filter, customer_code: e.target.value, list_sequence: ''}); loadSequences(e.target.value); }}>
              <option value="">اختر الزبون</option>
              {customers.map(c => <option key={c.id} value={c.customer_code}>{c.name} ({c.customer_code})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>تسلسل القائمة *</label>
            <select value={filter.list_sequence} onChange={e => setFilter({...filter, list_sequence: e.target.value})}>
              <option value="">اختر التسلسل</option>
              {sequences.map(s => <option key={s.list_sequence} value={s.list_sequence}>{s.list_sequence} - {s.receipt_date}</option>)}
            </select>
          </div>
        </div>
        {selectedCustomer && <div className="info-row" style={{marginTop:'12px'}}>
          <span className="info-chip">الزبون: {selectedCustomer.name}</span>
          <span className="info-chip">الرمز: {selectedCustomer.customer_code}</span>
        </div>}
      </div>

      {items.length === 0 && filter.list_sequence ? (
        <div className="empty-state"><div className="icon">✅</div><p>لا توجد عناصر بانتظار التدقيق</p></div>
      ) : items.length > 0 && (
        <div className="card">
          <div className="card-title">عناصر التدقيق ({items.length})</div>
          <div className="alert alert-info">
            ملاحظة: يمكن تقسيم الكمية - عدّل قيمة "المتبقية" لتحديد كمية جزئية قبل اختيار نوع المشكلة، وسيبقى الباقي في التدقيق لاختيار خيار مختلف له
          </div>
          <div className="table-wrapper">
            <table>
              <thead><tr>
                <th>#</th><th>اسم العنصر</th><th>الكمية الأصلية</th><th>المتبقية</th>
                <th>تاريخ الاستلام</th><th>تاريخ الجرد</th><th>تسلسل القائمة</th>
                <th>نوع المشكلة</th><th>ملاحظة</th><th>إجراء</th>
              </tr></thead>
              <tbody>
                {items.map((item, i) => {
                  const pt = getProblemType(item.problem_type);
                  return (
                    <tr key={item.id}>
                      <td>{i+1}</td>
                      <td><strong>{item.item_name}</strong></td>
                      <td>{item.qty_original}</td>
                      <td>
                        <input type="number" min="1" max={item.qty_remaining} value={getEditQty(item)}
                          onChange={e => setEditQtys({ ...editQtys, [item.id]: e.target.value })}
                          style={{width:'70px', fontWeight:'bold', color:'var(--primary)'}} />
                        <div style={{fontSize:'0.7rem', color:'var(--muted)'}}>من {item.qty_remaining}</div>
                      </td>
                      <td>{item.receipt_date || '-'}</td>
                      <td>{item.count_date || '-'}</td>
                      <td><span className="badge badge-blue">{item.list_sequence}</span></td>
                      <td>
                        <select value={item.problem_type || ''} onChange={e => setProblemType(item.id, e.target.value)}
                          style={{minWidth:'220px', fontSize:'0.8rem'}}>
                          <option value="">-- اختر نوع المشكلة --</option>
                          {PROBLEM_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                        {pt && <div style={{marginTop:'4px'}}><span className={`badge ${DEST_COLORS[pt.dest || pt.dests?.[0]]}`} style={{fontSize:'0.7rem'}}>
                          {pt.auto ? `↠ ${DEST_LABELS[pt.dest]}` : `يتطلب اختيار الوجهة`}
                        </span></div>}
                      </td>
                      <td>{item.note || '-'}</td>
                      <td>
                        {item.problem_type && !pt?.auto && (
                          <button className="btn btn-primary btn-xs" onClick={() => openTransfer(item)}>
                            نقل ➜
                          </button>
                        )}
                        {item.problem_type && pt?.auto && (
                          <span style={{color:'var(--success)', fontSize:'0.8rem'}}>تلقائي ✓</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {transferModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">نقل العنصر: {transferModal.item_name}</div>
            <div className="alert alert-info">الكمية المتبقية: <strong>{transferModal.qty_remaining}</strong></div>
            <div className="form-grid">
              <div className="form-group">
                <label>الكمية للنقل *</label>
                <input type="number" min="1" max={transferModal.qty_remaining} value={transferForm.qty}
                  onChange={e => setTransferForm({...transferForm, qty: +e.target.value})} />
              </div>
              <div className="form-group">
                <label>الوجهة *</label>
                <select value={transferForm.destination} onChange={e => setTransferForm({...transferForm, destination: e.target.value})}>
                  <option value="">-- اختر الوجهة --</option>
                  {(getProblemType(transferModal.problem_type)?.dests || []).map(d =>
                    <option key={d} value={d}>{DEST_LABELS[d]}</option>
                  )}
                </select>
              </div>
              {(transferForm.destination === 'working' || transferForm.destination === 'damaged') && (
                <div className="form-group">
                  <label>السعر</label>
                  <input type="number" value={transferForm.price} onChange={e => setTransferForm({...transferForm, price: +e.target.value})} />
                </div>
              )}
              {transferForm.destination === 'damaged' && (
                <div className="form-group">
                  <label>نوع التعويض</label>
                  <select value={transferForm.compensation_type} onChange={e => setTransferForm({...transferForm, compensation_type: e.target.value})}>
                    <option value="full">تعويض كامل</option>
                    <option value="half">تعويض نصفي</option>
                  </select>
                </div>
              )}
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <label>ملاحظة</label>
                <textarea rows="2" value={transferForm.note} onChange={e => setTransferForm({...transferForm, note: e.target.value})} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setTransferModal(null)}>إلغاء</button>
              <button className="btn btn-primary" onClick={doTransfer}>✅ تأكيد النقل</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
