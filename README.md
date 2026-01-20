# PerfumeShop - React + Supabase E-Commerce Website

A modern, fully-functional perfume e-commerce website built with React, Vite, and Supabase.

## Features

✨ **Core Features**
- 🛍️ Browse perfume catalog with product cards
- 🛒 Shopping cart with add/remove/update functionality
- 👤 User authentication (Sign up / Login)
- 📦 Order management system
- 💰 Complete checkout flow
- 📱 Fully responsive design
- 🎨 Modern gradient UI with smooth animations

## Tech Stack

- **Frontend**: React 19 with Vite
- **Backend**: Supabase (PostgreSQL + Auth)
- **Routing**: React Router DOM
- **Styling**: CSS3 with responsive design
- **API Client**: Supabase JS SDK

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Navbar.jsx      # Navigation header
│   ├── Navbar.css
│   ├── ProductCard.jsx # Product display card
│   └── ProductCard.css
├── pages/              # Page components
│   ├── Home.jsx        # Landing page
│   ├── Home.css
│   ├── Products.jsx    # Product listing
│   ├── Products.css
│   ├── Cart.jsx        # Shopping cart
│   └── Cart.css
├── context/            # React Context providers
│   ├── AuthContext.jsx # Authentication state
│   └── CartContext.jsx # Shopping cart state
├── services/           # API & business logic
│   └── supabase.js     # Supabase client & service functions
├── App.jsx
├── App.css
└── main.jsx
```

## Getting Started

### Prerequisites
- Node.js 16+ and npm
- A Supabase account (free tier available at [supabase.com](https://supabase.com))

### Installation

1. **Clone or navigate to the project**
   ```bash
   cd Proyecto
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Get your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for table setup

4. **Configure environment variables**
   ```bash
   # Copy .env.example to .env.local
   cp .env.example .env.local
   
   # Edit .env.local with your Supabase credentials
   VITE_SUPABASE_URL=your_url_here
   VITE_SUPABASE_ANON_KEY=your_key_here
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```
   The site will open at `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Database Setup

See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for:
- Complete SQL table definitions
- RLS policies recommendations
- Example data insertion queries

## Components Overview

### Navbar
Navigation component showing logo, menu items, cart count, and user auth status.

### ProductCard
Displays individual perfume with image, details, price, and add-to-cart functionality.

### Home
Landing page with hero section, features showcase, and call-to-action.

### Products
Product listing page that fetches from Supabase and displays all perfumes.

### Cart
Shopping cart page with item management, quantity updates, and order summary.

## Context Providers

### AuthContext
Manages user authentication state and login status.

### CartContext
Manages shopping cart state with actions for add/remove/update items.

## Services

### supabase.js
- `supabase` - Supabase client instance
- `perfumeService` - Methods for perfume CRUD operations
- `authService` - User authentication methods
- `orderService` - Order management methods

## Future Enhancements

- [ ] Product detail pages
- [ ] Advanced search and filtering
- [ ] User reviews and ratings
- [ ] Payment integration (Stripe/PayPal)
- [ ] Order history and tracking
- [ ] Admin dashboard
- [ ] Email notifications
- [ ] Wishlist functionality
- [ ] Product recommendations
- [ ] Dark mode toggle

## Contributing

Feel free to fork and submit pull requests for any improvements.

## License

This project is open source and available under the MIT License.
