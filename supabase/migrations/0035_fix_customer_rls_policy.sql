-- Migration: Fix Customer RLS Policy
-- Created: 2026-02-11
-- Description: Adds INSERT policy to customers table to allow users to create their own customer profile

-- Add INSERT policy: Users can create their own customer record
-- This is needed for self-service customer portal sign-up and dev setup
CREATE POLICY "Users can create own customer profile" ON customers
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );
