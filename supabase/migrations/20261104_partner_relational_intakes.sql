-- Migration: partner_relational_intakes (Loving By Design v2, Person B answers)
-- NOT APPLIED. Requires approval before it is run against any database.
--
-- Person B's answers are kept out of public.charts. The partner chart row
-- carries the purchaser's user_id, so the "Users can view own charts" policy
-- lets the purchaser read (and, under an own-rows update policy, write) every
-- column on it. This table has RLS enabled with no policies and no grants to
-- anon/authenticated: only the service role used by the API routes reaches it.
--
-- claim_hash: SHA-256 of the device secret set as an httpOnly cookie when the
-- share link is first opened. Every later read or write must present it.

CREATE TABLE IF NOT EXISTS public.partner_relational_intakes (
  partner_chart_id      uuid        PRIMARY KEY REFERENCES public.charts(id) ON DELETE RESTRICT,
  questionnaire_version text        NOT NULL,
  answers               jsonb       NOT NULL DEFAULT '{}'::jsonb,
  complete              boolean     NOT NULL DEFAULT false,
  claim_hash            text        NOT NULL,
  claimed_at            timestamptz NOT NULL DEFAULT now(),
  claim_expires_at      timestamptz NOT NULL,
  submitted_at          timestamptz,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_relational_intakes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.partner_relational_intakes FROM anon, authenticated;
-- No policies: deliberate.
