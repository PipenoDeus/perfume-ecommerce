import { supabase } from './supabase';

// Obtener URL pública de una imagen
export const getImageUrl = (bucketName, filePath) => {
  const { data } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);
  return data.publicUrl;
};

// Subir una imagen
export const uploadImage = async (bucketName, file, filePath) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const publicUrl = getImageUrl(bucketName, data.path);
    return publicUrl;
  } catch (error) {
    throw error;
  }
};

// Eliminar una imagen
export const deleteImage = async (bucketName, filePath) => {
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) throw error;
    return true;
  } catch (error) {
    throw error;
  }
};

// Obtener lista de imágenes en un directorio
export const listImages = async (bucketName, folderPath = '') => {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(folderPath);

    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
};
