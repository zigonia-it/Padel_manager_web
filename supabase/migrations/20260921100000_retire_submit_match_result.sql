-- The old result-proposal flow is removed (developer's decision 2026-09-22): players used to type a proposed set score
-- into a separate "Resultatforslag" form, which the admin then chose between when two proposals disagreed. It has been
-- replaced entirely by the point-by-point live scoring + approval workflow (Phase 10/11: award points, submit for
-- approval, the other team approves or disputes, the admin decides a flagged result) -- the client no longer calls
-- submit_match_result at all.
--
-- Decommissioned rather than dropped: submit_match_result_impl only ever touches state->scoreSubmissions (dead data the
-- client no longer reads or writes) and cannot affect scores, standings or match progression, so keeping the function
-- defined but unreachable is simpler than reasoning about a drop, and it costs nothing.

revoke execute on function public.submit_match_result(uuid, text, uuid, uuid, integer, integer, text) from anon;
