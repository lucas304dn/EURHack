
CREATE TABLE public.media_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'demo-user',
  type TEXT NOT NULL CHECK (type IN ('text','image','video','audio')),
  title TEXT,
  content_url TEXT,
  content_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;

-- Demo app: no auth, allow all operations on demo-user rows
CREATE POLICY "Demo public read" ON public.media_items FOR SELECT USING (true);
CREATE POLICY "Demo public insert" ON public.media_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Demo public delete" ON public.media_items FOR DELETE USING (true);
CREATE POLICY "Demo public update" ON public.media_items FOR UPDATE USING (true);

CREATE INDEX idx_media_items_user_created ON public.media_items (user_id, created_at DESC);

-- Storage bucket for generated/uploaded media
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true);

CREATE POLICY "Media public read" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "Media public upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media');
CREATE POLICY "Media public delete" ON storage.objects FOR DELETE USING (bucket_id = 'media');
