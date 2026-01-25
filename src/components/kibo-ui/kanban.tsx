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
  activeItem: any | null;
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
  dragOverlayContent?: (item: TItem) => React.ReactNode;
}

function KanbanProvider<TColumn extends KanbanColumn, TItem extends { id: string }>({
  children,
  columns,
  items,
  setItems,
  onDragEnd,
  className,
  dragOverlayContent,
}: KanbanProviderProps<TColumn, TItem>) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<TItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id);
    setActiveId(id);
    const item = items.find((i) => i.id === id);
    setActiveItem(item || null);
  }, [items]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      setActiveItem(null);
      onDragEnd?.(event);
    },
    [onDragEnd]
  );

  return (
    <KanbanContext.Provider value={{ columns, activeId, activeItem }}>
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
        <DragOverlay dropAnimation={{
          duration: 200,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}>
          {activeId && activeItem && dragOverlayContent ? (
            <div className="shadow-2xl ring-2 ring-primary/30 rounded-lg rotate-2 scale-105">
              {dragOverlayContent(activeItem)}
            </div>
          ) : null}
        </DragOverlay>
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
  const { activeId } = useKanban();
  
  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px]",
        className
      )}
    >
      {items.map((item) => (
        <div 
          key={item.id}
          className={cn(activeId === item.id && "opacity-40")}
        >
          {children(item)}
        </div>
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
        isDragging && "opacity-0",
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
