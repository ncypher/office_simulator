import unittest
from unittest.mock import patch, MagicMock
from types import SimpleNamespace
from pathlib import Path
from streamlit.testing.v1 import AppTest
from dialogue import check_connection

class FeedbackTests(unittest.TestCase):
    def test_connection_uses_no_story_and_requires_text(self):
        with patch('openai.OpenAI') as factory:
            client = factory.return_value.__enter__.return_value
            client.responses.create.return_value = SimpleNamespace(status='completed', output_text='OK')
            self.assertTrue(check_connection('test-key', 'test-model')[0])
            args = client.responses.create.call_args.kwargs
            self.assertEqual(args['input'], 'Reply with OK.')
            self.assertFalse(args['store'])
            client.responses.create.return_value = SimpleNamespace(status='incomplete', output_text='')
            self.assertFalse(check_connection('test-key', 'test-model')[0])
            client.responses.create.side_effect = RuntimeError('secret-test-value')
            self.assertNotIn('secret-test-value', check_connection('test-key', 'test-model')[1])

    def test_save_receipt_and_connection_invalidation(self):
        app = AppTest.from_file(str(Path(__file__).resolve().parents[1] / 'app.py'), default_timeout=30).run()
        app.text_input(key='cast_boss_name').input('Pat')
        next(b for b in app.button if b.label == 'Save characters').click().run()
        self.assertEqual(app.session_state['world']['cast'][0]['name'], 'Pat')
        self.assertTrue(any('Characters saved' in x.value for x in app.success))
        app.radio(key='mode').set_value('Live AI').run()
        app.session_state['connection_result'] = (True, 'Connected')
        app.text_input(key='model').input('different-model').run()
        self.assertTrue(any('Connection not tested' in x.value for x in app.info))
        self.assertEqual(len(app.exception), 0)
