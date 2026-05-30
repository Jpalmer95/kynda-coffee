-- Epic 5: Marketing approval gate.
--
-- Owner requirement: agents draft, the owner approves, THEN it posts. The
-- existing social_posts status set (draft|scheduled|published|failed) has no
-- explicit human approval step, so an agent-generated post could be scheduled
-- without sign-off. This adds an approval workflow:
--
--   draft -> pending_approval -> (approved -> scheduled/published) | rejected
--
-- Nothing an agent generates can reach 'scheduled' or 'published' without
-- passing through owner approval.

-- 1) Widen the status check to include the approval states.
ALTER TABLE public.social_posts DROP CONSTRAINT IF EXISTS social_posts_status_check;
ALTER TABLE public.social_posts
  ADD CONSTRAINT social_posts_status_check
  CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'scheduled', 'published', 'failed'));

-- 2) Approval audit columns.
ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'agent', 'content_drop', 'special', 'newsletter')),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  -- link a post back to the special / campaign it was generated from
  ADD COLUMN IF NOT EXISTS special_id UUID REFERENCES public.specials(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_social_posts_pending
  ON public.social_posts (created_at DESC) WHERE status = 'pending_approval';

COMMENT ON COLUMN public.social_posts.source IS
  'How the post was created: manual (owner), agent (Hermes/marketing AI), content_drop, special, newsletter. Agent-sourced posts require approval.';
