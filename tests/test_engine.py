import json
import unittest
from engine import fresh_state, add_event, add_line, audience_for, next_speaker, context_for, demo_reply, export_state
from dialogue import validate_reply

class SimulationTests(unittest.TestCase):
    def setUp(self):
        self.s = fresh_state()
        add_event(self.s, "A difficult meeting.")

    def test_private_information_never_enters_third_context(self):
        add_line(self.s, "alex", "PRIVATE CANARY", ["alex", "sam"])
        self.assertNotIn("PRIVATE CANARY", json.dumps(context_for(self.s, "boss", ["boss", "alex", "sam"])))
        self.assertIn("PRIVATE CANARY", json.dumps(context_for(self.s, "sam", ["alex", "sam"])))
        self.assertNotIn(self.s["cast"][1]["insecurity"], json.dumps(context_for(self.s,"boss",["boss","alex","sam"])))

    def test_turn_order_and_private_handoff(self):
        self.assertEqual(next_speaker(self.s, ["boss","alex","sam"]), "boss")
        add_line(self.s,"boss","Hello",["boss","alex","sam"])
        self.assertEqual(next_speaker(self.s,["boss","alex","sam"]),"alex")
        add_line(self.s,"sam","Can we talk?",["sam","boss"])
        self.assertEqual(next_speaker(self.s,["sam","boss"]),"boss")
        self.assertEqual(audience_for(self.s,"sam","boss"),["sam","boss"])

    def test_relationship_changes_only_for_listeners(self):
        add_line(self.s,"alex","Thank you",["alex","sam"],stance="support")
        self.assertEqual(self.s["trust"]["sam"]["alex"],53)
        self.assertEqual(self.s["trust"]["boss"]["alex"],50)

    def test_visible_memory_limit_applied_after_filter(self):
        for i in range(45): add_line(self.s,"boss",f"public {i}",["boss","alex","sam"])
        for i in range(45): add_line(self.s,"alex",f"private {i}",["alex","sam"])
        memory=context_for(self.s,"boss",["boss","alex","sam"])["memories"]
        self.assertEqual(len(memory),40)
        self.assertTrue(all(m["text"].startswith("public") for m in memory))

    def test_empty_event_is_atomic(self):
        before=export_state(self.s)
        with self.assertRaises(ValueError): add_event(self.s,"  ")
        self.assertEqual(before,export_state(self.s))

    def test_demo_acknowledges_human(self):
        add_line(self.s,"sam","I need a clear boundary.",["boss","alex","sam"])
        self.assertIn("I need a clear boundary.",demo_reply(self.s,"boss",["boss","alex","sam"])["text"])

    def test_response_validation(self):
        with self.assertRaises(ValueError): validate_reply('{"text":""}')
        self.assertEqual(validate_reply('{"text":"Hello","stance":"evil"}')["stance"],"neutral")

if __name__ == "__main__": unittest.main()
