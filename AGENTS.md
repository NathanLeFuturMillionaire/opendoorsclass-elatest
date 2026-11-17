<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

English Speaking captures complete PCM WAV through an AudioWorklet, saves immutable private original audio before transcription, and consumes authoritative final transcript events in ordered standalone segments, so browser preview recognition cannot lose or duplicate the submitted answer.
Speaking answers use a service-only atomic JSON field update and recording references; original playback is restricted to the candidate and existing owner, admin or moderator roles, so concurrent saves and private coach review remain safe.
Text shown to users never contains an em dash, en dash or non-breaking hyphen; `src/lib/no-em-dash.test.ts` scans every file in `src` for those code points, so write empty-value markers and separators with plain words or a middle dot, and keep AI prompts free of those characters too.
Reading Workshop lives under `/reading-workshop*` with `rw_` tables; workshop coach and learner membership comes from staff-managed `rw_coaches`/`rw_learners` rows (staff = owner/admin via `rw_is_staff`), so placement-test roles and data stay untouched.
Reading Workshop lessons are AI-drafted server-side into `rw_lessons` as drafts and only reach learners after staff publish them; adapted texts require a named source, so no unverified attribution is shown.
- Reading Workshop reads placement results only through the staff-gated `rw_placement_suggestion` function (latest completed English level, C2 mapped to C1), so learners never see another person's test data and the admin keeps the final level.
- Reading Workshop comprehension answers are saved and graded only through `rw_save_answer`/`rw_grade_answer` into `rw_answers`, and learners read questions through `rw_lesson_questions` (the raw `questions` column is not selectable by app users), so answer keys never reach learners before they answer.
- Reading Workshop removals are reversible deactivations through the `rw_set_active` function (reason required, logged in `rw_removal_log`, coach reassignment enforced); app users cannot hard-delete coaches or learners and a trigger blocks removing owner/admin accounts, so rules hold even outside the UI.
- Reading Workshop chat writes go only through `rw_chat_*` security definer functions (membership, contact rules, 20 messages per minute, 50 MB files in private `rw-chat` bucket under the conversation folder); app users only SELECT chat tables, so privacy and anti-spam hold outside the UI.
