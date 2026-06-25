import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';

const ROLES = [
  { value: 'admin', label: 'مدير النظام' },
  { value: 'reception', label: 'موظف الاستلام' },
  { value: 'inventory', label: 'موظف الجرد' },
  { value: 'auditor', label: 'المدقق' },
  { value: 'manager', label: 'المدير (عرض فقط)' },
];

const ROLE_COLORS = { admin: 'badge-red', reception: 'badge-green', inventory: 'badge-blue', auditor: 'badge-orange', manager: 'badge-grey' };

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'reception' });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [msg, setMsg] = useState('');
  const { user: me } = useAuth();

  const load = () => axios.get('/api/users').then(r => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/users', form);
      setMsg('✅ تمت إضافة المستخدم');
      setForm({ username: '', password: '', full_name: '', role: 'reception' });
      load();
    } catch (e) { setMsg('❌ ' + (e.response?.data?.error || 'خطأ')); }
  };

  const saveEdit = async (id) => {
    await axios.put(`/api/users/${id}`, editForm);
    setEditId(null); load(); setMsg('✅ تم التحديث');
  };

  const deleteUser = async (id) => {
    if (!confirm('حذف المستخدم؟')) return;
    try {
      await axios.delete(`/api/users/${id}`);
      load(); setMsg('✅ تم الحذف');
    } catch (e) { setMsg('❌ ' + (e.response?.data?.error || 'خطأ')); }
  };

  const ROLE_PERMISSIONS = {
    admin: ['لوحة التحكم', 'استلام الراجع', 'الجرد', 'التدقيق', 'الراجع الشغال', 'الراجع التالف', 'راجع للزبون', 'المعلقة', 'الزبائن', 'المستخدمين'],
    reception: ['لوحة التحكم', 'استلام الراجع'],
    inventory: ['لوحة التحكم', 'استلام الراجع', 'الجرد'],
    auditor: ['لوحة التحكم', 'التدقيق', 'الراجع الشغال', 'الراجع التالف', 'راجع للزبون', 'المعلقة'],
    manager: ['لوحة التحكم', 'التدقيق (عرض)', 'الراجع الشغال (عرض)', 'الراجع التالف (عرض)', 'جميع التقارير'],
  };

  return (
    <>
      <div className="page-header">
        <div><div className="page-title">⚙️ إدارة المستخدمين</div><div className="page-subtitle">إدارة الحسابات وصلاحيات الوصول</div></div>
      </div>

      {msg && <div className={`alert ${msg.startsWith('✅')?'alert-success':'alert-danger'}`}>{msg}</div>}

      <div className="card">
        <div className="card-title">إضافة مستخدم جديد</div>
        <form onSubmit={handleAdd}>
          <div className="form-grid">
            <div className="form-group">
              <label>اسم المستخدم *</label>
              <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="username" required />
            </div>
            <div className="form-group">
              <label>كلمة المرور *</label>
              <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="كلمة المرور" required />
            </div>
            <div className="form-group">
              <label>الاسم الكامل *</label>
              <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} placeholder="الاسم الكامل بالعربية" required />
            </div>
            <div className="form-group">
              <label>الدور *</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{marginTop:'12px'}}>➕ إضافة مستخدم</button>
        </form>
      </div>

      <div className="card">
        <div className="card-title">مستخدمو النظام ({users.length})</div>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>#</th><th>اسم المستخدم</th><th>الاسم الكامل</th><th>الدور</th><th>الصلاحيات</th><th>تاريخ الإنشاء</th><th>إجراءات</th></tr></thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id}>
                  <td>{i+1}</td>
                  <td><strong>{u.username}</strong></td>
                  <td>{editId===u.id ? <input value={editForm.full_name} onChange={e=>setEditForm({...editForm,full_name:e.target.value})} style={{width:'100%'}} /> : u.full_name}</td>
                  <td>
                    {editId===u.id
                      ? <select value={editForm.role} onChange={e=>setEditForm({...editForm,role:e.target.value})}>
                          {ROLES.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      : <span className={`badge ${ROLE_COLORS[u.role]}`}>{ROLES.find(r=>r.value===u.role)?.label}</span>
                    }
                  </td>
                  <td>
                    <div style={{display:'flex', flexWrap:'wrap', gap:'4px', maxWidth:'250px'}}>
                      {(ROLE_PERMISSIONS[editId===u.id ? editForm.role : u.role] || []).map(p => (
                        <span key={p} style={{background:'#e3f2fd', color:'#0d47a1', padding:'1px 6px', borderRadius:'10px', fontSize:'0.7rem'}}>{p}</span>
                      ))}
                    </div>
                  </td>
                  <td>{u.created_at?.slice(0,10)}</td>
                  <td>
                    <div className="td-actions">
                      {editId===u.id ? <>
                        <div className="form-group" style={{margin:0}}>
                          <input type="password" placeholder="كلمة مرور جديدة (اختياري)" value={editForm.password||''} onChange={e=>setEditForm({...editForm,password:e.target.value})} style={{width:'150px',fontSize:'0.8rem'}} />
                        </div>
                        <button className="btn btn-success btn-xs" onClick={() => saveEdit(u.id)}>💾</button>
                        <button className="btn btn-secondary btn-xs" onClick={() => setEditId(null)}>✖</button>
                      </> : <>
                        <button className="btn btn-outline btn-xs" onClick={() => { setEditId(u.id); setEditForm({full_name:u.full_name, role:u.role, password:''}); }}>✏️</button>
                        {u.id !== me?.id && <button className="btn btn-danger btn-xs" onClick={() => deleteUser(u.id)}>🗑️</button>}
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-title">جدول الصلاحيات</div>
        <div className="table-wrapper">
          <table>
            <thead><tr>
              <th>الوظيفة</th>
              {ROLES.map(r => <th key={r.value}>{r.label}</th>)}
            </tr></thead>
            <tbody>
              {[
                ['لوحة التحكم', true, true, true, true, true],
                ['استلام الراجع', true, true, true, false, false],
                ['الجرد', true, false, true, false, false],
                ['التدقيق', true, false, false, true, true],
                ['الراجع الشغال', true, false, false, true, true],
                ['الراجع التالف', true, false, false, true, true],
                ['الراجع للزبون', true, false, false, true, true],
                ['المعلقة', true, false, false, true, true],
                ['إدارة الزبائن', true, false, false, false, true],
                ['إدارة المستخدمين', true, false, false, false, false],
              ].map(([name, ...perms]) => (
                <tr key={name}>
                  <td><strong>{name}</strong></td>
                  {perms.map((p, i) => <td key={i} style={{textAlign:'center'}}>{p ? '✅' : '❌'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
