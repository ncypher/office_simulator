from pathlib import Path
import json
import unittest
from streamlit.testing.v1 import AppTest

APP = str(Path(__file__).resolve().parents[1] / "app.py")

class AppWorkflowTests(unittest.TestCase):
    def button(self, app, label):
        return next(b for b in app.button if b.label == label)

    def test_demo_takeover_private_reply_and_return_to_observer(self):
        app=AppTest.from_file(APP,default_timeout=30).run()
        self.assertEqual(len(app.exception),0)
        self.button(app,"Run 3 turns").click().run()
        self.assertEqual(len(app.session_state["world"]["log"]),4)
        app.selectbox(key="human").select("alex").run()
        app.selectbox(key="recipient_alex").select("sam").run()
        next(t for t in app.text_area if t.label=="Your words or action").input("PRIVATE TEST MESSAGE")
        self.button(app,"Say it").click().run()
        self.button(app,"Run 3 turns").click().run()
        log=app.session_state["world"]["log"]
        self.assertEqual(log[-1]["speaker"],"sam")
        self.assertEqual(log[-1]["audience"],["alex","sam"])
        self.assertTrue(self.button(app,"Next turn").disabled)
        app.selectbox(key="human").select("boss").run()
        self.assertNotIn("PRIVATE TEST MESSAGE"," ".join(x.value for x in app.markdown))
        self.assertNotIn("PRIVATE TEST MESSAGE",app.get("component_instance")[0].proto.json_args)
        app.selectbox(key="human").select("observer").run()
        self.assertFalse(self.button(app,"Next turn").disabled)
        self.assertEqual(len(app.exception),0)

    def test_new_scene_clears_old_playback(self):
        from engine import add_event
        app=AppTest.from_file(APP,default_timeout=30).run()
        self.button(app,"Run 3 turns").click().run()
        self.assertEqual(len(json.loads(app.get("component_instance")[0].proto.json_args)["lines"]),3)
        add_event(app.session_state["world"],"A new meeting begins.")
        app.run()
        payload=json.loads(app.get("component_instance")[0].proto.json_args)
        self.assertEqual(payload["lines"],[])
        self.assertIsNone(payload["line"])

    def test_live_mode_without_key_does_not_change_dialogue(self):
        app=AppTest.from_file(APP,default_timeout=30).run()
        app.radio(key="mode").set_value("Live AI").run()
        self.button(app,"Next turn").click().run()
        self.assertEqual(len(app.session_state["world"]["log"]),1)
        self.assertEqual(len(app.error),1)

if __name__ == "__main__": unittest.main()
