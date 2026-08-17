-- Tighten customer order update policy so users can only cancel their own pending or processing orders.
DROP POLICY IF EXISTS "Allow users to update their own orders" ON public.orders;

CREATE POLICY "Allow users to cancel their own pending/processing orders" ON public.orders
  FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('pending', 'processing', 'Pending', 'Processing'))
  WITH CHECK (auth.uid() = user_id AND status IN ('cancelled', 'Cancelled'));
