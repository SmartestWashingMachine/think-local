export const RAG_FIRST_MESSAGE_TEMPLATE = (message: string): string =>
  `[RAG] Answer based on your knowledge base. If uncertain, say so.\n\nUser: ${message}`;

export const RAG_DEFAULT_TEMPLATE = (message: string): string =>
  `[RAG] Continue naturally, referring to your knowledge base as needed.\n\nUser: ${message}`;
