import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { supabase } from '../services/supabase';
import './AdminsPanel.css';

const AdminsPanel = () => {
  const { user, userRole } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchEmail, setSearchEmail] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Cargar administradores
  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('users')
        .select('id, email, full_name, phone, city, role, created_at')
        .eq('role', 'admin')
        .order('created_at', { ascending: false });

      if (err) throw err;
      setAdmins(data || []);
    } catch (err) {
      setError('Error al cargar administradores: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteToAdmin = async (userId) => {
    try {
      setError(null);
      setSuccess(null);
      const { error: err } = await supabase
        .from('users')
        .update({ role: 'admin' })
        .eq('id', userId);

      if (err) throw err;
      setSuccess('Usuario promovido a admin');
      loadAdmins();
    } catch (err) {
      setError('Error: ' + err.message);
    }
  };

  const handleDemoteAdmin = async (userId) => {
    if (window.confirm('¿Estás seguro de que deseas degradar este administrador a cliente?')) {
      try {
        setError(null);
        setSuccess(null);
        const { error: err } = await supabase
          .from('users')
          .update({ role: 'cliente' })
          .eq('id', userId);

        if (err) throw err;
        setSuccess('Administrador degradado a cliente');
        loadAdmins();
      } catch (err) {
        setError('Error: ' + err.message);
      }
    }
  };

  const handlePromoteUserSearch = async (e) => {
    e.preventDefault();
    if (!searchEmail.trim()) return;

    try {
      setError(null);
      setSuccess(null);

      // Buscar usuario
      const { data: users, error: searchErr } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('email', searchEmail)
        .single();

      if (searchErr) throw new Error('Usuario no encontrado');

      if (users.role === 'admin') {
        throw new Error('Este usuario ya es admin');
      }

      // Promover a admin
      const { error: updateErr } = await supabase
        .from('users')
        .update({ role: 'admin' })
        .eq('id', users.id);

      if (updateErr) throw updateErr;
      setSuccess(`${searchEmail} ahora es admin`);
      setSearchEmail('');
      setShowForm(false);
      loadAdmins();
    } catch (err) {
      setError(err.message);
    }
  };

  if (userRole !== 'dueño') {
    return (
      <div className="admins-panel">
        <p>No tienes permiso para acceder a esta sección</p>
      </div>
    );
  }

  return (
    <div className="admins-panel">
      <div className="admins-container">
        <h1>Gestión de Administradores</h1>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Promover Usuario a Admin
          </button>
        )}

        {showForm && (
          <div className="form-container">
            <h2>Promover Usuario a Administrador</h2>
            <form onSubmit={handlePromoteUserSearch}>
              <div className="form-group">
                <label>Correo del Usuario</label>
                <input
                  type="email"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder="usuario@email.com"
                  required
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-success">
                  Promover
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowForm(false);
                    setSearchEmail('');
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="admins-table">
          <h2>Administradores Actuales ({admins.length})</h2>
          {loading ? (
            <p>Cargando...</p>
          ) : admins.length === 0 ? (
            <p>No hay administradores registrados</p>
          ) : (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Teléfono</th>
                    <th>Ciudad</th>
                    <th>Fecha Registro</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map(admin => (
                    <tr key={admin.id}>
                      <td>{admin.full_name || 'N/A'}</td>
                      <td>{admin.email}</td>
                      <td>{admin.phone || 'N/A'}</td>
                      <td>{admin.city || 'N/A'}</td>
                      <td>{new Date(admin.created_at).toLocaleDateString('es-ES')}</td>
                      <td className="actions">
                        <button
                          className="btn btn-sm btn-delete"
                          onClick={() => handleDemoteAdmin(admin.id)}
                        >
                          Degradar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminsPanel;
