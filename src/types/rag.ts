export interface RagDocument {
  id: string;
  title: string;
  content: string;
  dateAdded: number;
  queryCount: number;
  relatedChats: string[];
}

export interface RagLink {
  source: string;
  target: string;
}

export interface RagGraphData {
  nodes: RagDocument[];
  links: RagLink[];
}

export const DUMMY_DOCUMENTS: RagDocument[] = [
  {
    id: 'doc-1',
    title: 'Quantum Computing Overview',
    content: 'Quantum computing leverages quantum mechanical phenomena such as superposition and entanglement to process information in fundamentally new ways. Unlike classical bits which are either 0 or 1, qubits can exist in multiple states simultaneously, enabling exponential parallelism for certain computational problems. Major tech companies including IBM, Google, and Microsoft are investing heavily in developing practical quantum computers.',
    dateAdded: Date.now() - 86400000 * 30,
    queryCount: 12,
    relatedChats: ['Quantum discussion', 'Future of computing'],
  },
  {
    id: 'doc-2',
    title: 'Machine Learning Fundamentals',
    content: 'Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed. It focuses on developing computer programs that can access data and use it to learn for themselves. The process begins with observations or data, looking for patterns in data and making better decisions in the future based on the examples provided.',
    dateAdded: Date.now() - 86400000 * 25,
    queryCount: 8,
    relatedChats: ['ML basics help'],
  },
  {
    id: 'doc-3',
    title: 'Neural Network Architectures',
    content: 'Neural networks are computing systems inspired by biological neural networks. They consist of interconnected nodes or neurons organized in layers. Deep learning architectures include convolutional neural networks for image processing, recurrent neural networks for sequential data, and transformer models for natural language tasks. Each architecture is designed to handle specific types of data and problems.',
    dateAdded: Date.now() - 86400000 * 20,
    queryCount: 15,
    relatedChats: ['NN architecture question', 'Deep learning project'],
  },
  {
    id: 'doc-4',
    title: 'Database Indexing Strategies',
    content: 'Database indexing is a data structure technique used to quickly locate and access data in a database. Indexes are created using columns from database tables and significantly speed up query retrieval times at the cost of additional storage and write overhead. Common index types include B-tree, hash, bitmap, and full-text indexes. Choosing the right indexing strategy depends on query patterns and data characteristics.',
    dateAdded: Date.now() - 86400000 * 18,
    queryCount: 5,
    relatedChats: ['DB performance tuning'],
  },
  {
    id: 'doc-5',
    title: 'REST API Design Principles',
    content: 'REST (Representational State Transfer) is an architectural style for designing networked applications. It relies on stateless, client-server communication using standard HTTP methods. Key principles include uniform interface, resource-based URLs, statelessness, and cacheability. Well-designed REST APIs use nouns for resources, proper HTTP status codes, and versioning strategies to maintain backward compatibility.',
    dateAdded: Date.now() - 86400000 * 15,
    queryCount: 10,
    relatedChats: ['API design review', 'Building a REST service'],
  },
  {
    id: 'doc-6',
    title: 'GraphQL vs REST Comparison',
    content: 'GraphQL is a query language and runtime for APIs developed by Facebook as an alternative to REST. Unlike REST which exposes multiple endpoints, GraphQL exposes a single endpoint and lets clients specify exactly what data they need. This reduces over-fetching and under-fetching of data. GraphQL provides strong typing, introspection, and real-time subscriptions but has a steeper learning curve and different caching considerations.',
    dateAdded: Date.now() - 86400000 * 12,
    queryCount: 7,
    relatedChats: ['API tech decision'],
  },
  {
    id: 'doc-7',
    title: 'Containerization with Docker',
    content: 'Docker is a platform for developing, shipping, and running applications in containers. Containers are lightweight, standalone packages that include everything needed to run software: code, runtime, system tools, and libraries. Unlike virtual machines, containers share the host OS kernel and start instantly. Docker containers are portable across any system running Docker, making deployment consistent and reliable.',
    dateAdded: Date.now() - 86400000 * 10,
    queryCount: 9,
    relatedChats: ['Docker setup help', 'Container deployment'],
  },
  {
    id: 'doc-8',
    title: 'Cryptography Basics',
    content: 'Cryptography is the practice of secure communication in the presence of adversaries. It involves techniques for encrypting and decrypting data to ensure confidentiality, integrity, authentication, and non-repudiation. Modern cryptography relies on mathematical algorithms including symmetric encryption, asymmetric encryption, and hash functions. Common applications include HTTPS, digital signatures, and secure messaging.',
    dateAdded: Date.now() - 86400000 * 7,
    queryCount: 6,
    relatedChats: ['Security discussion'],
  },
  {
    id: 'doc-9',
    title: 'WebAssembly Performance Guide',
    content: 'WebAssembly is a binary instruction format that enables high-performance applications to run in web browsers. It serves as a compilation target for languages like C, C++, and Rust, allowing them to execute at near-native speed. WebAssembly is designed to complement JavaScript, not replace it. Use cases include video editing, 3D rendering, scientific simulations, and computationally intensive web applications.',
    dateAdded: Date.now() - 86400000 * 5,
    queryCount: 4,
    relatedChats: ['Wasm integration'],
  },
  {
    id: 'doc-10',
    title: 'Distributed Systems Concepts',
    content: 'Distributed systems are collections of independent computers that appear as a single coherent system to users. Key challenges include network latency, partial failures, consistency models, and clock synchronization. Fundamental concepts include the CAP theorem, consensus algorithms like Paxos and Raft, distributed transactions, and replication strategies. Modern distributed systems power cloud computing platforms and large-scale web services.',
    dateAdded: Date.now() - 86400000 * 3,
    queryCount: 11,
    relatedChats: ['System design prep', 'Distributed DB talk'],
  },
];

export const DUMMY_LINKS: RagLink[] = [
  { source: 'doc-1', target: 'doc-2' },
  { source: 'doc-2', target: 'doc-3' },
  { source: 'doc-5', target: 'doc-6' },
  { source: 'doc-7', target: 'doc-10' },
  { source: 'doc-3', target: 'doc-8' },
  { source: 'doc-4', target: 'doc-10' },
  { source: 'doc-9', target: 'doc-1' },
];
