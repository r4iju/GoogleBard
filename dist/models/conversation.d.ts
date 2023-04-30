interface Conversation {
    id: string;
    conversationId: string;
    requestId: string;
    responseId: string;
    lastActive: number | null;
}
export default Conversation;
