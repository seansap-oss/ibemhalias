-- Explicitly deny Data API access. Engagement data is authorised in the
-- server route handlers; the service role is the only database actor.

DROP POLICY IF EXISTS deny_direct_live_class_questions ON public.live_class_questions;
CREATE POLICY deny_direct_live_class_questions
  ON public.live_class_questions FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS deny_direct_live_class_hand_raises ON public.live_class_hand_raises;
CREATE POLICY deny_direct_live_class_hand_raises
  ON public.live_class_hand_raises FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);
