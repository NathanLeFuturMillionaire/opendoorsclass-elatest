# English Speaking audit and verification

## Findings
- Browser live recognition was only a preview, not the submitted transcript. Its final events could be repeated or arrive after stop, and it did not restart on natural recognition termination.
- Navigation could unmount the recorder while it was recording or processing. Cleanup stopped tracks without an explicit finalized recording lifecycle.
- Recorded audio was sent as base64 and never retained. The server saved only transcript, score and feedback and did not check the final persistence error.
- Very long input can exhaust the existing transcription model's output budget; live verification also showed that a long silence can cause recognition to omit subsequent speech.
- The initial English session answers can be a JSON array, so an atomic object-field save must normalize non-object values first.

## Changes
- Complete PCM capture via AudioWorklet with final buffered samples acknowledged before WAV encoding and microphone release.
- Explicit microphone, recording, stopping, saving, processing, saved and error states. Question navigation is disabled during capture and processing. Final test submission waits for active oral processing and uses current answers.
- Immutable private original audio saved before transcription. Candidate playback and existing owner/admin/moderator coach playback in Candidates.
- Final transcript events are authoritative; incomplete streams fail explicitly instead of saving partial previews.
- Standalone short WAV recognition segments, with natural pause boundaries; every original sample is retained. Speech after a long pause is sent in a fresh recognition context. Pure silence is not submitted for recognition.
- Existing transcription and grading models, English grading prompt, criteria and score thresholds preserved. Questions, writing, listening and Spanish were not changed.
- Service-only atomic oral-answer persistence; failures are visible instead of silently becoming a zero score.

## Verified
- Automated tests cover short first/last samples, five-second silence, full long-file segmentation, final events, fragmented UTF8/SSE, incomplete streams, errors and private playback permissions.
- Authenticated Chromium flow: microphone capture, 17-second recording, navigation disabled during capture, complete spoken source transcript including final sentence, answer saved, navigation back, original audio plays from private storage.
- Owner coach playback works on desktop and a 390px mobile viewport with no horizontal overflow.
- Real gateway transcription and grading tested with synthesized spoken samples: short answer, slow British English, fast American English with difficult vocabulary, natural five-second pause, and a roughly 108-second response containing nine spoken passages.
- After shorter pause-aware segmentation, all nine long-response passages and all nine final sentences were transcribed. Speech before and after a natural pause was transcribed including the final sentence.

## Limits and remaining checks
- Recognition is not guaranteed verbatim. A fast synthetic sample omitted a final sentence; an artificial pause inserted in the middle of a word caused recognition errors. Original audio was preserved. No model was silently replaced.
- Physical iPhone/Safari, Android devices, real microphone disconnection and a broad range of human accents are not available in this sandbox and remain unverified.
- A browser crash or forced closure before upload can still lose unsent audio. Before-unload warnings are best effort, not crash recovery.
- The whole English result submission at the 30-minute deadline was not exercised end to end; only the oral answer save and readback were verified.
- Full 30-minute audio processing is not yet benchmarked against published execution limits. The roughly 108-second real input was verified.

The request's comprehensive all-device and deadline verification is not complete; these limits must not be presented as verified.