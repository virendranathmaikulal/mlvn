-- Performance optimization for pharmacy chat bot
-- Optimizes message history queries for LLM context window management

-- Index for fast conversation history retrieval (sliding window pattern)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON public.whatsapp_conversation_messages(conversation_id, created_at DESC);

-- Comment explaining the optimization
COMMENT ON INDEX idx_messages_conversation_created IS 
'Optimizes "fetch last N messages" queries for LLM context. Used in sliding window pattern for conversation history.';
