-- SQL Migration Script to drop redundant columns from public.queue
-- Run this script in Supabase SQL Editor if you wish to remove duplicate columns

ALTER TABLE public.queue DROP COLUMN IF EXISTS deal_status CASCADE;
ALTER TABLE public.queue DROP COLUMN IF EXISTS is_treated CASCADE;
