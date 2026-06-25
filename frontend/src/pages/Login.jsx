import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ في تسجيل الدخول');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>📦 نظام الراجع</h1>
        <p className="subtitle">Returns Management System</p>
        {error && <div className="login-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>اسم المستخدم</label>
            <input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})}
              placeholder="أدخل اسم المستخدم" required autoFocus />
          </div>
          <div className="form-group">
            <label>كلمة المرور</label>
            <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
              placeholder="أدخل كلمة المرور" required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '⏳ جارٍ الدخول...' : '🔐 تسجيل الدخول'}
          </button>
        </form>
        <div style={{marginTop:'20px', padding:'12px', background:'#f5f9ff', borderRadius:'8px', fontSize:'0.8rem', color:'#546e7a'}}>
          <strong>حسابات تجريبية:</strong><br/>
          admin / admin123 &nbsp;|&nbsp; reception / 123456<br/>
          inventory / 123456 &nbsp;|&nbsp; auditor / 123456 &nbsp;|&nbsp; manager / 123456
        </div>
      </div>
    </div>
  );
}
