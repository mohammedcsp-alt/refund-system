import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ customer_code: '', name: '', default_price: 0 });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [msg, setMsg] = useState('');

  const load = () => axios.get('/api/customers').then(r => setCustomers(r.data));
  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/customers', form);
      setMsg('✅ تمت إضافة الزبون');
      setForm({ customer_code: '', name: '', default_price: 0 });
      load();
    } catch (e) { setMsg('❌ ' + (e.response?.data?.error || 'خطأ')); }
  };

  const saveEdit = async (id) => {
    await axios.put(`/api/customers/${id}`, editForm);
    setEditId(null); load();
  };

  return (
    <>
      <div className="page-header">
        <div><div className="page-title">👥 إدارة الزبائن</div></div>
      </div>
      {msg && <div className={`alert ${msg.startsWith('✅')?'alert-success':'alert-danger'}`}>{msg}</div>}

      <div className="card">
        <div className="card-title">إضافة زبون جديد</div>
        <form onSubmit={handleAdd}>
          <div className="form-grid">
            <div className="form-group">
              <label>رمز الزبون *</label>
              <input value={form.customer_code} onChange={e => setForm({...form, customer_code: e.target.value})} placeholder="مثال: C004" required />
            </div>
            <div className="form-group">
              <label>اسم الزبون *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="الاسم الكامل" required />
            </div>
            <div className="form-group">
              <label>السعر الافتراضي</label>
              <input type="number" value={form.default_price} onChange={e => setForm({...form, default_price: +e.target.value})} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{marginTop:'12px'}}>➕ إضافة</button>
        </form>
      </div>

      <div className="card">
        <div className="card-title">قائمة الزبائن ({customers.length})</div>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>#</th><th>الرمز</th><th>الاسم</th><th>السعر الافتراضي</th><th>إجراءات</th></tr></thead>
            <tbody>
              {customers.map((c, i) => (
                <tr key={c.id}>
                  <td>{i+1}</td>
                  <td><span className="badge badge-blue">{c.customer_code}</span></td>
                  <td>{editId===c.id ? <input value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})} style={{width:'100%'}} /> : c.name}</td>
                  <td>{editId===c.id ? <input type="number" value={editForm.default_price} onChange={e=>setEditForm({...editForm,default_price:+e.target.value})} style={{width:'90px'}} /> : c.default_price}</td>
                  <td>
                    {editId===c.id ? <>
                      <button className="btn btn-success btn-xs" onClick={() => saveEdit(c.id)}>💾</button>
                      <button className="btn btn-secondary btn-xs" style={{marginRight:'6px'}} onClick={() => setEditId(null)}>✖</button>
                    </> : (
                      <button className="btn btn-outline btn-xs" onClick={() => { setEditId(c.id); setEditForm({name:c.name, default_price:c.default_price}); }}>✏️ تعديل</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
