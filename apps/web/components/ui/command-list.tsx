"use client";

import { useState, useRef, useEffect, ReactNode } from "react";

export interface CommandItem {
  id: string;
  label: string;
  icon?: ReactNode;
  description?: string;
  shortcut?: string;
}

interface CommandListProps {
  items: CommandItem[];
  selected?: string;
  onSelect: (id: string) => void;
  placeholder?: string;
  searchable?: boolean;
}

export function CommandList({ items, selected, onSelect, placeholder = "Search...", searchable = true }: CommandListProps) {
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = search
    ? items.filter((item) => item.label.toLowerCase().includes(search.toLowerCase()))
    : items;

  useEffect(() => {
    setHighlightIndex(0);
  }, [search]);

  useEffect(() => {
    if (searchable && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchable]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlightIndex]) {
        onSelect(filtered[highlightIndex].id);
      }
    }
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current) {
      const highlighted = listRef.current.children[highlightIndex] as HTMLElement;
      if (highlighted) {
        highlighted.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightIndex]);

  return (
    <div onKeyDown={handleKeyDown}>
      {searchable && (
        <div className="px-3 py-2 border-b border-lyght-grey-300/20">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent text-[13px] font-mono text-lyght-black outline-none placeholder:text-lyght-grey-500"
          />
        </div>
      )}
      <div ref={listRef} className="max-h-[200px] overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-[12px] text-lyght-grey-500 font-mono">No results</div>
        ) : (
          filtered.map((item, i) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`
                w-full flex items-center gap-2 px-3 py-1.5 text-left
                text-[13px] font-mono cursor-pointer
                transition-colors duration-75 rounded-md mx-1
                ${i === highlightIndex ? "bg-lyght-grey-100" : "hover:bg-lyght-grey-100/60"}
                ${selected === item.id ? "text-lyght-black" : "text-lyght-grey-700"}
              `}
              style={{ width: "calc(100% - 8px)" }}
            >
              {item.icon && <span className="shrink-0">{item.icon}</span>}
              <span className="flex-1 truncate">{item.label}</span>
              {item.shortcut && (
                <span className="text-[11px] text-lyght-grey-500">{item.shortcut}</span>
              )}
              {selected === item.id && (
                <span className="text-lyght-orange text-[13px] shrink-0">&#10003;</span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
