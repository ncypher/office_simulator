from pathlib import Path
import html
import os
import streamlit as st
import streamlit.components.v1 as components
from engine import (fresh_state, SCENARIOS, add_event, add_line, audience_for,
                    next_speaker, character, demo_reply, export_state)
from dialogue import live_reply

ROOT = Path(__file__).parent
office = components.declare_component("little_office", path=str(ROOT / "office"))
st.set_page_config(page_title="Office Hours · A tiny workplace drama", page_icon="🪴", layout="wide")
st.markdown('''<style>
.block-container{padding-top:1.7rem;padding-bottom:2rem;max-width:1560px}
h1{font-size:2.5rem!important;letter-spacing:-.08rem} h3{font-size:1.2rem!important}
[data-testid="stAppViewContainer"]{background:radial-gradient(ellipse at 75% 0%,#30225280,transparent 52%),radial-gradient(ellipse at 0% 90%,#12383d60,transparent 50%),#111426;color:#edf0ff}
[data-testid="stHeader"]{background:#111426e8}
[data-testid="stSidebar"]{background:#191c31;border-right:1px solid #343852}
.eyebrow{color:#b4a6eb;font-size:.8rem;font-weight:700;letter-spacing:.14em;margin:0}
.scene-note{background:linear-gradient(110deg,#352951,#24243e);color:#f2edff;border-left:4px solid #b09aff;border-radius:0 12px 12px 0;padding:14px 18px;margin:0 0 18px;font-size:1rem}
.line{background:#20243a;color:#edf0ff;border:1px solid #373b56;border-radius:14px;padding:14px 16px;margin-bottom:10px}
.line strong{filter:brightness(1.4)}
.line .meta{font-size:.85rem;color:#b4b9d3}.line p{margin:6px 0 0;line-height:1.5}
.castcard{border-top:4px solid var(--accent);background:linear-gradient(140deg,#292d46,#1c2035);color:#edf0ff;padding:14px;border-radius:10px;margin-bottom:12px;box-shadow:0 6px 24px #0002}
.castcard strong{font-size:1.1rem}.castcard span{color:#b4b9d3;font-size:.85rem}
</style>''', unsafe_allow_html=True)

if "world" not in st.session_state:
    st.session_state.world = fresh_state()
    add_event(st.session_state.world, SCENARIOS["The credit mix-up"])
state = st.session_state.world
esc = html.escape

with st.sidebar:
    st.markdown("### 🪴 The director’s chair")
    mode = st.radio("Dialogue", ["Demo · no key needed", "Live AI"], key="mode")
    api_key = ""
    model = "gpt-4.1-mini"
    if mode == "Live AI":
        api_key = st.text_input("OpenAI API key", type="password", key="api_key") or os.getenv("OPENAI_API_KEY", "")
        model = st.text_input("Model", value="gpt-4.1-mini", help="Use a text model available to your API account.")
        st.caption("Key stays in this server session. Live turns send character context and visible dialogue to OpenAI. API usage is billed to your account.")
    else:
        st.caption("Scripted dialogue. Warmth and assertiveness affect delivery; live AI uses the full character description.")
    st.divider()
    ids = [c["id"] for c in state["cast"]]
    labels = {"observer": "Observe the scene", **{c["id"]: f'Play {c["name"]} · {c["role"]}' for c in state["cast"]}}
    human = st.selectbox("Your seat", ["observer"] + ids, format_func=labels.get, key="human")
    recipient = "everyone"
    if human != "observer":
        recipient = st.selectbox("Who can hear you?", ["everyone"] + [i for i in ids if i != human],
            format_func=lambda i: "Everyone at the table" if i == "everyone" else f'Only {character(state, i)["name"]}', key=f"recipient_{human}")
    st.divider()
    with st.expander("AI settings & session"):
        st.caption("Each click runs at most 3 AI turns. Nothing runs in the background. The latest 40 exchanges visible to each character inform its next response.")
        st.download_button("Download session", export_state(state), "office-hours.json", "application/json")
        if st.button("Start a fresh session"):
            st.session_state.world = fresh_state()
            add_event(st.session_state.world, SCENARIOS["The credit mix-up"])
            for key in list(st.session_state):
                if key.startswith(("cast_", "trust_")):
                    del st.session_state[key]
            st.rerun()

st.markdown('<p class="eyebrow">THREE PEOPLE. ONE VERY SMALL OFFICE.</p>', unsafe_allow_html=True)
head, badge = st.columns([4, 1])
with head:
    st.title("Office Hours")
with badge:
    st.caption(f'SCENE {state["scene"]:02d}  /  {"LIVE AI" if mode == "Live AI" else "DEMO"}')

play, cast_tab = st.tabs(["The office", "Meet the cast"])
with cast_tab:
    st.write("Give them a nature. See what happens under pressure.")
    with st.form("cast_form"):
        cols = st.columns(3)
        changes = []
        for col, c in zip(cols, state["cast"]):
            with col:
                st.markdown(f'### {c["emoji"]} {c["role"]}')
                cid = c["id"]
                changes.append(dict(c, name=st.text_input("Name", c["name"], max_chars=30, key=f"cast_{cid}_name"),
                    nature=st.text_area("Personality", c["nature"], max_chars=1800, key=f"cast_{cid}_nature"),
                    motivation=st.text_input("What they want", c["motivation"], max_chars=300, key=f"cast_{cid}_want"),
                    insecurity=st.text_input("What they fear", c["insecurity"], max_chars=300, key=f"cast_{cid}_fear"),
                    assertiveness=st.slider("Assertiveness", 1, 10, c["assertiveness"], key=f"cast_{cid}_assert"),
                    warmth=st.slider("Warmth", 1, 10, c["warmth"], key=f"cast_{cid}_warm")))
        if st.form_submit_button("Save characters", type="primary"):
            if all(c["name"].strip() for c in changes):
                state["cast"] = changes
                st.rerun()
            else:
                st.error("Give each character a name.")
    st.caption("Edits affect future turns. Existing dialogue keeps the names used when it was spoken.")
    st.markdown("### Starting relationships")
    with st.form("trust_form"):
        relationship_values = {}
        for col, c in zip(st.columns(3), state["cast"]):
            with col:
                st.markdown(f'**{c["name"]}’s trust**')
                relationship_values[c["id"]] = {other["id"]: st.slider(f'In {other["name"]}', 0, 100,
                    state["trust"][c["id"]][other["id"]], key=f'trust_{c["id"]}_{other["id"]}') for other in state["cast"] if other != c}
        if st.form_submit_button("Set relationships"):
            state["trust"] = relationship_values
            st.rerun()

audience = audience_for(state, human, recipient)
with play:
    latest_event = next(e for e in reversed(state["log"]) if e["kind"] == "event")
    st.markdown(f'<div class="scene-note">{esc(latest_event["text"])}</div>', unsafe_allow_html=True)
    stage, transcript = st.columns([1.5, 1], gap="large")
    with stage:
        stage_lines = [dict(e, playback_id=i) for i, e in enumerate(state["log"])
                       if e["kind"] == "line" and e["scene"] == state["scene"] and
                       (human == "observer" or human in e["audience"])][-3:]
        last = stage_lines[-1] if stage_lines else None
        office(cast=[{k: c[k] for k in ("id", "name", "role", "color")} for c in state["cast"]],
               line=last, lines=stage_lines, human=human, scene=state["scene"], key="office_stage", default=None)
        st.caption("Drag to orbit · Scroll to zoom · Select a character to focus · Home resets the view")
        for col, c in zip(st.columns(3), state["cast"]):
            with col:
                st.markdown(f'<div class="castcard" style="--accent:{c["color"]}"><strong>{esc(c["name"])}</strong><br><span>{esc(c["role"])} · {"You" if c["id"] == human else "AI" if mode == "Live AI" else "Demo"}</span></div>', unsafe_allow_html=True)
        with st.expander("Drop in a situation"):
            preset = st.selectbox("Situation", list(SCENARIOS) + ["Write my own"])
            with st.form("situation"):
                event = st.text_area("What happens?", value=SCENARIOS.get(preset, ""), key=f"event_{preset}", max_chars=2000)
                if st.form_submit_button("Introduce situation"):
                    if event.strip():
                        add_event(state, event)
                        st.rerun()
                    else:
                        st.error("Write a situation first.")
        with st.expander("Relationship temperature"):
            st.caption("Illustrative game scores: supportive delivery +3, challenges −2, deflection −1. These are not measured emotions.")
            for c in state["cast"]:
                for other in state["cast"]:
                    if c != other:
                        score = state["trust"][c["id"]][other["id"]]
                        st.progress(score, text=f'{c["name"]} → {other["name"]}: {score}/100')
    with transcript:
        st.markdown("### Around the table")
        if "turn_error" in st.session_state:
            st.error(st.session_state.pop("turn_error"))
        st.caption("Director view · includes private exchanges" if human == "observer" else f'Playing {character(state, human)["name"]} · only exchanges this character heard')
        with st.container(height=380):
            visible = [e for e in state["log"] if human == "observer" or human in e["audience"]]
            if not any(e["kind"] == "line" for e in visible):
                st.info("The meeting is about to begin. Advance a turn, or take a seat and break the silence.")
            for e in visible:
                if e["kind"] == "event":
                    st.caption(f'SCENE {e["scene"]} · {e["text"]}')
                    continue
                c = character(state, e["speaker"])
                private = " · Private" if len(e["audience"]) == 2 else ""
                st.markdown(f'<div class="line"><strong style="color:{c["color"]}">{esc(e["name"])}</strong><span class="meta"> · {esc(e["source"])}{private}</span><p>{esc(e["text"])}</p><p class="meta">{esc(e["action"])}</p></div>', unsafe_allow_html=True)
        speaker = next_speaker(state, audience)
        if human == speaker:
            st.caption("Your turn. Speak below, or choose Observe the scene to hand control back.")
        else:
            st.caption(f'Next: {character(state, speaker)["name"]}' + (" · private conversation" if len(audience) == 2 else ""))
        left, right = st.columns(2)
        advance = left.button("Next turn", type="primary", disabled=human == speaker, use_container_width=True)
        run = right.button("Run 3 turns", disabled=human == speaker, use_container_width=True)
        if advance or run:
            if mode == "Live AI" and (not api_key.strip() or not model.strip()):
                st.error("Enter your API key and model in the sidebar, or choose Demo.")
            else:
                for _ in range(3 if run else 1):
                    speaker = next_speaker(state, audience)
                    if speaker == human:
                        break
                    try:
                        with st.spinner(f'{character(state, speaker)["name"]} is considering a response…'):
                            reply = live_reply(state, speaker, audience, api_key, model) if mode == "Live AI" else demo_reply(state, speaker, audience)
                        add_line(state, speaker, audience=audience, source="AI" if mode == "Live AI" else "demo", **reply)
                    except Exception:
                        st.session_state.turn_error = "This turn couldn't be completed. Check the key, model access, connection, or API quota and try again. No replacement demo response was inserted."
                        break
                st.rerun()
        if human != "observer":
            with st.form("human_line", clear_on_submit=True):
                words = st.text_area("Your words or action", placeholder="I put my notebook down. ‘Can we clarify who did the work?’", max_chars=2000)
                if st.form_submit_button("Say it"):
                    if words.strip():
                        add_line(state, human, words, audience)
                        st.rerun()
                    else:
                        st.error("Write something to say or do.")
