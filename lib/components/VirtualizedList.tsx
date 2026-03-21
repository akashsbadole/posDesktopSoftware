import { FixedSizeList as List } from 'react-window';
import { useRef, useCallback, useState, useEffect } from 'react';

export interface VirtualizedListProps<T> {
  items: T[];
  height: number;
  itemHeight?: number;
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  overscanCount?: number;
}

export function VirtualizedOrderList<T>({
  items,
  height,
  itemHeight = 72,
  renderItem,
  overscanCount = 5,
}: VirtualizedListProps<T>) {
  const listRef = useRef<List>(null);
  const [windowHeight, setWindowHeight] = useState(height);

  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight * 0.6);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getItemSize = useCallback(() => itemHeight, [itemHeight]);

  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      return (
        <div style={style}>
          {renderItem(items[index], index, style)}
        </div>
      );
    },
    [items, renderItem]
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <List
      ref={listRef}
      height={windowHeight || height}
      itemCount={items.length}
      itemSize={itemHeight}
      width="100%"
      overscanCount={overscanCount}
    >
      {Row}
    </List>
  );
}

export function useAutoCleanup() {
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);

  const addTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  const addInterval = useCallback((fn: () => void, ms: number) => {
    const id = setInterval(fn, ms);
    intervalsRef.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      intervalsRef.current.forEach(clearInterval);
      timeoutsRef.current = [];
      intervalsRef.current = [];
    };
  }, []);

  return { addTimeout, addInterval };
}
