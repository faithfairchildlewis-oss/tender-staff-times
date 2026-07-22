CREATE TABLE public.jotform_dismissed (
  submission_id TEXT PRIMARY KEY,
  reason TEXT,
  dismissed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.jotform_dismissed TO authenticated;
GRANT ALL ON public.jotform_dismissed TO service_role;

ALTER TABLE public.jotform_dismissed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage jotform_dismissed"
ON public.jotform_dismissed
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());