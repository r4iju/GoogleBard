interface BardResponse {
  content: string;
  options: string[];
  conversationId: string;
  requestId: string;
  responseId: string;
}

export default BardResponse