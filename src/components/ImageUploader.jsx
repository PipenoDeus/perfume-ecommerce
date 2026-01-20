import React, { useState } from 'react';
import { uploadImage } from '../services/imageService';

const ImageUploader = ({ onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // Crear un nombre único para el archivo
      const timestamp = Date.now();
      const filePath = `productos/${timestamp}_${file.name}`;

      const publicUrl = await uploadImage('productos', file, filePath);
      onUploadSuccess(publicUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="image-uploader">
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
      />
      {uploading && <p>Subiendo...</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default ImageUploader;
