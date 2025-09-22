import asyncio
from .params import collection, bi_encoder, cross_encoder

async def retrieve_regulation(query_text: str, bi_top_k: int = 20, cross_top_k: int = 3):
    if cross_top_k > bi_top_k:
        raise ValueError("cross_top_k doit être ≤ bi_top_k")

    # embeddings dans un thread
    query_embedding = await asyncio.to_thread(bi_encoder.encode, [query_text])

    results = await asyncio.to_thread(
        collection.query,
        query_embeddings=query_embedding.tolist(),
        n_results=bi_top_k
    )

    pairs = [(query_text, doc) for doc in results['documents'][0]]
    scores = await asyncio.to_thread(cross_encoder.predict, pairs)

    reranked = sorted(
        zip(results['documents'][0], results['metadatas'][0], scores),
        key=lambda x: x[2],
        reverse=True
    )

    return reranked[:cross_top_k]
