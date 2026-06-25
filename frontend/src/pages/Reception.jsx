import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function Reception() {
  const [records, setRecords] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ customer_code: '', customer_name: '', receiver_name: '', receipt_date: today(), carton_qty: 0, piece_qty: 0 });
  const [filter, setFilter] = useState({ customer_code: '', date_from: '', date_to: '' });
  const [msg, setMsg] = useState('');
  const [printLabel, setPrintLabel] = useState(null);
  const printRef = useRef();

  function today() { return new Date().toISOString().slice(0,10); }

  const load = () => {
    const p = new URLSearchParams(filter).toString();
    axios.get(`/api/reception?${p}`).then(r => setRecords(r.data));
  };

  useEffect(() => {
    axios.get('/api/customers').then(r => setCustomers(r.data));
    load();
  }, []);

  const onCustomerChange = (code) => {
    const c = customers.find(x => x.customer_code === code);
    setForm(f => ({ ...f, customer_code: code, customer_name: c?.name || '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post('/api/reception', form);
      setMsg(`✅ تم الحفظ - تسلسل القائمة: ${data.list_sequence}`);
      setPrintLabel({ ...form, list_sequence: data.list_sequence });
      load();
      setForm(f => ({ ...f, carton_qty: 0, piece_qty: 0 }));
    } catch (e) {
      setMsg('❌ خطأ: ' + (e.response?.data?.error || 'حدث خطأ'));
    }
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    w.document.write(`
      <html dir="rtl"><head><title>ملصق الاستلام</title>
      <style>body{font-family:monospace;padding:20px}
      .label{border:3px solid black;padding:20px;display:inline-block;min-width:300px;text-align:center}
      h2{font-size:1.4rem;margin-bottom:10px}
      p{font-size:1rem;margin:6px 0}
      .big{font-size:1.6rem;font-weight:bold;border:2px solid black;padding:8px;margin:10px 0}
      </style></head><body>
      <div class="label">
        <h2>📦 ملصق استلام الراجع</h2>
        <p>الزبون: <strong>${printLabel.customer_name}</strong></p>
        <p>الرقم: <strong>${printLabel.customer_code}</strong></p>
        <div class="big">${printLabel.list_sequence}</div>
        <p>تاريخ الاستلام: <strong>${printLabel.receipt_date}</strong></p>
        <p>كراتين: ${printLabel.carton_qty} | قطع: ${printLabel.piece_qty}</p>
        <p>المستلم: ${printLabel.receiver_name}</p>
      </div>
      <script>window.print();window.close();</script>
      </body></html>`);
  };

  return (
    <>
      <div className="page-header">
        <div><div className="page-title">📥 مرحلة استلام الراجع</div><div className="page-subtitle">المرحلة الأولى</div></div>
      </div>

      <div className="card">
        <div className="card-title">إضافة استلام جديد</div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>الزبون *</label>
              <select value={form.customer_code} onChange={e => onCustomerChange(e.target.value)} required>
                <option value="">اختر الزبون</option>
                {customers.map(c => <option key={c.id} value={c.customer_code}>{c.name} ({c.customer_code})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>اسم المستلم *</label>
              <input value={form.receiver_name} onChange={e => setForm({...form, receiver_name: e.target.value})} placeholder="اسم المستلم" required />
            </div>
            <div className="form-group">
              <label>تاريخ الاستلام *</label>
              <input type="date" value={form.receipt_date} onChange={e => setForm({...form, receipt_date: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>عدد الكراتين</label>
              <input type="number" min="0" value={form.carton_qty} onChange={e => setForm({...form, carton_qty: +e.target.value})} />
            </div>
            <div className="form-group">
              <label>عدد القطع (علاكة)</label>
              <input type="number" min="0" value={form.piece_qty} onChange={e => setForm({...form, piece_qty: +e.target.value})} />
            </div>
          </div>
          <div style={{display:'flex', gap:'12px', marginTop:'16px'}}>
            <button type="submit" className="btn btn-primary">💾 حفظ وتوليد التسلسل</button>
            {printLabel && <button type="button" className="btn btn-secondary" onClick={handlePrint}>🖨️ طباعة الملصق</button>}
          </div>
          {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`} style={{marginTop:'12px'}}>{msg}</div>}
        </form>
      </div>

      <div className="card">
        <div className="card-title">سجلات الاستلام</div>
        <div className="filter-bar">
          <div className="form-group">
            <label>فلتر بالزبون</label>
            <select value={filter.customer_code} onChange={e => setFilter({...filter, customer_code: e.target.value})}>
              <option value="">الكل</option>
              {customers.map(c => <option key={c.id} value={c.customer_code}>{c.name}</option>)}
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
          <button className="btn btn-outline btn-sm" onClick={() => setFilter({ customer_code:'', date_from:'', date_to:'' })}>إعادة تعيين</button>
        </div>

        {records.length === 0 ? (
          <div className="empty-state"><div className="icon">📭</div><p>لا توجد سجلات</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr>
                <th>تسلسل القائمة</th><th>الزبون</th><th>رقم الزبون</th>
                <th>المستلم</th><th>تاريخ الاستلام</th><th>كراتين</th><th>قطع</th>
              </tr></thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id}>
                    <td><span className="badge badge-blue">{r.list_sequence}</span></td>
                    <td>{r.customer_name}</td>
                    <td>{r.customer_code}</td>
                    <td>{r.receiver_name}</td>
                    <td>{r.receipt_date}</td>
                    <td>{r.carton_qty}</td>
                    <td>{r.piece_qty}</td>
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
