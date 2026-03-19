"use client";

import type { Suggestion } from "@tambo-ai/react";
import type { messageVariants } from "@/components/tambo/message";
import {
  MessageInput,
  MessageInputError,
  MessageInputFileButton,
  MessageInputMcpPromptButton,
  MessageInputMcpResourceButton,
  MessageInputSubmitButton,
  MessageInputTextarea,
  MessageInputToolbar,
} from "@/components/tambo/message-input";
import {
  MessageSuggestions,
  MessageSuggestionsList,
  MessageSuggestionsStatus,
} from "@/components/tambo/message-suggestions";
import { ScrollableMessageContainer } from "@/components/tambo/scrollable-message-container";
import { ThreadContent, ThreadContentMessages } from "@/components/tambo/thread-content";
import {
  ThreadHistory,
  ThreadHistoryHeader,
  ThreadHistoryList,
  ThreadHistoryNewButton,
  ThreadHistorySearch,
} from "@/components/tambo/thread-history";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { useEffect, useRef, useState } from "react";

/**
 * Merges multiple refs into a single callback ref.
 *
 * In React 19, callback refs may return cleanup functions; this hook fans out
 * both assignments and cleanups to all provided refs and tracks the last
 * cleanup so it runs when the instance changes.
 */
function useMergeRefs<Instance>(
  ...refs: (React.Ref<Instance> | undefined)[]
): null | React.RefCallback<Instance> {
  const cleanupRef = React.useRef<void | (() => void)>(undefined);

  const refEffect = React.useCallback((instance: Instance | null) => {
    const cleanups = refs.map((ref) => {
      if (ref == null) {
        return;
      }

      if (typeof ref === "function") {
        const refCallback = ref;
        const refCleanup: void | (() => void) = refCallback(instance);
        return typeof refCleanup === "function"
          ? refCleanup
          : () => {
              refCallback(null);
            };
      }

      ref.current = instance;
      return () => {
        ref.current = null;
      };
    });

    return () => {
      cleanups.forEach((refCleanup) => refCleanup?.());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, refs);

  return React.useMemo(() => {
    if (refs.every((ref) => ref == null)) {
      return null;
    }

    return (value) => {
      if (cleanupRef.current) {
        cleanupRef.current();
        (cleanupRef as React.MutableRefObject<void | (() => void)>).current = undefined;
      }

      if (value != null) {
        (cleanupRef as React.MutableRefObject<void | (() => void)>).current = refEffect(value);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refEffect, ...refs]);
}

/**
 * Custom hook to detect canvas space presence and position
 * @param elementRef - Reference to the component to compare position with
 * @returns Object containing hasCanvasSpace and canvasIsOnLeft
 */
function useCanvasDetection(elementRef: React.RefObject<HTMLElement | null>) {
  const [hasCanvasSpace, setHasCanvasSpace] = useState(false);
  const [canvasIsOnLeft, setCanvasIsOnLeft] = useState(false);

  useEffect(() => {
    const checkCanvas = () => {
      const canvas = document.querySelector('[data-canvas-space="true"]');
      setHasCanvasSpace(!!canvas);

      if (canvas && elementRef.current) {
        // Check if canvas appears before this component in the DOM
        const canvasRect = canvas.getBoundingClientRect();
        const elemRect = elementRef.current.getBoundingClientRect();
        setCanvasIsOnLeft(canvasRect.left < elemRect.left);
      }
    };

    // Check on mount
    checkCanvas();

    // Re-check on window resize
    window.addEventListener("resize", checkCanvas);

    // Observe DOM changes to detect canvas appearing/disappearing
    const observer = new MutationObserver(checkCanvas);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-canvas-space"],
    });

    return () => {
      window.removeEventListener("resize", checkCanvas);
      observer.disconnect();
    };
  }, [elementRef]);

  return { hasCanvasSpace, canvasIsOnLeft };
}

/**
 * Utility to check if a className string contains the "right" class
 * @param className - The className string to check
 * @returns true if the className contains "right", false otherwise
 */
function hasRightClass(className?: string): boolean {
  return className ? /(?:^|\s)right(?:\s|$)/i.test(className) : false;
}

/**
 * Hook to calculate sidebar and history positions based on className and canvas position
 * @param className - Component's className string
 * @param canvasIsOnLeft - Whether the canvas is on the left
 * @returns Object with isLeftPanel and historyPosition values
 */
function usePositioning(className?: string, canvasIsOnLeft = false, hasCanvasSpace = false) {
  const isRightClass = hasRightClass(className);
  const isLeftPanel = !isRightClass;

  // Determine history position
  // If panel has right class, history should be on right
  // If canvas is on left, history should be on right
  // Otherwise, history should be on left
  let historyPosition: "left" | "right";
  if (isRightClass) {
    historyPosition = "right";
  } else if (hasCanvasSpace && canvasIsOnLeft) {
    historyPosition = "right";
  } else {
    historyPosition = "left";
  }

  return { isLeftPanel, historyPosition };
}

/**
 * Props for the MessageThreadPanel component
 * @interface
 */
export interface MessageThreadPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Controls the visual styling of messages in the thread.
   * Possible values include: "default", "compact", etc.
   * These values are defined in messageVariants from "@/components/tambo/message".
   * @example variant="compact"
   */
  variant?: VariantProps<typeof messageVariants>["variant"];
  /** When true, the panel fills its parent container instead of using a fixed width */
  fullWidth?: boolean;
}

/**
 * Props for the ResizablePanel component
 */
interface ResizablePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Children elements to render inside the container */
  children: React.ReactNode;
  /** Whether the panel should be positioned on the left (true) or right (false) */
  isLeftPanel: boolean;
  /** When true, the panel fills its parent container instead of using a fixed width */
  fullWidth?: boolean;
}

const DEFAULT_SIDEBAR_WIDTH = 600; // Default width for the history sidebar
const MIN_SIDEBAR_WIDTH = 300; // Minimum width for the history sidebar
/**
 * A resizable panel component with a draggable divider
 */
const ResizablePanel = React.forwardRef<HTMLDivElement, ResizablePanelProps>(
  ({ className, children, isLeftPanel, fullWidth, ...props }, ref) => {
    const [width, setWidth] = React.useState(() => {
      if (typeof window === "undefined") return DEFAULT_SIDEBAR_WIDTH;
      const windowWidth = window.innerWidth || DEFAULT_SIDEBAR_WIDTH * 2;
      return Math.min(DEFAULT_SIDEBAR_WIDTH, windowWidth / 2);
    });
    const isResizing = React.useRef(false);
    const lastUpdateRef = React.useRef(0);

    const handleMouseMove = React.useCallback(
      (e: MouseEvent) => {
        if (!isResizing.current) return;

        const now = Date.now();
        if (now - lastUpdateRef.current < 16) return;
        lastUpdateRef.current = now;

        const windowWidth = window.innerWidth;

        requestAnimationFrame(() => {
          let newWidth;
          if (isLeftPanel) {
            newWidth = Math.round(e.clientX);
          } else {
            newWidth = Math.round(windowWidth - e.clientX);
          }

          const clampedWidth = Math.max(
            MIN_SIDEBAR_WIDTH,
            Math.min(windowWidth - MIN_SIDEBAR_WIDTH, newWidth)
          );
          setWidth(clampedWidth);

          // Update both panel and canvas widths using the same divider position
          if (isLeftPanel) {
            document.documentElement.style.setProperty("--panel-left-width", `${clampedWidth}px`);
          } else {
            document.documentElement.style.setProperty("--panel-right-width", `${clampedWidth}px`);
          }
        });
      },
      [isLeftPanel]
    );

    return (
      <div
        data-slot="resizeable-panel"
        ref={ref}
        className={cn(
          "h-screen max-h-full w-full flex flex-col bg-background relative",
          "transition-[width] duration-75 ease-out",
          isLeftPanel ? "border-r border-border" : "border-l border-border ml-auto",
          className
        )}
        style={
          fullWidth
            ? { width: "100%", flex: "1 1 auto" }
            : { width: `${width}px`, flex: "0 0 auto" }
        }
        {...props}
      >
        {/* Resize handle (hidden in fullWidth mode) */}
        {!fullWidth && (
          <div
            className={cn(
              "absolute top-0 bottom-0 w-1 cursor-ew-resize bg-border hover:bg-accent transition-colors z-50",

              isLeftPanel ? "right-0" : "left-0"
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              isResizing.current = true;
              document.body.style.cursor = "ew-resize";
              document.body.style.userSelect = "none";
              document.addEventListener("mousemove", handleMouseMove);
              document.addEventListener(
                "mouseup",
                () => {
                  isResizing.current = false;
                  document.body.style.cursor = "";
                  document.body.style.userSelect = "";
                  document.removeEventListener("mousemove", handleMouseMove);
                },
                { once: true }
              );
            }}
          />
        )}
        {children}
      </div>
    );
  }
);
ResizablePanel.displayName = "ResizablePanel";

/**
 * A resizable panel component that displays a chat thread with message history, input, and suggestions
 * @component
 * @example
 * ```tsx
 * // Default left positioning
 * <MessageThreadPanel />
 *
 * // Explicit right positioning
 * <MessageThreadPanel className="right" />
 * ```
 */
export const MessageThreadPanel = React.forwardRef<HTMLDivElement, MessageThreadPanelProps>(
  ({ className, variant, fullWidth, ...props }, ref) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const { hasCanvasSpace, canvasIsOnLeft } = useCanvasDetection(panelRef);
    const { isLeftPanel, historyPosition } = usePositioning(
      className,
      canvasIsOnLeft,
      hasCanvasSpace
    );
    const mergedRef = useMergeRefs<HTMLDivElement | null>(ref, panelRef);

    const defaultSuggestions: Suggestion[] = [
      {
        id: "suggestion-1",
        title: "Get started",
        detailedSuggestion: "What can you help me with?",
        messageId: "welcome-query",
      },
      {
        id: "suggestion-2",
        title: "Learn more",
        detailedSuggestion: "Tell me about your capabilities.",
        messageId: "capabilities-query",
      },
      {
        id: "suggestion-3",
        title: "Examples",
        detailedSuggestion: "Show me some example queries I can try.",
        messageId: "examples-query",
      },
    ];

    return (
      <ResizablePanel
        ref={mergedRef}
        isLeftPanel={isLeftPanel}
        fullWidth={fullWidth}
        className={className}
        {...props}
      >
        <div className="flex h-full relative">
          {historyPosition === "left" && (
            <div
              className="flex-none transition-all duration-300 ease-in-out"
              style={{ width: "var(--sidebar-width, 16rem)" }}
            >
              <ThreadHistory
                defaultCollapsed={true}
                position="left"
                className="h-full border-0 border-r border-flat"
              >
                <ThreadHistoryHeader />
                <ThreadHistoryNewButton />
                <ThreadHistorySearch />
                <ThreadHistoryList />
              </ThreadHistory>
            </div>
          )}

          <div className="flex flex-col h-full flex-grow transition-all duration-300 ease-in-out">
            {/* Message thread content */}
            <ScrollableMessageContainer className="p-4">
              <ThreadContent variant={variant}>
                <ThreadContentMessages />
              </ThreadContent>
            </ScrollableMessageContainer>

            {/* Message Suggestions Status */}
            <MessageSuggestions>
              <MessageSuggestionsStatus />
            </MessageSuggestions>

            {/* Message input */}
            <div className="p-4">
              <MessageInput>
                <MessageInputTextarea placeholder="Type your message or paste images..." />
                <MessageInputToolbar>
                  <MessageInputFileButton />
                  <MessageInputMcpPromptButton />
                  <MessageInputMcpResourceButton />
                  {/* Uncomment this to enable client-side MCP config modal button */}
                  {/* <MessageInputMcpConfigButton /> */}
                  <MessageInputSubmitButton />
                </MessageInputToolbar>
                <MessageInputError />
              </MessageInput>
            </div>

            {/* Message suggestions */}
            <MessageSuggestions initialSuggestions={defaultSuggestions}>
              <MessageSuggestionsList />
            </MessageSuggestions>
          </div>

          {historyPosition === "right" && (
            <div
              className="flex-none transition-all duration-300 ease-in-out"
              style={{ width: "var(--sidebar-width, 16rem)" }}
            >
              <ThreadHistory
                defaultCollapsed={true}
                position="right"
                className="h-full border-0 border-l border-flat"
              >
                <ThreadHistoryHeader />
                <ThreadHistoryNewButton />
                <ThreadHistorySearch />
                <ThreadHistoryList />
              </ThreadHistory>
            </div>
          )}
        </div>
      </ResizablePanel>
    );
  }
);
MessageThreadPanel.displayName = "MessageThreadPanel";
