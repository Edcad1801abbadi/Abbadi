INSERT INTO storage.buckets (id, name, public) VALUES ('instructor-photos', 'instructor-photos', true);

CREATE POLICY "Anyone can view instructor photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'instructor-photos');

CREATE POLICY "Anyone can upload instructor photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'instructor-photos');

CREATE POLICY "Anyone can update instructor photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'instructor-photos');