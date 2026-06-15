-- Migration: add evidence_objects JSONB column to charts table
-- Stores compute_evidence_objects() output on every chart insert/update.

ALTER TABLE charts
  ADD COLUMN IF NOT EXISTS evidence_objects jsonb;
