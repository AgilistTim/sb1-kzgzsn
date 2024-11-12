interface Message {
  type: 'user' | 'assistant';
  content: string;
}

interface MessageListProps {
  messages: Message[];
}

export default function MessageList({ messages }: MessageListProps) {
  return (
    <div className="space-y-4">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`flex ${
            msg.type === 'assistant' ? 'justify-start' : 'justify-end'
          }`}
        >
          <div
            className={`rounded-lg px-4 py-2 ${
              msg.type === 'assistant'
                ? 'bg-muted'
                : 'bg-primary text-primary-foreground'
            }`}
          >
            {msg.content}
          </div>
        </div>
      ))}
    </div>
  );
}