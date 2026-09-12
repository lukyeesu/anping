DROP POLICY IF EXISTS "Allow anon all" ON public.settings;
CREATE POLICY "Allow anon all" ON public.settings FOR ALL TO anon USING (true) WITH CHECK (true);
