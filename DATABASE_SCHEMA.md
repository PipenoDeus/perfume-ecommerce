# Perfume E-Commerce Website - Database Schema

## Tables Overview

### 1. `perfumes`
Main table for storing perfume product information.

```sql
CREATE TABLE perfumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category VARCHAR(100),
  image_url TEXT,
  stock INT DEFAULT 0,
  rating DECIMAL(3, 2),
  reviews_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. `users` (Auth via Supabase Auth)
User profiles extended beyond auth_users.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. `orders`
Customer orders table.

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  total DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, shipped, delivered, cancelled
  items JSONB NOT NULL, -- Array of {id, name, price, quantity}
  shipping_address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. `reviews`
Customer reviews for perfumes.

```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfume_id UUID NOT NULL REFERENCES perfumes(id),
  user_id UUID NOT NULL REFERENCES users(id),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(perfume_id, user_id)
);
```

## Setup Instructions

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Run the SQL queries above in the SQL Editor
4. Enable RLS (Row Level Security) policies for production
5. Get your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Project Settings
6. Update `.env.local` with your credentials

## Example Data Insertion

```sql
INSERT INTO perfumes (name, brand, description, price, category, stock, image_url)
VALUES
  ('Chanel No. 5', 'Chanel', 'Classic luxury perfume', 99.99, 'luxury', 50, 'https://via.placeholder.com/250'),
  ('Dior Sauvage', 'Dior', 'Fresh and spicy fragrance', 89.99, 'luxury', 75, 'https://via.placeholder.com/250'),
  ('Eau de Toilette', 'Generic Brand', 'Light everyday scent', 29.99, 'casual', 100, 'https://via.placeholder.com/250');
```
