"""Office simulation state. No credentials, UI dependencies, or network calls."""
from copy import deepcopy
import json

CAST = [
    dict(id="boss", name="Morgan", role="The boss", color="#7964ed", emoji="🟣",
         nature="Charming, optimistic, and a little too good at taking the credit. Turns discomfort into management jargon.",
         motivation="Keep the team successful and look competent to leadership.",
         insecurity="Being exposed as out of touch with the actual work.", assertiveness=7, warmth=6),
    dict(id="alex", name="Alex", role="Employee A", color="#efab44", emoji="🟠",
         nature="An ambitious people-pleaser with a quick smile. Wants to do the right thing but hesitates when it costs approval.",
         motivation="Earn a promotion without losing a friend.",
         insecurity="Being overlooked or disappointing the boss.", assertiveness=4, warmth=8),
    dict(id="sam", name="Sam", role="Employee B", color="#32a9a1", emoji="🟢",
         nature="Observant, dryly funny, and meticulous. Values fairness. Goes quiet before getting very direct.",
         motivation="Have good work recognized and protect reasonable boundaries.",
         insecurity="Doing invisible work while someone else gets rewarded.", assertiveness=6, warmth=4),
]
SCENARIOS = {
    "The credit mix-up": "At the team meeting, the boss publicly credits Employee A for the presentation that Employee B stayed late to finish.",
    "Friday, 4:58 PM": "A client wants the entire proposal rewritten by Monday. The boss has just called it a 'small favor'. Both employees have weekend plans.",
    "One promotion. Two people.": "There is one promotion available. Both employees are qualified. The boss asks them to recommend who should get it, together.",
    "The reply-all": "An employee's draft email criticizing an unrealistic deadline was accidentally sent to the whole team. Everyone is now in the same room.",
    "The coffee incident": "The fancy coffee machine is broken. A handwritten note says 'some of us actually clean up'. Nobody admits writing it.",
}
STANCES = {"support", "challenge", "deflect", "neutral"}

def fresh_state():
    return dict(cast=deepcopy(CAST), log=[], cursor=0, scene=0,
                trust={a["id"]: {b["id"]: 50 for b in CAST if a != b} for a in CAST})

def character(state, identity):
    return next(c for c in state["cast"] if c["id"] == identity)

def add_event(state, text):
    text = text.strip()
    if not text:
        raise ValueError("Write a situation first.")
    state["scene"] += 1
    state["cursor"] = 0
    state["log"].append(dict(kind="event", text=text[:2000], audience=[c["id"] for c in state["cast"]], scene=state["scene"]))

def audience_for(state, human, recipient):
    if human != "observer" and recipient != "everyone":
        return [human, recipient]
    return [c["id"] for c in state["cast"]]

def next_speaker(state, audience):
    ids = [c["id"] for c in state["cast"]]
    return next(ids[(state["cursor"] + offset) % 3] for offset in range(3)
                if ids[(state["cursor"] + offset) % 3] in audience)

def add_line(state, speaker, text, audience, *, source="human", emotion="neutral", stance="neutral", action=""):
    if speaker not in audience or not text.strip():
        raise ValueError("A speaker and a message are required.")
    state["log"].append(dict(kind="line", speaker=speaker, name=character(state, speaker)["name"],
        text=text.strip()[:2000], audience=list(audience), source=source, emotion=emotion,
        stance=stance, action=action[:160], scene=state["scene"]))
    state["cursor"] = ([c["id"] for c in state["cast"]].index(speaker) + 1) % 3
    # An illustrative game mechanic, not a psychological assessment.
    delta = {"support": 3, "challenge": -2, "deflect": -1}.get(stance, 0)
    for listener in audience:
        if listener != speaker:
            state["trust"][listener][speaker] = max(0, min(100, state["trust"][listener][speaker] + delta))

def context_for(state, speaker, audience):
    own = character(state, speaker)
    visible = [e for e in state["log"] if speaker in e["audience"]][-40:]
    return dict(character=own, colleagues=[{k: c[k] for k in ("id", "name", "role")} for c in state["cast"] if c["id"] != speaker],
                your_trust=state["trust"][speaker], present=audience, memories=visible)

def demo_reply(state, speaker, audience):
    """Deliberately scripted; structured traits influence delivery, not arbitrary prose."""
    c = character(state, speaker)
    visible = context_for(state, speaker, audience)["memories"]
    prior = [e for e in visible if e["kind"] == "line" and e["scene"] == state["scene"]]
    event = next((e["text"] for e in reversed(visible) if e["kind"] == "event"), "the situation")
    n = sum(e["speaker"] == speaker for e in prior)
    a, b = state["cast"][1]["name"], state["cast"][2]["name"]
    if len(audience) == 2:
        lines = ["Between us, that meeting landed differently than I expected. What do you need from me?",
                 "I can have that conversation with you here. Let's agree what we're comfortable saying to the room.",
                 "I'd rather we said it clearly to each other before this turns into another awkward meeting."]
    elif "credit" in event.lower() or "presentation" in event.lower():
        lines = {
            "boss": [f"Before we start: fantastic presentation, {a}. That's the kind of ownership I love to see.",
                     "Okay. I may have compressed a few contributions into one name. Let's uncompress that.",
                     f"{b}, walk us through your part. And yes, I'll correct the email to leadership."],
            "alex": [f"Thanks. Though... {b} did quite a lot of the heavy lifting on this one.",
                     f"Actually, {b} built the presentation. I presented it. Those aren't the same thing.",
                     "I'll update the credits before it goes any further. We shouldn't have needed a meeting for that."],
            "sam": ["By 'heavy lifting', do we mean the slides, the analysis, or the part where it became Thursday at midnight?",
                    "I don't need a parade. I would like my name on my work.",
                    "Thank you. Next time, could we establish who did what before the applause?"]}[speaker]
    else:
        subject = event[:180]
        lines = {
            "boss": [f"Let's talk about this: {subject} I'm hoping we can find a practical way forward.",
                     "What would we have to change to make this workable? I need specifics.",
                     "Let's write down the decision and who owns it before we leave."],
            "alex": ["I want to help, but I'd like to hear what this means for each of us first.",
                     "I said yes a little too quickly. Can we revisit the trade-off?",
                     "I can take one piece. I can't quietly promise the whole thing."],
            "sam": ["Can we name the actual problem before we volunteer someone else's time?",
                    "I'd like a clear boundary here, and a decision we can refer back to.",
                    "That's a start. Let's see if the follow-through matches the meeting."]}[speaker]
    text = lines[n % len(lines)]
    if prior and prior[-1].get("source") == "human":
        text = f'On what you just said—“{prior[-1]["text"][:100]}”—' + text[0].lower() + text[1:]
    stance = "support" if c["warmth"] >= 7 else "challenge" if c["assertiveness"] >= 6 else "neutral"
    if c["assertiveness"] <= 3:
        text = "I might be missing something, but " + text[0].lower() + text[1:]
    return dict(text=text, stance=stance, emotion={"support": "warm", "challenge": "tense"}.get(stance, "thoughtful"),
                action={"boss": "Sets the coffee mug down.", "alex": "Glances around the table.", "sam": "Closes the notebook."}[speaker])

def export_state(state):
    return json.dumps(state, indent=2, ensure_ascii=False)
