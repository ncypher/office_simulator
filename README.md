# Office Hours

Three people. One very small office. A Streamlit workplace drama with an interactive Three.js diorama, configurable characters, and optional AI dialogue.

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

The office uses a dark indigo, plum, and teal palette with warm room lighting. New exchanges play one at a time in the stage bubble. **Pause / Resume** controls playback; **Replay last turns** revisits up to three visible lines from the current scene without making API calls. Characters gesture while their line is playing, then settle. Mood labels and eyebrows reflect their fictional response. Reduced-motion system preferences suppress character animation.

## Live AI

Select **Live AI** and enter an OpenAI API key plus a text-model ID available to your account. `gpt-4.1-mini` is the editable starting value. You may instead set `OPENAI_API_KEY` in the server environment. Calls use the [OpenAI Responses API](https://developers.openai.com/api/docs/quickstart), on the Python server, with `store=False`, a 35-second timeout and no automatic retries. Every click makes at most three requests and stops when the human character's turn arrives. There are no background calls.

Keys are not included in exports, sent to the office iframe, written to files, or committed. Session export includes the full fictional cast and transcript, including private dialogue. Avoid entering real confidential workplace information. API calls send the speaking character's profile, trust, up to 40 recent visible exchanges, and up to eight important witnessed moments to OpenAI. Provider processing and billing still apply; `store=False` is not a promise of zero provider retention. A model or network error leaves that turn uncommitted and allows a retry; it never silently substitutes demo output.

## How it works

- Each AI turn plays exactly one character. Other characters' hidden motivations are excluded from its context.
- Every message records its audience. Private dialogue is filtered before building each character's API context, transcript view, and stage bubble. The director may deliberately observe all dialogue or take over a different role; this is a single-player simulation, not access control between real users.
- Demo lines are explicitly scripted. Warmth and assertiveness affect delivery, recent human speech is acknowledged, and later scenes can quote remembered public exchanges. Demo callbacks never quote private dialogue to a broader audience. Low trust adds caution; strong trust adds an acknowledgment of the relationship. Arbitrary personality descriptions require Live AI for interpretation. Scripts eventually repeat.
- Important moments are derived from witnessed non-neutral dialogue, not fabricated summaries. Each character keeps one moment per scene and speaker, retaining an early moment and the seven most recent when needed. The live model receives its own witnessed private history; its instructions discourage casually disclosing it, but generated dialogue is not a guarantee of secrecy.
- Trust is a simple game mechanic: support +3, challenge −2, deflection −1, neutral 0 for listeners toward the speaker. Relationship labels are fictional flavor, not psychological measurements. Human lines default to neutral; choose **Your delivery** to express support, pushback, or deflection explicitly.
- Mood and gestures are fictional outputs. Character speaking animations are procedural; no audio or speech synthesis is included.
- State lasts for the current Streamlit session; a refresh/reconnect may lose it. Download a versioned JSON save to keep the cast, dialogue, turn order, and trust. Resume accepts the original unversioned exports too. Imports validate types, roles, colors, scene order, audiences, and size (5 MB / 5,000 entries); unknown fields are discarded. API credentials are never restored. No automatic disk saves or background uploads occur.

## Verify

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

The tests exercise private-context isolation, role handoff, turn order, memory limits, response validation, and the actual Streamlit demo workflow. Live provider responses require an API key and are a separate verification step. The custom WebGL component requires a browser for visual verification.

## Deploy to Streamlit Community Cloud

Select this GitHub repository, the `main` branch, and `app.py`. No server key is required for Demo. Visitors can supply their own key for Live AI. The Python dependencies are pinned in `requirements.txt`; the 3D component is served by Streamlit.

MIT licensed. Three.js r170 and its OrbitControls are vendored under their own MIT license in `office/vendor/THREE-LICENSE.txt`.
