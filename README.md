# BegoQamar

Aplicación de comercio electrónico especializada en perfumes, desarrollada con React, Vite y Supabase.

La plataforma permite explorar productos, gestionar un carrito de compras, registrar usuarios y realizar pedidos a través de una interfaz moderna y responsiva.

---

## Características

- Catálogo de perfumes
- Búsqueda de productos
- Carrito de compras
- Registro e inicio de sesión
- Gestión de pedidos
- Panel de administración
- Soporte multiidioma (Español / Inglés)
- Diseño responsive para dispositivos móviles y escritorio

---

## Tecnologías Utilizadas

### Frontend
- React
- Vite
- React Router DOM
- CSS3

### Backend & Base de Datos
- Supabase
- PostgreSQL
- Supabase Auth

### Despliegue
- Vercel (Frontend)
- Railway (Backend/API)

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU-USUARIO/TU-REPOSITORIO.git
cd TU-REPOSITORIO
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crear un archivo `.env` basado en `.env.example`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## Desarrollo

Iniciar servidor local:

```bash
npm run dev
```

La aplicación estará disponible en:

```text
http://localhost:5173
```

---

## Build de Producción

Generar versión optimizada:

```bash
npm run build
```

Previsualizar build local:

```bash
npm run preview
```

---

## Scripts Disponibles

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

---

## Seguridad

- Variables sensibles almacenadas mediante variables de entorno.
- Autenticación gestionada mediante Supabase Auth.
- Protección CSRF implementada en el backend.
- Políticas de acceso controladas mediante roles y validaciones de servidor.

---

## Estado del Proyecto

Proyecto en desarrollo activo.

Próximas funcionalidades:

- Lista de deseos
- Sistema de reseñas
- Recomendaciones de productos
- Notificaciones por correo electrónico
- Mejoras de experiencia móvil

---

## Licencia

Este proyecto se distribuye únicamente con fines educativos y demostrativos.

Todos los derechos reservados.
