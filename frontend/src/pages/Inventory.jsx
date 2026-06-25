import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function Inventory() {
  const [customers, setCustomers] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState({ customer_code: '', list_sequence: '' });
  const [form, setForm] = useState({ item_name: '', qty: 1, barcode: '', note: '' });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [msg, setMsg] = useState('');
  const [inspector, setInspector] = useState('');
  const barcodeRef = useRef();

  useEffect(() => { axios.get('/api/customers').then(r => setCustomers(r.data)); }, []);

  const loadSequences = (code) => {
    if (!code) return;
    axios.get(`/api/reception/sequences/${code}`).then(r => setSequences(r.data));
  };

  const loadItems = () => {
    if (!filter.list_sequence && !filter.customer_code) return;
    const p = new URLSearchParams(filter).toString();
    axios.get(`/api/inventory?${p}`).then(r => setItems(r.data));
  };

  useEffect(() => { loadItems(); }, [filter.list_sequence]);

  const selectedCustomer = customers.find(c => c.customer_code === filter.customer_code);
  const selectedSeq = sequences.find(s => s.list_sequence === filter.list_sequence);

  const addItem = async () => {
    if (!filter.list_sequence || !filter.customer_code) return setMsg('❌ اختر الزبون والتسلسل أولاً');
    if (!form.item_name) return setMsg('❌ أدخل اسم العنصر');
    try {
      await axios.post('/api/inventory/item', {
        ...form, list_sequence: filter.list_sequence,
        customer_code: filter.customer_code,
        customer_name: selectedCustomer?.name,
        receipt_date: selectedSeq?.receipt_date,
        price: selectedCustomer?.default_price || 0
      });
      setMsg('✅ تم الإضافة');
      setForm({ item_name: '', qty: 1, barcode: '', note: '' });
      loadItems();
      barcodeRef.current?.focus();
    } catch (e) { setMsg('❌ ' + (e.response?.data?.error || 'خطأ')); }
  };

  const handleBarcodeScan = (e) => {
    if (e.key === 'Enter' && form.barcode) {
      // Use barcode as item name if no name entered
      if (!form.item_name) setForm(f => ({ ...f, item_name: f.barcode }));
      addItem();
    }
  };

  const deleteItem = async (id) => {
    if (!confirm('حذف العنصر؟')) return;
    await axios.delete(`/api/inventory/item/${id}`);
    loadItems();
  };

  const saveEdit = async (id) => {
    await axios.put(`/api/inventory/item/${id}`, editForm);
    setEditId(null);
    loadItems();
  };

  const sendToAudit = async () => {
    if (!filter.list_sequence) return;
    const insp = inspector || prompt('اسم المسؤول عن الجرد:');
    if (!insp) return;
    try {
      const { data } = await axios.post('/api/inventory/send-to-audit', {
        list_sequence: filter.list_sequence, customer_code: filter.customer_code, inspector_name: insp
      });
      setMsg(`✅ تم إرسال ${data.count} عنصر إلى التدقيق`);
      loadItems();
    } catch (e) { setMsg('❌ ' + (e.response?.data?.error || 'خطأ')); }
  };

  const exportExcel = () => window.open('/api/export/inventory_items', '_blank');

  const pendingItems = items.filter(i => i.status === 'audit');

  return (
    <>
      <div className="page-header">
        <div><div className="page-title">📋 مرحلة الجرد</div><div className="page-subtitle">المرحلة الثانية</div></div>
        <div style={{display:'flex', gap:'8px'}}>
          <button className="btn btn-secondary btn-sm" onClick={exportExcel}>📊 تصدير Excel</button>
          {pendingItems.length > 0 && <button className="btn btn-success" onClick={sendToAudit}>▶️ إرسال للتدقيق ({pendingItems.length})</button>}
        </div>
      </div>

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
          <div className="form-group">
            <label>اسم مسؤول الجرد</label>
            <input value={inspector} onChange={e => setInspector(e.target.value)} placeholder="اسم المسؤول" />
          </div>
        </div>
        {selectedCustomer && filter.list_sequence && (
          <div className="info-row" style={{marginTop:'12px'}}>
            <span className="info-chip">الزبون: {selectedCustomer.name}</span>
            <span className="info-chip">الرمز: {selectedCustomer.customer_code}</span>
            <span className="info-chip">السعر الافتراضي: {selectedCustomer.default_price}</span>
            <span className="info-chip">التسلسل: {filter.list_sequence}</span>
          </div>
        )}
      </div>

      {filter.list_sequence && (
        <div className="card">
          <div className="card-title">إضافة عنصر</div>
          <div className="form-grid">
            <div className="form-group">
              <label>باركود (امسح أو أدخل يدوياً)</label>
              <input ref={barcodeRef} value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})}
                onKeyDown={handleBarcodeScan} placeholder="امسح الباركود أو أدخله..." />
            </div>
            <div className="form-group">
              <label>اسم العنصر *</label>
              <input value={form.item_name} onChange={e => setForm({...form, item_name: e.target.value})} placeholder="اسم المنتج" />
            </div>
            <div className="form-group">
              <label>الكمية *</label>
              <input type="number" min="1" value={form.qty} onChange={e => setForm({...form, qty: +e.target.value})} />
            </div>
            <div className="form-group">
              <label>ملاحظة</label>
              <input value={form.note} onChange={e => setForm({...form, note: e.target.value})} placeholder="ملاحظة اختيارية" />
            </div>
          </div>
          <div style={{marginTop:'12px', display:'flex', gap:'8px'}}>
            <button className="btn btn-primary" onClick={addItem}>➕ إضافة</button>
            <span style={{fontSize:'0.8rem', color:'var(--text-light)', alignSelf:'center'}}>أو اضغط Enter بعد مسح الباركود</span>
          </div>
          {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`} style={{marginTop:'10px'}}>{msg}</div>}
        </div>
      )}

      {items.length > 0 && (
        <div className="card">
          <div className="card-title">عناصر الجرد ({items.length})</div>
          <div className="table-wrapper">
            <table>
              <thead><tr>
                <th>#</th><th>اسم العنصر</th><th>الكمية</th><th>الكمية المتبقية</th>
                <th>الباركود</th><th>ملاحظة</th><th>الحالة</th><th>إجراءات</th>
              </tr></thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id}>
                    <td>{i+1}</td>
                    <td>
                      {editId === item.id
                        ? <input value={editForm.item_name} onChange={e => setEditForm({...editForm, item_name: e.target.value})} style={{width:'100%'}} />
                        : item.item_name}
                    </td>
                    <td>
                      {editId === item.id
                        ? <input type="number" value={editForm.qty} onChange={e => setEditForm({...editForm, qty: +e.target.value})} style={{width:'70px'}} />
                        : item.qty}
                    </td>
                    <td>{item.qty_remaining}</td>
                    <td>{item.barcode || '-'}</td>
                    <td>
                      {editId === item.id
                        ? <input value={editForm.note||''} onChange={e => setEditForm({...editForm, note: e.target.value})} />
                        : item.note || '-'}
                    </td>
                    <td>
                      <span className={`badge ${item.status === 'audit' ? 'badge-blue' : item.status === 'sent_to_audit' ? 'badge-green' : 'badge-grey'}`}>
                        {item.status === 'audit' ? 'بانتظار التدقيق' : item.status === 'sent_to_audit' ? 'أُرسل للتدقيق' : item.status}
                      </span>
                    </td>
                    <td>
                      <div className="td-actions">
                        {editId === item.id ? <>
                          <button className="btn btn-success btn-xs" onClick={() => saveEdit(item.id)}>💾</button>
                          <button className="btn btn-secondary btn-xs" onClick={() => setEditId(null)}>✖</button>
                        </> : <>
                          {item.status === 'audit' && <>
                            <button className="btn btn-outline btn-xs" onClick={() => { setEditId(item.id); setEditForm({item_name: item.item_name, qty: item.qty, note: item.note||''}); }}>✏️</button>
                            <button className="btn btn-danger btn-xs" onClick={() => deleteItem(item.id)}>🗑️</button>
                          </>}
                        </>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
