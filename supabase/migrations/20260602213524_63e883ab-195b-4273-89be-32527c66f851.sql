CREATE TABLE public.time_off_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_name text NOT NULL,
  date_requested text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_off_requests TO authenticated;
GRANT ALL ON public.time_off_requests TO service_role;

ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit a request (public form submissions)
CREATE POLICY "Anyone can submit time off requests"
ON public.time_off_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Admins can view all requests
CREATE POLICY "Admins can view all requests"
ON public.time_off_requests
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admins can update all requests (approve/deny)
CREATE POLICY "Admins can update all requests"
ON public.time_off_requests
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admins can delete requests
CREATE POLICY "Admins can delete all requests"
ON public.time_off_requests
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));