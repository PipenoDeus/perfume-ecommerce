# PerfumesDemo - Tienda de Perfumes E-Commerce

Una tienda de perfumes moderna y completamente funcional construida con React, Vite y Supabase.

## Características

✨ **Características Principales**
- 🛍️ Explora catálogo de perfumes con tarjetas de producto
- 🛒 Carrito de compras con funcionalidad completa (agregar/eliminar/actualizar)
- 👤 Autenticación de usuarios (Registro / Inicio de sesión)
- 📦 Sistema de gestión de pedidos
- 💰 Flujo de compra completo
- 📱 Diseño completamente responsivo
- 🎨 Interfaz elegante con diseño moderno en oro

## Stack Tecnológico

- **Frontend**: React 19 con Vite
- **Backend**: Supabase (PostgreSQL + Auth)
- **Enrutamiento**: React Router DOM
- **Estilos**: CSS3 con diseño responsivo
- **Cliente API**: Supabase JS SDK
- **Internacionalización**: Sistema de traducción personalizado

## Estructura del Proyecto

```
src/
├── components/              # Componentes UI reutilizables
│   ├── Navbar.jsx          # Barra de navegación
│   ├── Navbar.css
│   ├── ProductCard.jsx     # Tarjeta de producto
│   ├── ProductCard.css
│   ├── Footer.jsx          # Pie de página
│   └── Footer.css
├── pages/                   # Componentes de páginas
│   ├── Home.jsx            # Página de inicio
│   ├── Home.css
│   ├── Products.jsx        # Listado de productos
│   ├── Products.css
│   ├── ProductDetail.jsx   # Detalle de producto
│   ├── ProductDetail.css
│   ├── Cart.jsx            # Carrito de compras
│   └── Cart.css
├── context/                 # Proveedores de React Context
│   ├── AuthContext.jsx     # Estado de autenticación
│   ├── CartContext.jsx     # Estado del carrito
│   └── LanguageContext.jsx # Estado del idioma
├── services/                # Lógica de negocio y API
│   └── supabase.js         # Cliente y funciones de Supabase
├── translations.js          # Diccionario de traducción (ES/EN)
├── App.jsx
├── App.css
└── main.jsx
```

## Primeros Pasos

### Requisitos Previos
- Node.js 16+ y npm
- Una cuenta de Supabase (nivel gratuito disponible en [supabase.com](https://supabase.com))

### Instalación

1. **Clonar o navegar al proyecto**
   ```bash
   cd Proyecto
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar Supabase**
   - Crea un nuevo proyecto en [supabase.com](https://supabase.com)
   - Obtén tu `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
   - Ver [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) para la configuración de tablas

4. **Configurar variables de entorno**
   ```bash
   # Copia .env.example a .env.local
   cp .env.example .env.local
   
   # Edita .env.local con tus credenciales de Supabase
   VITE_SUPABASE_URL=tu_url_aqui
   VITE_SUPABASE_ANON_KEY=tu_clave_aqui
   ```

5. **Ejecutar el servidor de desarrollo**
   ```bash
   npm run dev
   ```
   El sitio se abrirá en `http://localhost:5173`

## Scripts Disponibles

- `npm run dev` - Inicia servidor de desarrollo
- `npm run build` - Construye para producción
- `npm run preview` - Vista previa de construcción de producción localmente
- `npm run lint` - Ejecuta ESLint

## Configuración de Base de Datos

Ver [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) para:
- Definiciones completas de tablas SQL
- Recomendaciones de políticas RLS
- Example data insertion queries

## Navbar

Componente de navegación que muestra el logo, los elementos del menú, la cantidad de productos en el carrito y el estado de autenticación del usuario.

## ProductCard

Muestra un perfume individual con su imagen, detalles, precio y funcionalidad para agregar al carrito.

## Home

Página principal con una sección destacada (hero), presentación de características y llamada a la acción.

## Products

Página de listado de productos que obtiene los datos desde Supabase y muestra todos los perfumes.

## Cart

Página del carrito de compras con gestión de productos, actualización de cantidades y resumen del pedido.

## Proveedores de Contexto
## AuthContext

Gestiona el estado de autenticación del usuario y su estado de inicio de sesión.

## CartContext

Gestiona el estado del carrito de compras con acciones para agregar, eliminar y actualizar productos.

## Servicios
supabase.js
supabase - Instancia del cliente de Supabase.
perfumeService - Métodos para operaciones CRUD de perfumes.
authService - Métodos de autenticación de usuarios.
orderService - Métodos de gestión de pedidos.
## Mejoras Futuras

Reseñas y valoraciones de usuarios.

Notificaciones por correo electrónico.

Funcionalidad de lista de deseos.

Recomendaciones de productos.

Interruptor de modo oscuro.

