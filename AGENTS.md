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
