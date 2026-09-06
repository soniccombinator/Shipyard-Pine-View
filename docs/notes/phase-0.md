# Phase 0 Notes

## Public project details are separate from private credentials

The Quick Reference Guide contains the Supabase URL and publishable key alongside private passwords and API keys. Only the public values belong in source configuration; all private values must be rotated and stored in ignored environment files or deployment secrets.

## The repository began without an application schema

Only a README existed in the shared repository, so Phase 0 establishes the initial schema rather than extending a prior migration. Later phases should add numbered migrations and should not edit `0001_init.sql` after it is applied.

## Automatic transcription needs a human-safe failure mode

The configured Anthropic text model is not treated as an audio transcription service. Missing transcript output produces a manual-review placeholder and never a fabricated caption.
