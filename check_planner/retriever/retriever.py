import asyncio

from .params import bi_encoder, collection, cross_encoder


async def retrieve_regulation(query_text: str, bi_top_k: int = 20, cross_top_k: int = 3):
    if cross_top_k > bi_top_k:
        raise ValueError("cross_top_k doit être ≤ bi_top_k")

    # embeddings dans un thread
    query_embedding = await asyncio.to_thread(bi_encoder.encode, [query_text])

    results = await asyncio.to_thread(collection.query, query_embeddings=query_embedding.tolist(), n_results=bi_top_k)

    docs = results.get("documents") or [[]]
    metas = results.get("metadatas") or [[]]
    first_docs = docs[0] if docs else []
    first_metas = metas[0] if metas else []

    pairs = [(query_text, doc) for doc in first_docs]
    scores = await asyncio.to_thread(cross_encoder.predict, pairs)

    reranked = sorted(
        zip(first_docs, first_metas, scores, strict=False),
        key=lambda x: x[2],
        reverse=True,
    )

    return reranked[:cross_top_k]
