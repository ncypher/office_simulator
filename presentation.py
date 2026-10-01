"""Transcript presentation only; does not alter the saved simulation."""
def update_pending(pending, ack, context):
    if not pending or pending.get("context") != context:
        return None
    if not isinstance(ack, dict) or ack.get("context") != context:
        return pending
    identity = ack.get("playback_id")
    if isinstance(identity, bool) or not isinstance(identity, int) or identity not in pending["ids"]:
        return pending
    result = dict(pending, revealed=max(identity, pending.get("revealed", -1)))
    if ack.get("complete") is True and identity == pending["ids"][-1]:
        return None
    return result


def is_revealed(index, pending):
    return not pending or index not in pending["ids"] or index <= pending.get("revealed", -1)
