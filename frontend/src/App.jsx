import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import POSPage from './pages/POSPage';
import SalesHistoryPage from './pages/SalesHistoryPage';
import ProductsPage from './pages/ProductsPage';
import CatalogPage from './pages/CatalogPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';

function withLayout(element, roles) {
  return (
    <ProtectedRoute roles={roles}>
      <Layout>{element}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={withLayout(<POSPage />)} />
      <Route path="/sales" element={withLayout(<SalesHistoryPage />)} />
      <Route path="/products" element={withLayout(<ProductsPage />, ['ADMIN', 'MANAGER'])} />
      <Route path="/catalog" element={withLayout(<CatalogPage />, ['ADMIN', 'MANAGER'])} />
      <Route path="/reports" element={withLayout(<ReportsPage />, ['ADMIN', 'MANAGER'])} />
      <Route path="/users" element={withLayout(<UsersPage />, ['ADMIN'])} />
      <Route path="/settings" element={withLayout(<SettingsPage />, ['ADMIN'])} />
      <Route path="*" element={withLayout(<POSPage />)} />
    </Routes>
  );
}
