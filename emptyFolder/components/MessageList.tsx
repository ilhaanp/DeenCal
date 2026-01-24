import React from 'react';
import { ChatMessage } from '@/lib/intents';

type Props = {
  messages: ChatMessage[];
};

const roleLabel: Record<ChatMessage['role'], string> = {
  user: 'You',
  assistant: 'Guide',
  system: 'System'
};

export const MessageList: React.FC<Props> = ({ messages }) => {
  return (
    <div className="flex flex-col gap-3">
      {messages.map((message, index) => (
        <div
          key={`${message.role}-${index}-${message.timestamp ?? 't'}`}
          className={`rounded-lg border px-3 py-2 shadow-sm ${
            message.role === 'user' ? 'bg-white' : 'bg-white/80'
          }`}
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {roleLabel[message.role]}
          </div>
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
      ))}
    </div>
  );
};
