import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { perfumeService } from '../services/supabase';
import OrderTrackingManager from '../components/OrderTrackingManager';
import './AdminPanel.css';

const AdminPanel = () => {
  const { user } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const [activeTab, setActiveTab] = useState('products');
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
    gender: 'unisex',
    category: '',
    stock: '',
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [imageUrls, setImageUrls] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Cargar perfumes
  useEffect(() => {
    loadPerfumes();
  }, []);

  useEffect(() => () => {
    imagePreviews.forEach((preview) => {
      if (typeof preview === 'string' && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    });
  }, [imagePreviews]);

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

  const handleFilesChange = (e) => {
    const files = Array.from(e.target.files || []);

    imagePreviews.forEach((preview) => {
      if (typeof preview === 'string' && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    });

    if (files.length === 0) {
      setSelectedFiles([]);
      setImagePreviews(imageUrls);
      return;
    }

    const previewUrls = files.map((file) => URL.createObjectURL(file));
    setSelectedFiles(files);
    setImagePreviews(previewUrls);
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

      let finalImageUrls = imageUrls;

      if (selectedFiles.length > 0) {
        const uploadedUrls = [];
        for (const selectedFile of selectedFiles) {
          const { publicUrl } = await perfumeService.uploadPerfumeImage(selectedFile);
          uploadedUrls.push(publicUrl);
        }
        finalImageUrls = uploadedUrls;
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
        image_urls: finalImageUrls,
        image_url: finalImageUrls[0] || formData.image_url || null,
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
        gender: 'unisex',
        category: '',
        stock: '',
      });
      setSelectedFiles([]);
      setImagePreviews([]);
      setImageUrls([]);
      setShowForm(false);
      loadPerfumes();
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (perfume) => {
    const existingImages = Array.isArray(perfume.image_urls) && perfume.image_urls.length > 0
      ? perfume.image_urls
      : (perfume.image_url ? [perfume.image_url] : []);

    setFormData({
      name: perfume.name,
      brand: perfume.brand,
      price: formatPriceForInput(perfume.price) || '',
      description: perfume.description || '',
      image_url: perfume.image_url || '',
      gender: perfume.gender || 'unisex',
      category: perfume.category || '',
      stock: perfume.stock?.toString() || '',
    });
    setSelectedFiles([]);
    setImagePreviews(existingImages);
    setImageUrls(existingImages);
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
      gender: 'unisex',
      category: '',
      stock: '',
    });
    setSelectedFiles([]);
    setImagePreviews([]);
    setImageUrls([]);
  };

  if (!user) {
    return <div className="admin-panel"><p>Debes iniciar sesión</p></div>;
  }

  return (
    <div className="admin-panel">
      <div className="admin-container">
        <h1>Panel de Administrador</h1>

        <div className="admin-tabs">
          <button 
            className={`admin-tab ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            Productos
          </button>
          <button 
            className={`admin-tab ${activeTab === 'orders-no-shipping' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders-no-shipping')}
          >
            Órdenes sin envío
          </button>
          <button 
            className={`admin-tab ${activeTab === 'orders-shipped' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders-shipped')}
          >
            Órdenes enviadas
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {activeTab === 'products' && (
          <div className="admin-tab-content">
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
                    <label htmlFor="name">Nombre</label>
                    <input
                      id="name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Ej: Sauvage Elixir"
                      required
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="brand">Marca</label>
                      <input
                        id="brand"
                        type="text"
                        name="brand"
                        value={formData.brand}
                        onChange={handleInputChange}
                        placeholder="Ej: Dior"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="category">Categoría</label>
                      <input
                        id="category"
                        type="text"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        placeholder="Ej: Amaderado"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="price">Precio (CLP)</label>
                      <input
                        id="price"
                        type="text"
                        inputMode="decimal"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        placeholder="Ej: 129.990"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="stock">Stock</label>
                      <input
                        id="stock"
                        type="text"
                        inputMode="numeric"
                        name="stock"
                        value={formData.stock}
                        onChange={handleInputChange}
                        placeholder="Ej: 25"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="gender">Género</label>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                    >
                      <option value="unisex">Unisex</option>
                      <option value="hombre">Hombre</option>
                      <option value="mujer">Mujer</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="description">Descripción</label>
                    <textarea
                      id="description"
                      name="description"
                      rows="4"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Describe notas, duración y estilo del perfume"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="images">Imágenes</label>
                    <p className="form-hint">Puedes subir una o varias imágenes.</p>
                    <input
                      id="images"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFilesChange}
                    />
                    {imagePreviews.length > 0 && (
                      <div className="image-preview-grid">
                        {imagePreviews.map((src, index) => (
                          <img key={`${src}-${index}`} src={src} alt={`Vista previa ${index + 1}`} />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="image_url">URL de imagen principal (opcional)</label>
                    <input
                      id="image_url"
                      type="url"
                      name="image_url"
                      value={formData.image_url}
                      onChange={handleInputChange}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCancel}
                      disabled={uploading}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-success"
                      disabled={uploading}
                    >
                      {uploading ? 'Guardando...' : editingId ? 'Actualizar perfume' : 'Crear perfume'}
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
                        <th>Género</th>
                        <th>Precio</th>
                        <th>Stock</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perfumes.map(perfume => (
                        <tr key={perfume.id}>
                          <td className="product-cell">
                            {(perfume.image_urls?.[0] || perfume.image_url) && (
                              <img
                                src={perfume.image_urls?.[0] || perfume.image_url}
                                alt={perfume.name}
                                className="product-thumb"
                              />
                            )}
                          </td>
                          <td>{perfume.name}</td>
                          <td>{perfume.brand}</td>
                          <td>{perfume.category}</td>
                          <td>{perfume.gender || 'unisex'}</td>
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
        )}

        {activeTab === 'orders-no-shipping' && (
          <div className="admin-tab-content">
            <OrderTrackingManager mode="without-shipping" />
          </div>
        )}

        {activeTab === 'orders-shipped' && (
          <div className="admin-tab-content">
            <OrderTrackingManager mode="shipped" />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
