"""Versioned, bounded JSON saves. Never load executable data or unknown fields."""
import json
import re

MAX_BYTES = 5_000_000
IDS = ("boss", "alex", "sam")

def clean_state(data):
    if not isinstance(data, dict) or type(data.get("version", 1)) is not int or data.get("version", 1) != 1:
        raise ValueError("This is not a supported Office Hours save.")
    def number(value, low, high):
        if type(value) is not int or not low <= value <= high:
            raise ValueError("The save contains an invalid number.")
        return value
    def text(value, maximum, empty=True):
        if not isinstance(value, str) or len(value) > maximum or (not empty and not value.strip()):
            raise ValueError("The save contains an invalid text field.")
        return value
    def choice(value, options):
        if not isinstance(value, str) or value not in options:
            raise ValueError("The save contains an unknown character or dialogue type.")
        return value
    try:
        cast = data["cast"]
        if not isinstance(cast, list) or len(cast) != 3 or [c["id"] for c in cast] != list(IDS):
            raise ValueError("The save must contain the three office roles.")
        safe_cast = []
        for c in cast:
            color = text(c["color"], 7, False)
            if not re.fullmatch(r"#[0-9a-fA-F]{6}", color):
                raise ValueError("A character color is invalid.")
            safe_cast.append(dict(id=c["id"], color=color,
                name=text(c["name"],30,False), role=text(c["role"],60,False), emoji=text(c["emoji"],12),
                nature=text(c["nature"],1800), motivation=text(c["motivation"],300),
                insecurity=text(c["insecurity"],300), assertiveness=number(c["assertiveness"],1,10), warmth=number(c["warmth"],1,10)))
        trust = {a: {b: number(data["trust"][a][b],0,100) for b in IDS if a != b} for a in IDS}
        log = data["log"]
        if not isinstance(log, list) or len(log) > 5000:
            raise ValueError("Save files can contain up to 5,000 entries.")
        safe_log, current_scene = [], 0
        for entry in log:
            kind = choice(entry["kind"], ("event","line"))
            scene = number(entry["scene"],1,5000)
            audience = entry["audience"]
            if not isinstance(audience,list) or not 2 <= len(audience) <= 3 or any(not isinstance(a,str) or a not in IDS for a in audience) or len(set(audience)) != len(audience):
                raise ValueError("A dialogue audience is invalid.")
            item = dict(kind=kind, scene=scene, audience=list(audience), text=text(entry["text"],2000,False))
            if kind == "event":
                if scene != current_scene + 1 or set(audience) != set(IDS):
                    raise ValueError("The scene order is invalid.")
                current_scene = scene
            else:
                who = choice(entry["speaker"],IDS)
                if scene != current_scene or who not in audience:
                    raise ValueError("A dialogue entry is outside its scene or audience.")
                item.update(speaker=who,name=text(entry["name"],30,False),
                    source=choice(entry["source"],("human","demo","AI")),
                    stance=choice(entry["stance"],("neutral","support","challenge","deflect")),
                    emotion=choice(entry["emotion"],("neutral","warm","tense","thoughtful")),action=text(entry["action"],160))
            safe_log.append(item)
        if number(data["scene"],0,5000) != current_scene:
            raise ValueError("The save's current scene does not match its history.")
        return dict(cast=safe_cast,log=safe_log,trust=trust,scene=current_scene,cursor=number(data["cursor"],0,2))
    except (KeyError,TypeError,IndexError) as exc:
        raise ValueError("This save is missing required Office Hours data.") from exc

def import_state(raw):
    if not isinstance(raw,(bytes,str)):
        raise ValueError("Choose an Office Hours JSON save.")
    if len(raw.encode("utf-8") if isinstance(raw,str) else raw) > MAX_BYTES:
        raise ValueError("Choose a save smaller than 5 MB.")
    try:
        state = clean_state(json.loads(raw))
    except (UnicodeError,json.JSONDecodeError,RecursionError) as exc:
        raise ValueError("This file is not readable Office Hours JSON.") from exc
    if not state["scene"]:
        raise ValueError("This save has no scene to resume.")
    return state
