-- Create orders table
CREATE TABLE public.orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items jsonb NOT NULL,
  shipping_address jsonb NOT NULL,
  total numeric NOT NULL,
  status varchar DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
  transaction_id varchar,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Create index on user_id for faster queries
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own orders
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create orders
CREATE POLICY "Users can create orders" ON public.orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Owner/Admin can update orders
CREATE POLICY "Owner/Admin can update orders" ON public.orders
  FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'dueño'))
  );

-- Policy: Admin can view all orders
CREATE POLICY "Admin can view all orders" ON public.orders
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'dueño'))
  );
