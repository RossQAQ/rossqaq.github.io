import { useState, useRef, useEffect, useCallback } from 'preact/hooks';

interface Props {
  question: string;
  answer: string;
}

type Phase = 'idle' | 'typing' | 'done';

export default function AiChat({ question, answer }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [visibleCount, setVisibleCount] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const prevCountRef = useRef<number>(0);

  const tick = useCallback((now: number) => {
    if (startRef.current === 0) {
      startRef.current = now;
      prevCountRef.current = 0;
    }
    const elapsed = now - startRef.current;
    // variable speed: slower at start, speeds up slightly
    const count = Math.min(
      answer.length,
      Math.floor(elapsed / 18 * (1 + elapsed / 8000))
    );
    // reveal at least 1 char per frame for responsiveness
    const delta = count - prevCountRef.current;
    const newCount = Math.max(prevCountRef.current + (delta > 0 ? delta : 1), count);
    prevCountRef.current = newCount;
    setVisibleCount(newCount);

    if (newCount < answer.length) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      setPhase('done');
    }
  }, [answer]);

  const handleToggle = () => {
    if (phase === 'idle') {
      startRef.current = 0;
      setPhase('typing');
      rafRef.current = requestAnimationFrame(tick);
    } else if (phase === 'typing') {
      cancelAnimationFrame(rafRef.current);
      setVisibleCount(answer.length);
      setPhase('done');
    } else {
      // done -> reset
      setVisibleCount(0);
      setPhase('idle');
    }
  };

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const displayed = phase === 'idle' ? '' : answer.slice(0, visibleCount);
  const isExpanded = phase !== 'idle';

  return (
    <div class="ai-chat">
      <div class="ai-chat-header" onClick={handleToggle}>
        <span class="ai-chat-icon">AI</span>
        <span class="ai-chat-toggle">
          {phase === 'idle' && '点击展开 AI 回复'}
          {phase === 'typing' && '点击立即显示全部'}
          {phase === 'done' && '点击收起'}
        </span>
      </div>

      {isExpanded && (
        <div class="ai-chat-body">
          <div class="ai-chat-msg ai-chat-question">
            <span class="ai-chat-avatar user">U</span>
            <div class="ai-chat-bubble">{question}</div>
          </div>
          <div class="ai-chat-msg ai-chat-answer">
            <span class="ai-chat-avatar bot">AI</span>
            <div class="ai-chat-bubble">
              <span class="ai-chat-text">{displayed}</span>
              {phase === 'typing' && <span class="ai-chat-cursor" />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
