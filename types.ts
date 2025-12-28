// (Mental Sandbox - We will implement this later)
export type ChatRequest = {
  message: string;
  sessionId?: string;
};

export type ChatResponse = {
  reply: string;
  sessionId: string;
};

export type Message = {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
};