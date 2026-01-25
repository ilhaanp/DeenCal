import React from 'react';
import { ChatMessage } from '@/lib/intents';

type Props = {
  messages: ChatMessage[];
};

const roleLabel: Record<ChatMessage['role'], string> = {
  user: 'You',
  assistant: 'Cal',
  system: 'System'
};

export const MessageList: React.FC<Props> = ({ messages }) => {
  return (
    <div className="flex flex-col gap-3">
      {messages.map((message, index) => {
        const isAssistant = message.role === 'assistant';
        const bubbleClasses = isAssistant
          ? 'bg-card text-ink border-edge'
          : 'bg-edge text-ink border-edge';

        return (
          <div
            key={`${message.role}-${index}-${message.timestamp ?? 't'}`}
            className={`rounded-lg border px-3 py-2 shadow-sm ${bubbleClasses}`}
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-ink/60">
              {roleLabel[message.role]}
            </div>
            <p className="text-sm leading-relaxed text-ink/90">{message.content}</p>
          </div>
        );
      })}
    </div>
  );
};
