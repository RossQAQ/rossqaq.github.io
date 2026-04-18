import { useState, useRef, useEffect } from 'preact/hooks';
import Fuse from 'fuse.js';

interface SearchItem {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  body: string;
}

interface SearchResult {
  item: SearchItem;
  score?: number;
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [fuse, setFuse] = useState<Fuse<SearchItem> | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const indexLoading = useRef(false);

  // Load search index (once)
  const loadIndex = async () => {
    if (fuse || indexLoading.current) return;
    indexLoading.current = true;
    try {
      const res = await fetch('/search-index.json');
      const data: SearchItem[] = await res.json();
      setFuse(
        new Fuse(data, {
          keys: [
            { name: 'title', weight: 2 },
            { name: 'description', weight: 1.5 },
            { name: 'tags', weight: 1.5 },
            { name: 'body', weight: 0.5 },
          ],
          threshold: 0.35,
          includeScore: true,
          ignoreLocation: true,
          minMatchCharLength: 2,
        }),
      );
    } catch {
      indexLoading.current = false;
    }
  };

  // Debounced search — runs when query OR fuse changes
  useEffect(() => {
    if (!query.trim() || !fuse) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setResults(fuse.search(query, { limit: 8 }));
    }, 200);
    return () => clearTimeout(timer);
  }, [query, fuse]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
      window.location.href = `/posts/${results[activeIndex].item.slug}`;
      setIsOpen(false);
    }
  };

  const showDropdown = isOpen && query.trim().length > 0;

  return (
    <div class="search-container" ref={containerRef}>
      <div class="search-input-wrap">
        <svg
          class="search-icon"
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onInput={(e) => {
            setQuery((e.target as HTMLInputElement).value);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            setIsOpen(true);
            loadIndex();
          }}
          onKeyDown={handleKeyDown}
          placeholder="搜索..."
          class="search-input"
        />
      </div>
      {showDropdown && (
        <div class="search-dropdown">
          {!fuse ? (
            <div class="search-empty">加载中...</div>
          ) : results.length === 0 ? (
            <div class="search-empty">没有找到结果</div>
          ) : (
            results.map((r, i) => (
              <a
                href={`/posts/${r.item.slug}`}
                class={`search-result${i === activeIndex ? ' active' : ''}`}
                onClick={() => setIsOpen(false)}
              >
                <div class="search-result-title">{r.item.title}</div>
                <div class="search-result-desc">{r.item.description}</div>
                <div class="search-result-tags">
                  {r.item.tags.map((t) => (
                    <span class="search-tag">#{t}</span>
                  ))}
                </div>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}
