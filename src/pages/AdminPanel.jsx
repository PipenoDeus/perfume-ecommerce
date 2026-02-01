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
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);

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

  // Parse a CLP-style string like "1.234,56" or "1.000" or "1000" to a number
  const parseCLPPrice = (str) => {
    if (str === null || str === undefined) return NaN;
    const s = String(str).trim();
    if (s === '') return NaN;
    // Remove thousand separators (dots), replace decimal comma with dot
    const cleaned = s.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : NaN;
  };

  const formatPriceForInput = (val) => {
    if (val === null || val === undefined || val === '') return '';
    const num = Number(val);
    if (Number.isNaN(num)) return String(val);
    // Use locale string without currency symbol, with up to 2 decimals if needed
    const hasFraction = Math.abs(num - Math.trunc(num)) > 0;
    return num.toLocaleString('es-CL', { minimumFractionDigits: hasFraction ? 2 : 0, maximumFractionDigits: 2 });
  };

  const formatCLPDisplay = (val) => {
    if (val === null || val === undefined || val === '') return '';
    const num = Number(val);
    if (Number.isNaN(num)) return String(val);
    return `$${num.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      setUploading(true);

      let imageUrl = formData.image_url;

      // Si subieron archivo, subir a Storage
      if (file) {
        try {
          const { publicUrl } = await perfumeService.uploadPerfumeImage(file);
          imageUrl = publicUrl;
        } catch (uploadErr) {
          throw uploadErr;
        }
      }

      const parsedPrice = parseCLPPrice(formData.price);
      if (Number.isNaN(parsedPrice)) {
        throw new Error('Precio inválido');
      }

      const stockClean = String(formData.stock || '').replace(/\./g, '');
      if (!/^\d+$/.test(stockClean)) {
        throw new Error('Stock inválido (usa solo números)');
      }

      const perfumeData = {
        ...formData,
        image_url: imageUrl || null,
        price: parsedPrice,
        stock: parseInt(stockClean, 10),
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
      setFile(null);
      setFilePreview(null);
      setShowForm(false);
      loadPerfumes();
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (perfume) => {
    setFormData({
      name: perfume.name,
      brand: perfume.brand,
      price: formatPriceForInput(perfume.price) || '',
      description: perfume.description || '',
      image_url: perfume.image_url || '',
      category: perfume.category || '',
      stock: perfume.stock?.toString() || '',
    });
    setFile(null);
    setFilePreview(perfume.image_url || null);
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
                    type="text"
                    name="price"
                    inputMode="decimal"
                    value={formData.price}
                    onChange={handleInputChange}
                    onBlur={(e) => setFormData(prev => ({ ...prev, price: formatPriceForInput(e.target.value) }))}
                    placeholder="1.000"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Stock *</label>
                  <input
                    type="text"
                    name="stock"
                    inputMode="numeric"
                    value={formData.stock}
                    onChange={handleInputChange}
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Categoría *</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  placeholder="Arabe"
                  required
                />
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
                <label>Imagen *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const selected = e.target.files[0];
                    setFile(selected);
                    setFilePreview(selected ? URL.createObjectURL(selected) : null);
                  }}
                />
                {filePreview && (
                  <div className="image-preview">
                    <img src={filePreview} alt="Preview" />
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-success" disabled={uploading}>
                  {uploading ? (editingId ? 'Actualizando...' : 'Creando...') : (editingId ? 'Actualizar' : 'Crear')}
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
                    <th>Imagen</th>
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
                      <td className="product-cell">
                        {perfume.image_url && (
                          <img src={perfume.image_url} alt={perfume.name} className="product-thumb" />
                        )}
                      </td>
                      <td>{perfume.name}</td>
                      <td>{perfume.brand}</td>
                      <td>{perfume.category}</td>
                      <td>{formatCLPDisplay(perfume.price)}</td>
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
