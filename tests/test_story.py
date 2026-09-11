import json
import unittest
from engine import (fresh_state, add_event, add_line, context_for, remembered_moments,
                    next_episode, demo_reply, export_state)
from saves import import_state

class StoryTests(unittest.TestCase):
    def setUp(self):
        self.state = fresh_state()
        add_event(self.state,"The first meeting.")

    def test_important_memory_survives_recent_context_window(self):
        add_line(self.state,"alex","I will make sure your work is credited.",["boss","alex","sam"],stance="support")
        for _ in range(45):
            add_line(self.state,"boss","Routine meeting notes.",["boss","alex","sam"])
        ctx = context_for(self.state,"sam",["boss","alex","sam"])
        self.assertNotIn("credited",json.dumps(ctx["memories"]))
        self.assertIn("credited",json.dumps(ctx["office_history"]))

    def test_private_memory_stays_private_in_context_and_demo_callback(self):
        add_line(self.state,"alex","PRIVATE MEMORY CANARY",["alex","sam"],stance="support")
        add_event(self.state,"A new public meeting.")
        self.assertNotIn("CANARY",json.dumps(context_for(self.state,"boss",["boss","alex","sam"])))
        self.assertNotIn("CANARY",demo_reply(self.state,"sam",["boss","alex","sam"])["text"])
        self.assertIn("CANARY",json.dumps(remembered_moments(self.state,"sam")))

    def test_episodes_follow_relationships(self):
        add_event(self.state,"Second meeting.")
        ordinary=next_episode(self.state)
        self.state["trust"]["sam"]["boss"]=20
        changed=next_episode(self.state)
        self.assertNotEqual(ordinary,changed)
        self.assertIn("written decision log",changed)
        self.assertIn("Sam",changed)

    def test_roundtrip_preserves_story_and_removes_unrecognized_fields(self):
        add_line(self.state,"alex","You have my support.",["alex","sam"],stance="support")
        self.state["api_key"]="DO NOT EXPORT"
        self.state["cast"][0]["token"]="ALSO SECRET"
        saved=export_state(self.state)
        self.assertNotIn("SECRET",saved)
        self.assertNotIn("DO NOT EXPORT",saved)
        restored=import_state(saved)
        self.assertEqual(restored["log"],self.state["log"])
        self.assertEqual(remembered_moments(restored,"sam"),remembered_moments(self.state,"sam"))
        self.assertEqual(restored["trust"],self.state["trust"])

    def test_legacy_save_without_version_is_supported(self):
        self.assertEqual(import_state(json.dumps(self.state)),self.state)

    def test_invalid_saves_rejected(self):
        for change in [lambda s:s.update(version=42),
                       lambda s:s["cast"][0].update(color='</style'),
                       lambda s:s["trust"]["sam"].update(boss=float('nan')),
                       lambda s:s["log"][0].update(audience=["alex","sam"]),
                       lambda s:s.update(cursor=True)]:
            with self.subTest(change=change):
                state=fresh_state();add_event(state,"Test");change(state)
                with self.assertRaises(ValueError):import_state(json.dumps(state))
        with self.assertRaises(ValueError):import_state(b"not JSON")
        with self.assertRaises(ValueError):import_state(b"x"*5_000_001)

if __name__ == "__main__":unittest.main()
