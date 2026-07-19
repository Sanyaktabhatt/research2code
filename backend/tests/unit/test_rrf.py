import uuid

from app.agents.rrf import reciprocal_rank_fusion


def test_rrf_combines_scores_from_multiple_lists() -> None:
    a, b, c = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()

    scores = reciprocal_rank_fusion([[a, b, c], [b, a, c]], k=60)

    # b is ranked #1 in the second list and #2 in the first - should beat a,
    # which is #1 then #2 (same multiset of ranks, so they tie)...
    assert scores[a] == scores[b]
    # ...but c, last in both lists, scores strictly lower than either.
    assert scores[c] < scores[a]


def test_rrf_ignores_ids_absent_from_a_list() -> None:
    a, b = uuid.uuid4(), uuid.uuid4()

    scores = reciprocal_rank_fusion([[a], [b]], k=60)

    assert a in scores
    assert b in scores
    assert scores[a] == 1.0 / 61
    assert scores[b] == 1.0 / 61


def test_rrf_empty_lists_produce_empty_scores() -> None:
    assert reciprocal_rank_fusion([], k=60) == {}
    assert reciprocal_rank_fusion([[], []], k=60) == {}
