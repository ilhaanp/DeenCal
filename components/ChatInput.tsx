import React, { useState } from 'react';

type Props = {
  onSend: (message: string) => Promise<void> | void;
  placeholder?: string;
};

export const ChatInput: React.FC<Props> = ({ onSend, placeholder }) => {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    await onSend(value.trim());
    setValue('');
    setBusy(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal focus:outline-none"
        placeholder={placeholder ?? 'Share what you need'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={busy}
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? 'Thinking…' : 'Send'}
      </button>
    </form>
  );
};
