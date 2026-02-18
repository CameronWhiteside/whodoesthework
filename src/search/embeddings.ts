// src/search/embeddings.ts

const EMBEDDING_MODEL = "@cf/baai/bge-small-en-v1.5";

export async function embed(ai: Ai, text: string): Promise<number[]> {
  const result = await ai.run(EMBEDDING_MODEL, {
    text: [text],
  }) as { data: number[][] };

  return result.data[0]!;
}

export async function embedBatch(ai: Ai, texts: string[]): Promise<number[][]> {
  // Workers AI supports batch embedding
  const result = await ai.run(EMBEDDING_MODEL, {
    text: texts,
  }) as { data: number[][] };

  return result.data;
}
