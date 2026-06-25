import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Reception from './pages/Reception';
import Inventory from './pages/Inventory';
import Audit from './pages/Audit';
import WorkingReturns from './pages/WorkingReturns';
import DamagedReturns from './pages/DamagedReturns';
import CustomerReturns from './pages/CustomerReturns';
import PendingItems from './pages/PendingItems';
import Admin from './pages/Admin';
import Customers from './pages/Customers';

const ROLE_LABELS = {
  admin: 'مدير النظام', reception: 'الاستلام', inventory: 'الجرد',
  auditor: 'المدقق', manager: 'المدير'
};

function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const can = (...roles) => roles.includes(user?.role);

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <h2>📦 نظام الراجع</h2>
        <p>Returns Management System</p>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/" end className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>
          <span className="nav-icon">🏠</span> لوحة التحكم
        </NavLink>

        {can('admin','reception','inventory') && <>
          <div className="nav-section">المراحل</div>
          <NavLink to="/reception" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>
            <span className="nav-icon">📥</span> استلام الراجع
          </NavLink>
        </>}

        {can('admin','inventory') && (
          <NavLink to="/inventory" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>
            <span className="nav-icon">📋</span> الجرد
          </NavLink>
        )}

        {can('admin','auditor','manager') && <>
          <div className="nav-section">التدقيق</div>
          <NavLink to="/audit" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>
            <span className="nav-icon">🔍</span> مرحلة التدقيق
          </NavLink>
          <NavLink to="/working-returns" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>
            <span className="nav-icon">✅</span> الراجع الشغال
          </NavLink>
          <NavLink to="/damaged-returns" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>
            <span className="nav-icon">⚠️</span> الراجع التالف
          </NavLink>
          <NavLink to="/customer-returns" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>
            <span className="nav-icon">🔄</span> راجع للزبون
          </NavLink>
          <NavLink to="/pending-items" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>
            <span className="nav-icon">⏳</span> الايتمات المعلقة
          </NavLink>
        </>}

        {can('admin','manager') && <>
          <div className="nav-section">الإدارة</div>
          <NavLink to="/customers" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>
            <span className="nav-icon">👥</span> الزبائن
          </NavLink>
        </>}

        {can('admin') && (
          <NavLink to="/admin" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>
            <span className="nav-icon">⚙️</span> إدارة المستخدمين
          </NavLink>
        )}
      </nav>
      <div className="sidebar-footer">
        <div className="user-name">👤 {user?.full_name}</div>
        <div className="user-role">{ROLE_LABELS[user?.role]}</div>
        <button className="logout-btn" onClick={() => { logout(); navigate('/login'); }}>
          🚪 تسجيل الخروج
        </button>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner"/><p>جارٍ التحميل...</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return (
    <div className="main-content">
      <div className="alert alert-danger">ليس لديك صلاحية للوصول إلى هذه الصفحة</div>
    </div>
  );
  return children;
}

function Layout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">{children}</div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/reception" element={<ProtectedRoute roles={['admin','reception','inventory']}><Layout><Reception /></Layout></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute roles={['admin','inventory']}><Layout><Inventory /></Layout></ProtectedRoute>} />
          <Route path="/audit" element={<ProtectedRoute roles={['admin','auditor','manager']}><Layout><Audit /></Layout></ProtectedRoute>} />
          <Route path="/working-returns" element={<ProtectedRoute roles={['admin','auditor','manager']}><Layout><WorkingReturns /></Layout></ProtectedRoute>} />
          <Route path="/damaged-returns" element={<ProtectedRoute roles={['admin','auditor','manager']}><Layout><DamagedReturns /></Layout></ProtectedRoute>} />
          <Route path="/customer-returns" element={<ProtectedRoute roles={['admin','auditor','manager']}><Layout><CustomerReturns /></Layout></ProtectedRoute>} />
          <Route path="/pending-items" element={<ProtectedRoute roles={['admin','auditor','manager']}><Layout><PendingItems /></Layout></ProtectedRoute>} />
          <Route path="/customers" element={<ProtectedRoute roles={['admin','manager']}><Layout><Customers /></Layout></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><Layout><Admin /></Layout></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
