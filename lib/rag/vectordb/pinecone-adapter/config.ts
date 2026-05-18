export const INDEX_NAME = process.env.PINECONE_INDEX_NAME || "codesparring-rag"
export const NAMESPACE_PREFIX = "mockmate_"

export const TFIDF_DIM = 256
export const GEMINI_DIM = 768
export const OPENAI_DIM = 1536
export const SUPPORTED_DIMENSIONS = [TFIDF_DIM, GEMINI_DIM, OPENAI_DIM] as const
