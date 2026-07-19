import uuid


def reciprocal_rank_fusion(
    ranked_id_lists: list[list[uuid.UUID]],
    k: int = 60,
) -> dict[uuid.UUID, float]:
    """Combines multiple ranked ID lists into one fused score per ID.

    Standard RRF: score(id) = sum over lists containing id of 1 / (k + rank),
    where rank is 1-indexed. An ID absent from a list simply contributes
    nothing from that list. Only relative order within each input list
    matters - raw similarity/rank scores are not required.
    """
    scores: dict[uuid.UUID, float] = {}

    for ranked_ids in ranked_id_lists:
        for rank, item_id in enumerate(ranked_ids, start=1):
            scores[item_id] = scores.get(item_id, 0.0) + 1.0 / (k + rank)

    return scores
