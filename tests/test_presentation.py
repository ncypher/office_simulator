import unittest
from presentation import update_pending, is_revealed

class PresentationTests(unittest.TestCase):
    def setUp(self):
        self.pending = dict(context='0:observer:1', ids=[1,2,3], revealed=0)
    def test_batch_is_revealed_one_speaker_at_a_time(self):
        p = self.pending
        self.assertTrue(is_revealed(0,p))
        self.assertFalse(is_revealed(1,p))
        p = update_pending(p,dict(context=p['context'],playback_id=1),p['context'])
        self.assertTrue(is_revealed(1,p)); self.assertFalse(is_revealed(2,p))
        p = update_pending(p,dict(context=p['context'],playback_id=3),p['context'])
        self.assertIsNotNone(p)
        p = update_pending(p,dict(context=p['context'],playback_id=3,complete=True),p['context'])
        self.assertIsNone(p)
    def test_replay_and_stale_callbacks_cannot_rewind_or_complete_new_batch(self):
        p = dict(self.pending, revealed=2)
        for ack in [None, {},dict(context='old',playback_id=3,complete=True),
                    dict(context=p['context'],playback_id=True),dict(context=p['context'],playback_id=99)]:
            self.assertEqual(update_pending(p,ack,p['context']),p)
        result=update_pending(p,dict(context=p['context'],playback_id=1),p['context'])
        self.assertEqual(result['revealed'],2)
        self.assertIsNone(update_pending(p,None,'0:boss:1'))
