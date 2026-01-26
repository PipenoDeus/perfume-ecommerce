import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { perfumeService } from '../services/supabase';
import './AdminPanel.css';

const AdminPanel = () => {
  const { user } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const [perfumes, setPerfumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    price: '',
    description: '',
    image_url: '',
    category: '',
    stock: '',
  });

  // Cargar perfumes
  useEffect(() => {
    loadPerfumes();
  }, []);

  const loadPerfumes = async () => {
    try {
      setLoading(true);
      const data = await perfumeService.getAllPerfumes();
      setPerfumes(data);
    } catch (err) {
      setError('Error al cargar perfumes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const perfumeData = {
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
      };

      if (editingId) {
        // Actualizar
        await perfumeService.updatePerfume(editingId, perfumeData);
        setSuccess('Perfume actualizado exitosamente');
        setEditingId(null);
      } else {
        // Crear
        await perfumeService.createPerfume(perfumeData);
        setSuccess('Perfume creado exitosamente');
      }

      setFormData({
        name: '',
        brand: '',
        price: '',
        description: '',
        image_url: '',
        category: '',
        stock: '',
      });
      setShowForm(false);
      loadPerfumes();
    } catch (err) {
      setError('Error: ' + err.message);
    }
  };

  const handleEdit = (perfume) => {
    setFormData({
      name: perfume.name,
      brand: perfume.brand,
      price: perfume.price.toString(),
      description: perfume.description,
      image_url: perfume.image_url,
      category: perfume.category,
      stock: perfume.stock.toString(),
    });
    setEditingId(perfume.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este perfume?')) {
      try {
        await perfumeService.deletePerfume(id);
        setSuccess('Perfume eliminado exitosamente');
        loadPerfumes();
      } catch (err) {
        setError('Error al eliminar: ' + err.message);
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      brand: '',
      price: '',
      description: '',
      image_url: '',
      category: '',
      stock: '',
    });
  };

  if (!user) {
    return <div className="admin-panel"><p>Debes iniciar sesión</p></div>;
  }

  return (
    <div className="admin-panel">
      <div className="admin-container">
        <h1>Panel de Administrador</h1>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Nuevo Perfume
          </button>
        )}

        {showForm && (
          <div className="form-container">
            <h2>{editingId ? 'Editar Perfume' : 'Crear Nuevo Perfume'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Marca *</label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Precio *</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Stock *</label>
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Categoría *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Selecciona una categoría</option>
                  <option value="floral">Floral</option>
                  <option value="oriental">Oriental</option>
                  <option value="frutal">Frutal</option>
                  <option value="aromático">Aromático</option>
                  <option value="amaderado">Amaderado</option>
                </select>
              </div>

              <div className="form-group">
                <label>Descripción *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  required
                ></textarea>
              </div>

              <div className="form-group">
                <label>URL de Imagen *</label>
                <input
                  type="url"
                  name="image_url"
                  value={formData.image_url}
                  onChange={handleInputChange}
                  required
                  placeholder="https://..."
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-success">
                  {editingId ? 'Actualizar' : 'Crear'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancel}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="products-table">
          <h2>Perfumes ({perfumes.length})</h2>
          {loading ? (
            <p>Cargando...</p>
          ) : perfumes.length === 0 ? (
            <p>No hay perfumes registrados</p>
          ) : (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Marca</th>
                    <th>Categoría</th>
                    <th>Precio</th>
                    <th>Stock</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {perfumes.map(perfume => (
                    <tr key={perfume.id}>
                      <td>{perfume.name}</td>
                      <td>{perfume.brand}</td>
                      <td>{perfume.category}</td>
                      <td>${perfume.price}</td>
                      <td>{perfume.stock}</td>
                      <td className="actions">
                        <button
                          className="btn btn-sm btn-edit"
                          onClick={() => handleEdit(perfume)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn-sm btn-delete"
                          onClick={() => handleDelete(perfume.id)}
                        >
                          Eliminar
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

export default AdminPanel;
