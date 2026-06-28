"use client";

import { useEffect, useRef, useState } from "react";

type ExpandableDescriptionProps = {
  children: string;
  className?: string;
  fadeColor?: string;
  lines?: number;
};

export function ExpandableDescription({
  children,
  className,
  fadeColor = "#FFFCF8",
  lines = 4,
}: ExpandableDescriptionProps) {
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExpandable, setIsExpandable] = useState(false);
  const [collapsedHeight, setCollapsedHeight] = useState<number>();

  useEffect(() => {
    const paragraph = paragraphRef.current;

    if (!paragraph) {
      return;
    }

    function measureDescription(paragraphElement: HTMLParagraphElement) {
      const styles = window.getComputedStyle(paragraphElement);
      const lineHeight = Number.parseFloat(styles.lineHeight);
      const nextCollapsedHeight = lineHeight * lines;

      setCollapsedHeight(nextCollapsedHeight);
      setIsExpandable(
        paragraphElement.scrollHeight > nextCollapsedHeight + 1,
      );
    }

    measureDescription(paragraph);

    const resizeObserver = new ResizeObserver(() =>
      measureDescription(paragraph),
    );
    resizeObserver.observe(paragraph);

    return () => resizeObserver.disconnect();
  }, [lines]);

  return (
    <div className="max-w-3xl">
      <div className="relative">
        <p
          ref={paragraphRef}
          className={className}
          style={
            !isExpanded && collapsedHeight
              ? { maxHeight: collapsedHeight, overflow: "hidden" }
              : undefined
          }
        >
          {children}
        </p>
        {isExpandable && !isExpanded ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-12"
            style={{
              background: `linear-gradient(to bottom, transparent, ${fadeColor})`,
            }}
          />
        ) : null}
      </div>
      {isExpandable ? (
        <button
          aria-expanded={isExpanded}
          className="mt-2 text-sm font-extrabold text-[#2D5D5E]"
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
        >
          {isExpanded ? "Ver menos" : "Ver más"}
        </button>
      ) : null}
    </div>
  );
}
