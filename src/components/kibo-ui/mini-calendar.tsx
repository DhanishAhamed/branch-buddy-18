"use client";

import * as React from "react";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MiniCalendarContextType {
  currentMonth: Date;
  selectedDate: Date | null;
  setCurrentMonth: (date: Date) => void;
  setSelectedDate: (date: Date | null) => void;
  onDateSelect?: (date: Date) => void;
  tasksOnDates?: Date[];
}

const MiniCalendarContext = React.createContext<MiniCalendarContextType | null>(null);

function useMiniCalendar() {
  const context = React.useContext(MiniCalendarContext);
  if (!context) {
    throw new Error("useMiniCalendar must be used within a MiniCalendar");
  }
  return context;
}

interface MiniCalendarProps {
  children: React.ReactNode;
  defaultDate?: Date;
  selectedDate?: Date | null;
  onDateSelect?: (date: Date) => void;
  tasksOnDates?: Date[];
  className?: string;
}

export function MiniCalendar({
  children,
  defaultDate = new Date(),
  selectedDate: controlledSelectedDate,
  onDateSelect,
  tasksOnDates = [],
  className,
}: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(defaultDate);
  const [internalSelectedDate, setInternalSelectedDate] = React.useState<Date | null>(
    controlledSelectedDate ?? null
  );

  const selectedDate = controlledSelectedDate ?? internalSelectedDate;

  const handleSetSelectedDate = (date: Date | null) => {
    setInternalSelectedDate(date);
    if (date && onDateSelect) {
      onDateSelect(date);
    }
  };

  return (
    <MiniCalendarContext.Provider
      value={{
        currentMonth,
        selectedDate,
        setCurrentMonth,
        setSelectedDate: handleSetSelectedDate,
        onDateSelect,
        tasksOnDates,
      }}
    >
      <div className={cn("w-full", className)}>{children}</div>
    </MiniCalendarContext.Provider>
  );
}

interface MiniCalendarNavigationProps {
  direction: "prev" | "next";
  className?: string;
}

export function MiniCalendarNavigation({
  direction,
  className,
}: MiniCalendarNavigationProps) {
  const { currentMonth, setCurrentMonth } = useMiniCalendar();

  const handleClick = () => {
    if (direction === "prev") {
      setCurrentMonth(subMonths(currentMonth, 1));
    } else {
      setCurrentMonth(addMonths(currentMonth, 1));
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className={cn("h-7 w-7", className)}
    >
      {direction === "prev" ? (
        <ChevronLeft className="h-4 w-4" />
      ) : (
        <ChevronRight className="h-4 w-4" />
      )}
    </Button>
  );
}

interface MiniCalendarHeaderProps {
  className?: string;
}

export function MiniCalendarHeader({ className }: MiniCalendarHeaderProps) {
  const { currentMonth } = useMiniCalendar();

  return (
    <div className={cn("flex items-center justify-between px-1 mb-3", className)}>
      <MiniCalendarNavigation direction="prev" />
      <span className="text-sm font-semibold text-foreground">
        {format(currentMonth, "MMMM yyyy")}
      </span>
      <MiniCalendarNavigation direction="next" />
    </div>
  );
}

interface MiniCalendarDaysProps {
  children: (date: Date) => React.ReactNode;
  className?: string;
}

export function MiniCalendarDays({ children, className }: MiniCalendarDaysProps) {
  const { currentMonth } = useMiniCalendar();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className={cn("", className)}>
      <div className="grid grid-cols-7 gap-0 mb-1">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-[10px] font-medium text-muted-foreground py-1"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0">{days.map(children)}</div>
    </div>
  );
}

interface MiniCalendarDayProps {
  date: Date;
  className?: string;
}

export function MiniCalendarDay({ date, className }: MiniCalendarDayProps) {
  const { currentMonth, selectedDate, setSelectedDate, tasksOnDates } = useMiniCalendar();

  const isCurrentMonth = isSameMonth(date, currentMonth);
  const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
  const isTodayDate = isToday(date);
  const hasTask = tasksOnDates?.some((taskDate) => isSameDay(taskDate, date));

  return (
    <button
      onClick={() => setSelectedDate(date)}
      className={cn(
        "relative flex items-center justify-center h-8 w-full text-xs font-medium transition-colors rounded-md",
        !isCurrentMonth && "text-muted-foreground/40",
        isCurrentMonth && !isSelected && !isTodayDate && "text-foreground hover:bg-muted",
        isTodayDate && !isSelected && "bg-muted text-foreground font-semibold",
        isSelected && "bg-primary text-primary-foreground",
        className
      )}
    >
      {format(date, "d")}
      {hasTask && (
        <span
          className={cn(
            "absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full",
            isSelected ? "bg-primary-foreground" : "bg-primary"
          )}
        />
      )}
    </button>
  );
}
