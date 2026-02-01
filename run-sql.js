// run-sql.js
// Usage:
// $env:DB_URL="postgresql://postgres:TU_PASS@db.irkioorwigmlvzkmopfp.supabase.co:5432/postgres"
// node run-sql.js

const { Client } = require('pg');

const sql = `
-- 1) Users: permitir que cada usuario lea/actualice su propio registro
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own data" ON public.users;
CREATE POLICY "Users can read their own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
CREATE POLICY "Users can update their own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- 2) Perfumes: lectura pública; solo administrador/dueño puede insertar/actualizar/borrar
ALTER TABLE IF EXISTS public.perfumes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read" ON public.perfumes;
CREATE POLICY "Public read"
  ON public.perfumes
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage perfumes - insert" ON public.perfumes;
CREATE POLICY "Admins manage perfumes - insert"
  ON public.perfumes
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('administrador','dueño'))
  );

DROP POLICY IF EXISTS "Admins manage perfumes - update" ON public.perfumes;
CREATE POLICY "Admins manage perfumes - update"
  ON public.perfumes
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('administrador','dueño'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('administrador','dueño'))
  );

DROP POLICY IF EXISTS "Admins manage perfumes - delete" ON public.perfumes;
CREATE POLICY "Admins manage perfumes - delete"
  ON public.perfumes
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('administrador','dueño'))
  );

-- 3) Storage: permitir uploads y lectura para el bucket 'perfumes' (requiere owner)
ALTER TABLE IF EXISTS storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert for perfumes" ON storage.objects;
CREATE POLICY "Allow insert for perfumes"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'perfumes' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow select for perfumes" ON storage.objects;
CREATE POLICY "Allow select for perfumes"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'perfumes');

DROP POLICY IF EXISTS "Allow update for perfumes by owner or admins" ON storage.objects;
CREATE POLICY "Allow update for perfumes by owner or admins"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'perfumes'
    AND (
      owner = auth.uid()
      OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('administrador','dueño'))
    )
  )
  WITH CHECK (
    bucket_id = 'perfumes'
    AND (
      owner = auth.uid()
      OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('administrador','dueño'))
    )
  );

DROP POLICY IF EXISTS "Allow delete for perfumes by owner or admins" ON storage.objects;
CREATE POLICY "Allow delete for perfumes by owner or admins"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'perfumes'
    AND (
      owner = auth.uid()
      OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('administrador','dueño'))
    )
  );
`;

(async () => {
  if (!process.env.DB_URL) {
    console.error('ERROR: Environment variable DB_URL is not set.');
    console.error('Set it like: $env:DB_URL="postgresql://postgres:TU_PASS@db.irkioorwigmlvzkmopfp.supabase.co:5432/postgres"');
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DB_URL });
  try {
    await client.connect();
    console.log('Connected to DB, running SQL...');
    await client.query(sql);
    console.log('Policies applied successfully.');
  } catch (err) {
    console.error('SQL execution error:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
