-- Migration: Loving By Design v2, Partner B access by verified email.
--
-- Additive only. Creates three tables, one trigger function and one trigger.
-- No existing table, column, policy or row is altered.
--
-- Person B's answers are kept out of public.charts. The partner chart row
-- carries the purchaser's user_id, so the "Users can view own charts" policy
-- lets the purchaser read every column on it. These tables have RLS enabled
-- with no policies and no grants to anon/authenticated: only the service role
-- used by the API routes reaches them.
--
-- partner_invitations: the purchaser names Partner B's email. Partner B reaches
-- the questionnaire only through a session whose verified email matches an
-- active (not revoked, not expired) invitation. At most one active invitation
-- per partner chart.
--
-- partner_relational_intakes: Partner B's answers. partner_user_id is bound on
-- first verified access and can never change. A submitted row can never be
-- updated.
--
-- partner_access_events: rate-limit counters. bucket is an HMAC of an email
-- or IP address, never the raw value.

CREATE TABLE IF NOT EXISTS public.partner_invitations (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_chart_id  uuid        NOT NULL REFERENCES public.charts(id) ON DELETE CASCADE,
  purchaser_user_id uuid        NOT NULL,
  invitee_email     text        NOT NULL CHECK (invitee_email = lower(btrim(invitee_email)) AND invitee_email LIKE '%_@_%'),
  created_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz NOT NULL,
  revoked_at        timestamptz,
  accepted_at       timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS partner_invitations_one_active
  ON public.partner_invitations (partner_chart_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS partner_invitations_invitee
  ON public.partner_invitations (invitee_email) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.partner_relational_intakes (
  partner_chart_id      uuid        PRIMARY KEY REFERENCES public.charts(id) ON DELETE RESTRICT,
  partner_user_id       uuid        NOT NULL,
  partner_email         text        NOT NULL,
  questionnaire_version text        NOT NULL,
  answers               jsonb       NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(answers) = 'object'),
  complete              boolean     NOT NULL DEFAULT false,
  submitted_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CHECK (complete = (submitted_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS partner_relational_intakes_user
  ON public.partner_relational_intakes (partner_user_id);

CREATE TABLE IF NOT EXISTS public.partner_access_events (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket     text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_access_events_bucket
  ON public.partner_access_events (bucket, created_at);

-- A submitted intake is immutable, and the identity it is bound to never moves.
CREATE OR REPLACE FUNCTION public.partner_relational_intakes_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.complete THEN
    RAISE EXCEPTION 'partner intake already submitted' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.partner_chart_id IS DISTINCT FROM OLD.partner_chart_id
     OR NEW.partner_user_id IS DISTINCT FROM OLD.partner_user_id
     OR NEW.partner_email IS DISTINCT FROM OLD.partner_email
     OR NEW.questionnaire_version IS DISTINCT FROM OLD.questionnaire_version
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'partner intake identity is immutable' USING ERRCODE = 'check_violation';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS partner_relational_intakes_guard ON public.partner_relational_intakes;
CREATE TRIGGER partner_relational_intakes_guard
  BEFORE UPDATE ON public.partner_relational_intakes
  FOR EACH ROW EXECUTE FUNCTION public.partner_relational_intakes_guard();

ALTER TABLE public.partner_invitations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_relational_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_access_events      ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.partner_invitations        FROM anon, authenticated;
REVOKE ALL ON public.partner_relational_intakes FROM anon, authenticated;
REVOKE ALL ON public.partner_access_events      FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.partner_relational_intakes_guard() FROM PUBLIC, anon, authenticated;
-- No policies: deliberate.
