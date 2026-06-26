import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Send, X, Sparkles } from 'lucide-react';
import { askAI, aiStatus } from '../api/resources';

interface Message { role: 'user' | 'assistant'; text: string; }

export default function AIChatPanel() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [live, setLive] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      aiStatus().then((s) => setLive(s.active_provider !== 'stub')).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const question = input.trim();
    if (!question || sending) return;
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setInput('');
    setSending(true);
    try {
      const res = await askAI(question);
      setMessages((m) => [...m, { role: 'assistant', text: res.answer }]);
      setLive(res.provider !== 'stub');
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: 'Не удалось получить ответ. Попробуйте позже.' }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-40 w-13 h-13 rounded-2xl bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 flex items-center justify-center text-white transition-transform hover:scale-105"
        style={{ width: 52, height: 52 }}
        title={t('ai.title')}
      >
        {open ? <X className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-40 w-[360px] max-h-[520px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-bold text-white">{t('ai.title')}</span>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${live ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
              {live ? t('ai.live_badge') : t('ai.stub_badge')}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
            {messages.length === 0 && <p className="text-slate-500 text-xs leading-relaxed">{t('ai.intro')}</p>}
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                <div
                  className={`inline-block max-w-[85%] px-3 py-2 rounded-xl whitespace-pre-wrap text-[12.5px] leading-relaxed ${
                    m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-200'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-slate-800 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={t('ai.placeholder')}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-600"
            />
            <button
              onClick={send}
              disabled={sending}
              className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 flex items-center justify-center shrink-0"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
