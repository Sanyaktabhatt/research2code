"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface VirtualizedListProps<T> {
  items: T[];
  estimateSize: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  getKey?: (item: T, index: number) => React.Key;
}

function VirtualizedListInner<T>(
  { items, estimateSize, renderItem, className, getKey }: VirtualizedListProps<T>,
  forwardedRef: React.ForwardedRef<HTMLDivElement>,
) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  React.useImperativeHandle(forwardedRef, () => parentRef.current!, []);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 6,
  });

  return (
    <div ref={parentRef} className={className}>
      <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index]!;
          return (
            <div
              key={getKey ? getKey(item, virtualItem.index) : virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderItem(item, virtualItem.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Shared windowed-list primitive - any feature with a long, uniform list
 * reuses this instead of reimplementing virtualization. Forwards a ref to
 * the scroll container (e.g. for a log viewer's stick-to-bottom behavior);
 * existing callers that don't pass a ref are unaffected.
 */
export const VirtualizedList = React.forwardRef(VirtualizedListInner) as <T>(
  props: VirtualizedListProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> },
) => ReturnType<typeof VirtualizedListInner>;
