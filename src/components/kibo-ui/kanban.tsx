"use client";

import * as React from "react";
import { createContext, useContext, useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

// Types
interface KanbanColumn {
  id: string;
  name: string;
  color: string;
}

interface KanbanContextValue {
  columns: KanbanColumn[];
  activeId: string | null;
  onDragEnd?: (event: DragEndEvent) => void;
}

const KanbanContext = createContext<KanbanContextValue | null>(null);

function useKanban() {
  const context = useContext(KanbanContext);
  if (!context) {
    throw new Error("useKanban must be used within a KanbanProvider");
  }
  return context;
}

// Provider
interface KanbanProviderProps<TColumn extends KanbanColumn, TItem> {
  children: (column: TColumn) => React.ReactNode;
  columns: TColumn[];
  items: TItem[];
  setItems: React.Dispatch<React.SetStateAction<TItem[]>>;
  onDragEnd?: (event: DragEndEvent) => void;
  className?: string;
}

function KanbanProvider<TColumn extends KanbanColumn, TItem>({
  children,
  columns,
  items,
  setItems,
  onDragEnd,
  className,
}: KanbanProviderProps<TColumn, TItem>) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      onDragEnd?.(event);
    },
    [onDragEnd]
  );

  return (
    <KanbanContext.Provider value={{ columns, activeId, onDragEnd }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className={cn(
            "flex gap-4 h-full overflow-x-auto pb-4",
            className
          )}
        >
          {columns.map((column) => children(column))}
        </div>
      </DndContext>
    </KanbanContext.Provider>
  );
}

// Board (Column Container)
interface KanbanBoardProps {
  children: React.ReactNode;
  id: string;
  className?: string;
}

function KanbanBoard({ children, id, className }: KanbanBoardProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-72 flex-shrink-0 flex flex-col h-full rounded-xl border border-border bg-card/50 backdrop-blur-sm transition-all duration-200",
        isOver && "ring-2 ring-primary border-primary/50 bg-primary/5",
        className
      )}
    >
      {children}
    </div>
  );
}

// Header
interface KanbanHeaderProps {
  children: React.ReactNode;
  className?: string;
}

function KanbanHeader({ children, className }: KanbanHeaderProps) {
  return (
    <div
      className={cn(
        "p-3 border-b border-border shrink-0",
        className
      )}
    >
      {children}
    </div>
  );
}

// Cards Container
interface KanbanCardsProps<TItem> {
  children: (item: TItem) => React.ReactNode;
  items: TItem[];
  className?: string;
}

function KanbanCards<TItem extends { id: string }>({
  children,
  items,
  className,
}: KanbanCardsProps<TItem>) {
  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px]",
        className
      )}
    >
      {items.map((item) => (
        <React.Fragment key={item.id}>{children(item)}</React.Fragment>
      ))}
      {items.length === 0 && (
        <div className="flex items-center justify-center h-24 text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg bg-muted/20">
          Drop here
        </div>
      )}
    </div>
  );
}

// Card
interface KanbanCardProps {
  children: React.ReactNode;
  id: string;
  name: string;
  onClick?: () => void;
  className?: string;
}

function KanbanCard({ children, id, name, onClick, className }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id,
      data: { id, name },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 50 : "auto",
        opacity: isDragging ? 0.8 : 1,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (!isDragging && onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      className={cn(
        "p-3 bg-card rounded-lg border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing",
        isDragging && "shadow-lg ring-2 ring-primary/20",
        className
      )}
    >
      {children}
    </div>
  );
}

export {
  KanbanProvider,
  KanbanBoard,
  KanbanHeader,
  KanbanCards,
  KanbanCard,
  useKanban,
};
