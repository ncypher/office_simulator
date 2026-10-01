# Office Hours

Three people. One very small office. A Streamlit workplace drama with an interactive Three.js diorama, configurable characters, and optional AI dialogue.

**[Play Office Hours](https://office-simulator.streamlit.app/)** · [More Streamlit worlds](https://github.com/ncypher/ncypher#start-with-something-you-can-touch) · [Conversational Artifacts](https://ncypher.github.io/tomfoolery/#collection)

Related community project: [Project reoWren](https://www.patreon.com/cw/ProjectreoWren), an experimental approach to community-owned reporting and radio-mesh communication.


## Play

Requires Python 3.11 or newer.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m streamlit run app.py
```

On macOS/Linux use `.venv/bin/python` instead. Open the local URL printed by Streamlit.

1. Start in **Demo**, with no account or key needed. Click **Next turn** or **Run 3 turns**.
2. Open **Meet the cast** to change names, personality, motivation, insecurity, warmth, assertiveness, and directed trust.
3. Choose **Your seat** to take over any character. Write what you say or do. The AI pauses at your turn; you can also interrupt early. Choose **Observe the scene** to hand the role back.
4. Choose a private audience for a two-person conversation. Return to **Everyone at the table** to bring the meeting back together.
5. **Drop in a situation** selects a preset or introduces your own event. **Next episode** chooses a follow-up from the team's relationships. Characters still decide how to respond.
6. **Office history** shows witnessed moments of support, friction, and deflection. They carry into later meetings, along with trust scores.
7. Under **AI settings & session**, download your story and later upload it with **Resume this story**. Download the current story before replacing it if you want to keep both.

Drag the office to orbit, scroll to zoom, click a character to focus, or click **Home** to reset the camera. The conversation controls remain usable if WebGL is unavailable. Three.js is bundled locally so the office has no runtime CDN dependency.

The office uses a dark indigo, plum, and teal palette with warm room lighting. A tiny symbol bubble follows the active speaker; full dialogue and gestures appear in subtitles below the scene. Long subtitles scroll and remain available in the transcript. **Sound off / on** enables optional synthesized cartoon mumbling with a different pitch for each character, without extra API calls. Sound starts only after a click. **Pause / Resume** and **Replay last turns** control up to three visible lines from the current scene. Characters now get out of their chairs: tension can trigger pacing, a deflection can lead to the window, and explicit actions can send them to the coffee machine, whiteboard, or door. Chairs remain at the table, walks follow the perimeter aisles, and each character returns to their seat. A visible stage-direction caption explains the movement. **Stage motion on / off** toggles the larger movements independently of sound; **Pause** freezes their progress. Demo lines include these actions, and Live AI is told which objects exist. Movement uses the existing action and mood fields, with no extra AI calls or save-format changes. Speaking time scales with the length of the line (roughly 150 words per minute). Each exchange is followed by a 1.6-second listening beat and a 2–2.4-second thinking beat before the next response appears. The transcript reveals each reply when its speaker starts, and turn buttons wait until playback finishes. Pause/Resume preserves the remaining time in speech and reaction beats. The same timed text playback works when WebGL is unavailable. Replies in a batch are still generated sequentially up front; this pacing controls their presentation, not additional AI calls. Characters gesture while their line is playing, then settle. Reduced-motion preferences suppress character animation.

In Live AI mode, **Test AI connection** sends a small request to the selected model and displays success or a useful error. It may incur a small API charge; no story data is sent. Changing the key or model clears the previous result. Saved characters, relationships, seat changes, and restored stories display confirmation. Settings last for the Streamlit session; download a story to keep it for later. Credentials are never included in downloads.

## Live AI

Select **Live AI** and enter an OpenAI API key plus a text-model ID available to your account. `gpt-4.1-mini` is the editable starting value. You may instead set `OPENAI_API_KEY` in the server environment. Calls use the [OpenAI Responses API](https://developers.openai.com/api/docs/quickstart), on the Python server, with `store=False`, a 35-second timeout and no automatic retries. Every click makes at most three requests and stops when the human character's turn arrives. There are no background calls.

Keys are not included in exports, sent to the office iframe, written to files, or committed. Session export includes the full fictional cast and transcript, including private dialogue. Avoid entering real confidential workplace information. API calls send the speaking character's profile, trust, up to 40 recent visible exchanges, and up to eight important witnessed moments to OpenAI. Provider processing and billing still apply; `store=False` is not a promise of zero provider retention. A model or network error leaves that turn uncommitted and allows a retry; it never silently substitutes demo output.

## How it works

- Each AI turn plays exactly one character. Other characters' hidden motivations are excluded from its context.
- Every message records its audience. Private dialogue is filtered before building each character's API context, transcript view, and stage bubble. The director may deliberately observe all dialogue or take over a different role; this is a single-player simulation, not access control between real users.
- Demo lines are explicitly scripted. Warmth and assertiveness affect delivery, recent human speech is acknowledged, and later scenes can quote remembered public exchanges. Demo callbacks never quote private dialogue to a broader audience. Low trust adds caution; strong trust adds an acknowledgment of the relationship. Arbitrary personality descriptions require Live AI for interpretation. Scripts eventually repeat.
- Important moments are derived from witnessed non-neutral dialogue, not fabricated summaries. Each character keeps one moment per scene and speaker, retaining an early moment and the seven most recent when needed. The live model receives its own witnessed private history; its instructions discourage casually disclosing it, but generated dialogue is not a guarantee of secrecy.
- Trust is a simple game mechanic: support +3, challenge −2, deflection −1, neutral 0 for listeners toward the speaker. Relationship labels are fictional flavor, not psychological measurements. Human lines default to neutral; choose **Your delivery** to express support, pushback, or deflection explicitly.
- Mood and gestures are fictional outputs. Stage directions and speaking animations are procedural; optional sound is synthesized cartoon mumbling, not spoken dialogue.
- State lasts for the current Streamlit session; a refresh/reconnect may lose it. Download a versioned JSON save to keep the cast, dialogue, turn order, and trust. Resume accepts the original unversioned exports too. Imports validate types, roles, colors, scene order, audiences, and size (5 MB / 5,000 entries); unknown fields are discarded. API credentials are never restored. No automatic disk saves or background uploads occur.

## Verify

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

The tests exercise private-context isolation, role handoff, turn order, memory limits, response validation, and the actual Streamlit demo workflow. Live provider responses require an API key and are a separate verification step. Run `node --test tests/test_blocking.mjs tests/test_scene.mjs tests/test_playback.mjs` for stage-direction selection, aisle routes, return-to-seat behavior, and playback integration. The custom WebGL component requires a WebGL-enabled browser for visual verification.

## Deploy to Streamlit Community Cloud

Select this GitHub repository, the `main` branch, and `app.py`. No server key is required for Demo. Visitors can supply their own key for Live AI. The Python dependencies are pinned in `requirements.txt`; the 3D component is served by Streamlit.

MIT licensed. Three.js r170 and its OrbitControls are vendored under their own MIT license in `office/vendor/THREE-LICENSE.txt`.
