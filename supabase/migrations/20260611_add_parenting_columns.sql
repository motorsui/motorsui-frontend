-- Migration: add parenting product columns to charts table
-- Natal parenting: parenting_* (text)
-- HD parenting: parenting_hd_* (text, except parenting_hd_channels which is jsonb)

ALTER TABLE charts
  -- ─── Natal parenting — planet sections ─────────────────────────────────────
  ADD COLUMN IF NOT EXISTS parenting_lagna            text,
  ADD COLUMN IF NOT EXISTS parenting_sun              text,
  ADD COLUMN IF NOT EXISTS parenting_moon             text,
  ADD COLUMN IF NOT EXISTS parenting_mercury          text,
  ADD COLUMN IF NOT EXISTS parenting_venus            text,
  ADD COLUMN IF NOT EXISTS parenting_mars             text,
  ADD COLUMN IF NOT EXISTS parenting_jupiter          text,
  ADD COLUMN IF NOT EXISTS parenting_saturn           text,
  ADD COLUMN IF NOT EXISTS parenting_uranus           text,
  ADD COLUMN IF NOT EXISTS parenting_neptune          text,
  ADD COLUMN IF NOT EXISTS parenting_pluto            text,
  ADD COLUMN IF NOT EXISTS parenting_rahu             text,
  ADD COLUMN IF NOT EXISTS parenting_ketu             text,

  -- ─── Natal parenting — summary sections ────────────────────────────────────
  ADD COLUMN IF NOT EXISTS parenting_dignities        text,
  ADD COLUMN IF NOT EXISTS parenting_purusharthas     text,
  ADD COLUMN IF NOT EXISTS parenting_dasha            text,

  -- ─── HD parenting — overview ────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS parenting_hd_type_strategy          text,
  ADD COLUMN IF NOT EXISTS parenting_hd_authority              text,
  ADD COLUMN IF NOT EXISTS parenting_hd_profile                text,
  ADD COLUMN IF NOT EXISTS parenting_hd_definition             text,
  ADD COLUMN IF NOT EXISTS parenting_hd_signature              text,
  ADD COLUMN IF NOT EXISTS parenting_hd_not_self               text,
  ADD COLUMN IF NOT EXISTS parenting_hd_incarnation_cross      text,

  -- ─── HD parenting — centers ─────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS parenting_hd_center_head            text,
  ADD COLUMN IF NOT EXISTS parenting_hd_center_ajna            text,
  ADD COLUMN IF NOT EXISTS parenting_hd_center_throat          text,
  ADD COLUMN IF NOT EXISTS parenting_hd_center_g               text,
  ADD COLUMN IF NOT EXISTS parenting_hd_center_heart           text,
  ADD COLUMN IF NOT EXISTS parenting_hd_center_sacral          text,
  ADD COLUMN IF NOT EXISTS parenting_hd_center_solar_plexus    text,
  ADD COLUMN IF NOT EXISTS parenting_hd_center_spleen          text,
  ADD COLUMN IF NOT EXISTS parenting_hd_center_root            text,

  -- ─── HD parenting — channels (dynamic, keyed by channel string) ─────────────
  ADD COLUMN IF NOT EXISTS parenting_hd_channels               jsonb,

  -- ─── HD parenting — gates ────────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS parenting_hd_personality_gates      text,
  ADD COLUMN IF NOT EXISTS parenting_hd_design_gates           text,
  ADD COLUMN IF NOT EXISTS parenting_hd_fear_gates             text,
  ADD COLUMN IF NOT EXISTS parenting_hd_melancholy_gates       text,
  ADD COLUMN IF NOT EXISTS parenting_hd_penta_qualities        text,

  -- ─── HD parenting — variables (four transformations) ─────────────────────────
  ADD COLUMN IF NOT EXISTS parenting_hd_variable_brain         text,
  ADD COLUMN IF NOT EXISTS parenting_hd_variable_setting       text,
  ADD COLUMN IF NOT EXISTS parenting_hd_variable_storyline     text,
  ADD COLUMN IF NOT EXISTS parenting_hd_variable_mind          text;
