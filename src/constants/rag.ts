export const RAG_DEFAULT_TOP_K = 3;

export const RAG_FIRST_MESSAGE_TEMPLATE = (message: string): string =>
  `[RAG] Answer based on your knowledge base. If uncertain, say so.\n\nUser: ${message}`;

export const RAG_DEFAULT_TEMPLATE = (message: string): string =>
  `[RAG] Continue naturally, referring to your knowledge base as needed.\n\nUser: ${message}`;

export const buildRagAugmentedMessage = (query: string, context: string): string =>
  `Use the following knowledge base context to answer the user's question. If the context doesn't contain the answer, say so.\n\nContext:\n${context}\n\nUser query: ${query}`;
