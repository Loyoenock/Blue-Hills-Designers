-- Additive migration for AI Stylist Conversations guest/auth flexibility
ALTER TABLE public.stylist_conversations ALTER COLUMN user_id DROP NOT NULL;

DROP POLICY IF EXISTS "Allow users to view their own stylist conversations" ON public.stylist_conversations;
CREATE POLICY "Allow users to view their own stylist conversations" ON public.stylist_conversations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to insert their own stylist conversations" ON public.stylist_conversations;
CREATE POLICY "Allow users to insert their own stylist conversations" ON public.stylist_conversations FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Allow users to update their own stylist conversations" ON public.stylist_conversations;
CREATE POLICY "Allow users to update their own stylist conversations" ON public.stylist_conversations FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to delete their own stylist conversations" ON public.stylist_conversations;
CREATE POLICY "Allow users to delete their own stylist conversations" ON public.stylist_conversations FOR DELETE USING (auth.uid() = user_id);
