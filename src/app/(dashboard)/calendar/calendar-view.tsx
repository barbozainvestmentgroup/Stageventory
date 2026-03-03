"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  User,
  Users,
  Trash2,
  Pencil,
  ExternalLink,
  Eye,
  Search,
  Wrench,
  Home,
  MessageSquare,
  Truck,
  Filter,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { cn, formatDate } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EventType = "CONSULTATION" | "STAGE" | "DESTAGE" | "MAINTENANCE";
type ViewMode = "month" | "week" | "day" | "agenda";

interface CrewMember {
  id: string;
  name: string;
  role: string;
}

interface ScheduleEvent {
  id: string;
  projectId: string;
  eventType: EventType;
  date: string;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
  project: {
    id: string;
    status: string;
    property: { address: string; city: string };
    client: { agentName: string; companyName: string | null };
  };
  crew: { id: string; name: string; email: string }[];
}

interface Project {
  id: string;
  status: string;
  property: { address: string; city: string };
  client: { agentName: string; companyName: string | null };
}

interface CalendarViewProps {
  crewMembers: CrewMember[];
  canWrite: boolean;
}

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const EVENT_TYPES: EventType[] = [
  "CONSULTATION",
  "STAGE",
  "DESTAGE",
  "MAINTENANCE",
];

const EVENT_TYPE_CONFIG: Record<
  EventType,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    badgeBg: string;
    icon: typeof CalendarIcon;
  }
> = {
  CONSULTATION: {
    label: "Consultation",
    color: "bg-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    borderColor: "border-blue-300 dark:border-blue-700",
    textColor: "text-blue-700 dark:text-blue-300",
    badgeBg: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    icon: MessageSquare,
  },
  STAGE: {
    label: "Stage",
    color: "bg-emerald-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-950",
    borderColor: "border-emerald-300 dark:border-emerald-700",
    textColor: "text-emerald-700 dark:text-emerald-300",
    badgeBg:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100",
    icon: Home,
  },
  DESTAGE: {
    label: "Destage",
    color: "bg-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950",
    borderColor: "border-amber-300 dark:border-amber-700",
    textColor: "text-amber-700 dark:text-amber-300",
    badgeBg:
      "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
    icon: Truck,
  },
  MAINTENANCE: {
    label: "Maintenance",
    color: "bg-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-950",
    borderColor: "border-purple-300 dark:border-purple-700",
    textColor: "text-purple-700 dark:text-purple-300",
    badgeBg:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
    icon: Wrench,
  },
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7am - 8pm

function dateToString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfWeek(d: Date): Date {
  const result = new Date(d);
  result.setDate(result.getDate() - result.getDay());
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfWeek(d: Date): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + (6 - result.getDay()));
  result.setHours(23, 59, 59, 999);
  return result;
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function formatTime(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

function formatTimeRange(start: string | null, end: string | null): string {
  if (!start && !end) return "All day";
  if (start && end) return `${formatTime(start)} - ${formatTime(end)}`;
  if (start) return formatTime(start);
  return formatTime(end);
}

function timeToHourDecimal(time: string | null): number {
  if (!time) return 7;
  const [h, m] = time.split(":").map(Number);
  return h + m / 60;
}

function getMonthLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getWeekLabel(d: Date): string {
  const weekStart = startOfWeek(d);
  const weekEnd = endOfWeek(d);
  const startMonth = weekStart.toLocaleDateString("en-US", { month: "short" });
  const endMonth = weekEnd.toLocaleDateString("en-US", { month: "short" });
  if (startMonth === endMonth) {
    return `${startMonth} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
  }
  return `${startMonth} ${weekStart.getDate()} - ${endMonth} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function CalendarView({ crewMembers, canWrite }: CalendarViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const today = useMemo(() => new Date(), []);

  // State
  const [currentDate, setCurrentDate] = useState<Date>(today);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(
    null
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Filters
  const [activeEventTypes, setActiveEventTypes] =
    useState<EventType[]>(EVENT_TYPES);
  const [crewFilter, setCrewFilter] = useState<string>("all");
  const [filterOpen, setFilterOpen] = useState(false);

  // Form state
  const [formProjectId, setFormProjectId] = useState("");
  const [formEventType, setFormEventType] = useState<EventType>("STAGE");
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("12:00");
  const [formCrewIds, setFormCrewIds] = useState<string[]>([]);
  const [formNotes, setFormNotes] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile && viewMode === "month") {
      setViewMode("agenda");
    }
  }, [isMobile, viewMode]);

  // ---------------------------------------------------------------------------
  // Date range calculation
  // ---------------------------------------------------------------------------

  const dateRange = useMemo(() => {
    let start: Date;
    let end: Date;

    if (viewMode === "month") {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      start = startOfWeek(monthStart);
      end = endOfWeek(monthEnd);
    } else if (viewMode === "week") {
      start = startOfWeek(currentDate);
      end = endOfWeek(currentDate);
    } else if (viewMode === "day") {
      start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(currentDate);
      end.setHours(23, 59, 59, 999);
    } else {
      // agenda - show current month
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
    }

    return { start, end };
  }, [currentDate, viewMode]);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        start: dateToString(dateRange.start),
        end: dateToString(dateRange.end),
      });
      const res = await fetch(`/api/schedule?${params}`);
      if (!res.ok) throw new Error("Failed to fetch events");
      const data = await res.json();
      setEvents(data.events || []);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load calendar events.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange.start, dateRange.end, toast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const res = await fetch("/api/projects?status=active");
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      setProjects(data.projects || []);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load projects.",
        variant: "destructive",
      });
    } finally {
      setProjectsLoading(false);
    }
  }, [toast]);

  // ---------------------------------------------------------------------------
  // Filtered events
  // ---------------------------------------------------------------------------

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (!activeEventTypes.includes(e.eventType)) return false;
      if (crewFilter !== "all") {
        if (!e.crew.some((c) => c.id === crewFilter)) return false;
      }
      return true;
    });
  }, [events, activeEventTypes, crewFilter]);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  function navigateToday() {
    setCurrentDate(new Date());
  }

  function navigatePrev() {
    const d = new Date(currentDate);
    if (viewMode === "month" || viewMode === "agenda") {
      d.setMonth(d.getMonth() - 1);
    } else if (viewMode === "week") {
      d.setDate(d.getDate() - 7);
    } else {
      d.setDate(d.getDate() - 1);
    }
    setCurrentDate(d);
  }

  function navigateNext() {
    const d = new Date(currentDate);
    if (viewMode === "month" || viewMode === "agenda") {
      d.setMonth(d.getMonth() + 1);
    } else if (viewMode === "week") {
      d.setDate(d.getDate() + 7);
    } else {
      d.setDate(d.getDate() + 1);
    }
    setCurrentDate(d);
  }

  function getNavigationLabel(): string {
    if (viewMode === "month" || viewMode === "agenda") {
      return getMonthLabel(currentDate);
    }
    if (viewMode === "week") {
      return getWeekLabel(currentDate);
    }
    return currentDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  // ---------------------------------------------------------------------------
  // Event type filter toggle
  // ---------------------------------------------------------------------------

  function toggleEventType(type: EventType) {
    setActiveEventTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  // ---------------------------------------------------------------------------
  // Event actions
  // ---------------------------------------------------------------------------

  function handleEventClick(event: ScheduleEvent) {
    setSelectedEvent(event);
    setDetailOpen(true);
  }

  function handleDayClick(date: Date) {
    if (!canWrite) return;
    openNewEventForm(dateToString(date));
  }

  function openNewEventForm(date?: string) {
    setEditingEvent(null);
    setFormProjectId("");
    setFormEventType("STAGE");
    setFormDate(date || dateToString(currentDate));
    setFormStartTime("09:00");
    setFormEndTime("12:00");
    setFormCrewIds([]);
    setFormNotes("");
    fetchProjects();
    setFormOpen(true);
  }

  function openEditForm(event: ScheduleEvent) {
    setEditingEvent(event);
    setFormProjectId(event.projectId);
    setFormEventType(event.eventType);
    setFormDate(event.date);
    setFormStartTime(event.startTime || "09:00");
    setFormEndTime(event.endTime || "12:00");
    setFormCrewIds(event.crew.map((c) => c.id));
    setFormNotes(event.notes || "");
    fetchProjects();
    setDetailOpen(false);
    setFormOpen(true);
  }

  async function handleSaveEvent() {
    if (!formProjectId || !formDate) {
      toast({
        title: "Validation Error",
        description: "Please select a project and date.",
        variant: "destructive",
      });
      return;
    }

    setFormSaving(true);
    try {
      const body = {
        projectId: formProjectId,
        eventType: formEventType,
        date: formDate,
        startTime: formStartTime || null,
        endTime: formEndTime || null,
        notes: formNotes || null,
        crewIds: formCrewIds,
      };

      let res: Response;
      if (editingEvent) {
        res = await fetch(`/api/schedule/${editingEvent.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as Record<string, unknown>).error as string ||
            "Failed to save event"
        );
      }

      toast({
        title: "Success",
        description: editingEvent
          ? "Event updated successfully."
          : "Event created successfully.",
      });

      setFormOpen(false);
      fetchEvents();
      router.refresh();
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to save event.",
        variant: "destructive",
      });
    } finally {
      setFormSaving(false);
    }
  }

  async function handleDeleteEvent() {
    if (!selectedEvent) return;

    try {
      const res = await fetch(`/api/schedule/${selectedEvent.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete event");

      toast({
        title: "Success",
        description: "Event deleted successfully.",
      });

      setDeleteConfirmOpen(false);
      setDetailOpen(false);
      setSelectedEvent(null);
      fetchEvents();
      router.refresh();
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete event.",
        variant: "destructive",
      });
    }
  }

  function toggleCrewMember(id: string) {
    setFormCrewIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  // ---------------------------------------------------------------------------
  // Helper to get events for a specific day
  // ---------------------------------------------------------------------------

  function getEventsForDay(date: Date): ScheduleEvent[] {
    const ds = dateToString(date);
    return filteredEvents.filter((e) => e.date === ds);
  }

  // ---------------------------------------------------------------------------
  // Month view calendar grid days
  // ---------------------------------------------------------------------------

  const monthGridDays = useMemo(() => {
    if (viewMode !== "month") return [];

    const monthStart = startOfMonth(currentDate);
    const gridStart = startOfWeek(monthStart);
    const monthEnd = endOfMonth(currentDate);
    const gridEnd = endOfWeek(monthEnd);

    const days: Date[] = [];
    let d = new Date(gridStart);
    while (d <= gridEnd) {
      days.push(new Date(d));
      d = addDays(d, 1);
    }
    return days;
  }, [currentDate, viewMode]);

  // ---------------------------------------------------------------------------
  // Week view days
  // ---------------------------------------------------------------------------

  const weekDays = useMemo(() => {
    if (viewMode !== "week") return [];
    const ws = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  }, [currentDate, viewMode]);

  // ---------------------------------------------------------------------------
  // Agenda grouped events
  // ---------------------------------------------------------------------------

  const agendaGrouped = useMemo(() => {
    if (viewMode !== "agenda") return [];

    const sorted = [...filteredEvents].sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return (a.startTime || "").localeCompare(b.startTime || "");
    });

    const groups: { date: string; events: ScheduleEvent[] }[] = [];
    for (const event of sorted) {
      const last = groups[groups.length - 1];
      if (last && last.date === event.date) {
        last.events.push(event);
      } else {
        groups.push({ date: event.date, events: [event] });
      }
    }
    return groups;
  }, [filteredEvents, viewMode]);

  // ---------------------------------------------------------------------------
  // Render: Event chip (for month view)
  // ---------------------------------------------------------------------------

  function renderEventChip(event: ScheduleEvent) {
    const config = EVENT_TYPE_CONFIG[event.eventType];
    const Icon = config.icon;

    return (
      <button
        key={event.id}
        onClick={(e) => {
          e.stopPropagation();
          handleEventClick(event);
        }}
        className={cn(
          "flex items-center gap-1 w-full rounded px-1.5 py-0.5 text-xs font-medium truncate text-left border",
          config.bgColor,
          config.borderColor,
          config.textColor,
          "hover:opacity-80 transition-opacity"
        )}
      >
        <Icon className="h-3 w-3 shrink-0" />
        {event.startTime && (
          <span className="shrink-0">{formatTime(event.startTime)}</span>
        )}
        <span className="truncate">{event.project.property.address}</span>
      </button>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Time block (for week/day views)
  // ---------------------------------------------------------------------------

  function renderTimeBlock(
    event: ScheduleEvent,
    showDetails: boolean = false
  ) {
    const config = EVENT_TYPE_CONFIG[event.eventType];
    const Icon = config.icon;
    const startHour = timeToHourDecimal(event.startTime);
    const endHour = timeToHourDecimal(event.endTime);
    const duration = Math.max(endHour - startHour, 0.5);
    const top = (startHour - 7) * 64; // 64px per hour
    const height = Math.max(duration * 64, 28);

    return (
      <button
        key={event.id}
        onClick={(e) => {
          e.stopPropagation();
          handleEventClick(event);
        }}
        className={cn(
          "absolute left-1 right-1 rounded border px-2 py-1 text-xs font-medium overflow-hidden text-left",
          config.bgColor,
          config.borderColor,
          config.textColor,
          "hover:opacity-80 transition-opacity z-10"
        )}
        style={{ top: `${top}px`, height: `${height}px` }}
      >
        <div className="flex items-center gap-1">
          <Icon className="h-3 w-3 shrink-0" />
          <span className="font-semibold truncate">
            {config.label}
          </span>
        </div>
        <div className="truncate">{event.project.property.address}</div>
        {showDetails && (
          <>
            <div className="truncate text-[10px] opacity-75">
              {event.project.client.agentName}
            </div>
            {event.crew.length > 0 && (
              <div className="truncate text-[10px] opacity-75">
                Crew: {event.crew.map((c) => c.name).join(", ")}
              </div>
            )}
          </>
        )}
      </button>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Event type badge
  // ---------------------------------------------------------------------------

  function renderEventTypeBadge(type: EventType) {
    const config = EVENT_TYPE_CONFIG[type];
    return (
      <Badge className={cn("gap-1", config.badgeBg)}>
        <config.icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Month view
  // ---------------------------------------------------------------------------

  function renderMonthView() {
    return (
      <div className="border rounded-lg overflow-hidden">
        {/* Day of week headers */}
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {DAY_NAMES.map((day) => (
            <div
              key={day}
              className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {monthGridDays.map((day, idx) => {
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isToday = isSameDay(day, today);
            const dayEvents = getEventsForDay(day);

            return (
              <div
                key={idx}
                className={cn(
                  "min-h-[100px] md:min-h-[120px] border-b border-r p-1 cursor-pointer hover:bg-muted/30 transition-colors",
                  !isCurrentMonth && "bg-muted/20"
                )}
                onClick={() => handleDayClick(day)}
              >
                <div className="flex justify-between items-start mb-1">
                  <span
                    className={cn(
                      "inline-flex items-center justify-center text-sm w-7 h-7 rounded-full",
                      isToday &&
                        "bg-primary text-primary-foreground font-bold",
                      !isCurrentMonth && "text-muted-foreground"
                    )}
                  >
                    {day.getDate()}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((event) => renderEventChip(event))}
                  {dayEvents.length > 3 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentDate(day);
                        setViewMode("day");
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground pl-1"
                    >
                      +{dayEvents.length - 3} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Week view
  // ---------------------------------------------------------------------------

  function renderWeekView() {
    return (
      <div className="border rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/50">
          <div className="px-2 py-2 text-xs font-medium text-muted-foreground border-r" />
          {weekDays.map((day, idx) => {
            const isToday = isSameDay(day, today);
            return (
              <div
                key={idx}
                className={cn(
                  "px-2 py-2 text-center text-xs font-medium border-r last:border-r-0",
                  isToday
                    ? "text-primary font-bold"
                    : "text-muted-foreground"
                )}
              >
                <div>{DAY_NAMES[day.getDay()]}</div>
                <div
                  className={cn(
                    "inline-flex items-center justify-center w-7 h-7 rounded-full text-sm",
                    isToday && "bg-primary text-primary-foreground"
                  )}
                >
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] overflow-auto max-h-[calc(100vh-320px)]">
          {/* Time labels */}
          <div className="relative border-r">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-16 flex items-start justify-end px-2 text-xs text-muted-foreground"
              >
                {hour === 0
                  ? "12 AM"
                  : hour < 12
                  ? `${hour} AM`
                  : hour === 12
                  ? "12 PM"
                  : `${hour - 12} PM`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day, dayIdx) => {
            const dayEvents = getEventsForDay(day);
            return (
              <div
                key={dayIdx}
                className="relative border-r last:border-r-0"
                onClick={() => handleDayClick(day)}
              >
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="h-16 border-b border-dashed border-muted"
                  />
                ))}
                {dayEvents.map((event) => renderTimeBlock(event))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Day view
  // ---------------------------------------------------------------------------

  function renderDayView() {
    const dayEvents = getEventsForDay(currentDate);
    const isToday = isSameDay(currentDate, today);

    return (
      <div className="border rounded-lg overflow-hidden">
        {/* Day header */}
        <div className="border-b bg-muted/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-semibold",
                isToday && "bg-primary text-primary-foreground"
              )}
            >
              {currentDate.getDate()}
            </span>
            <div>
              <div className="font-medium">
                {currentDate.toLocaleDateString("en-US", {
                  weekday: "long",
                })}
              </div>
              <div className="text-sm text-muted-foreground">
                {dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </div>

        {/* Time grid */}
        <div className="grid grid-cols-[60px_1fr] overflow-auto max-h-[calc(100vh-320px)]">
          {/* Time labels */}
          <div className="relative border-r">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-16 flex items-start justify-end px-2 text-xs text-muted-foreground"
              >
                {hour === 0
                  ? "12 AM"
                  : hour < 12
                  ? `${hour} AM`
                  : hour === 12
                  ? "12 PM"
                  : `${hour - 12} PM`}
              </div>
            ))}
          </div>

          {/* Event column */}
          <div
            className="relative"
            onClick={() => handleDayClick(currentDate)}
          >
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-16 border-b border-dashed border-muted"
              />
            ))}
            {dayEvents.map((event) => renderTimeBlock(event, true))}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Agenda view
  // ---------------------------------------------------------------------------

  function renderAgendaView() {
    if (agendaGrouped.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CalendarIcon className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">No events this month</p>
            <p className="text-sm">
              {canWrite
                ? "Click 'New Event' to schedule something."
                : "No scheduled events found."}
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {agendaGrouped.map((group) => (
          <div key={group.date}>
            <div className="sticky top-0 bg-background z-10 py-2">
              <h3 className="text-sm font-semibold text-muted-foreground">
                {formatDate(group.date)}
              </h3>
              <Separator className="mt-1" />
            </div>
            <div className="space-y-2 mt-2">
              {group.events.map((event) => {
                const config = EVENT_TYPE_CONFIG[event.eventType];
                const Icon = config.icon;
                return (
                  <Card
                    key={event.id}
                    className={cn(
                      "cursor-pointer hover:shadow-md transition-shadow border-l-4",
                      `border-l-${config.color.replace("bg-", "")}`
                    )}
                    style={{
                      borderLeftColor:
                        event.eventType === "CONSULTATION"
                          ? "#3b82f6"
                          : event.eventType === "STAGE"
                          ? "#10b981"
                          : event.eventType === "DESTAGE"
                          ? "#f59e0b"
                          : "#8b5cf6",
                    }}
                    onClick={() => handleEventClick(event)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {renderEventTypeBadge(event.eventType)}
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTimeRange(
                                event.startTime,
                                event.endTime
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate">
                              {event.project.property.address},{" "}
                              {event.project.property.city}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                            <User className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">
                              {event.project.client.agentName}
                              {event.project.client.companyName &&
                                ` - ${event.project.client.companyName}`}
                            </span>
                          </div>
                          {event.crew.length > 0 && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                              <Users className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">
                                {event.crew.map((c) => c.name).join(", ")}
                              </span>
                            </div>
                          )}
                          {event.notes && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {event.notes}
                            </p>
                          )}
                        </div>
                        <div
                          className={cn(
                            "p-2 rounded-lg shrink-0",
                            config.bgColor
                          )}
                        >
                          <Icon className={cn("h-5 w-5", config.textColor)} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Event detail dialog
  // ---------------------------------------------------------------------------

  function renderDetailDialog() {
    if (!selectedEvent) return null;
    const event = selectedEvent;
    const config = EVENT_TYPE_CONFIG[event.eventType];

    return (
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {renderEventTypeBadge(event.eventType)}
              <span>Event Details</span>
            </DialogTitle>
            <DialogDescription>
              {formatDate(event.date)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Time */}
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{formatTimeRange(event.startTime, event.endTime)}</span>
            </div>

            <Separator />

            {/* Property */}
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Property
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>
                  {event.project.property.address},{" "}
                  {event.project.property.city}
                </span>
              </div>
            </div>

            {/* Client */}
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Client
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>
                  {event.project.client.agentName}
                  {event.project.client.companyName &&
                    ` - ${event.project.client.companyName}`}
                </span>
              </div>
            </div>

            {/* Crew */}
            {event.crew.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Assigned Crew
                </div>
                <div className="flex flex-wrap gap-2">
                  {event.crew.map((member) => (
                    <Badge key={member.id} variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" />
                      {member.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {event.notes && (
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Notes
                </div>
                <p className="text-sm bg-muted/50 rounded-md p-3">
                  {event.notes}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-row gap-2 sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDetailOpen(false);
                router.push(`/projects/${event.projectId}`);
              }}
              className="gap-1"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View Project
            </Button>
            {canWrite && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditForm(event)}
                  className="gap-1"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Delete confirmation dialog
  // ---------------------------------------------------------------------------

  function renderDeleteConfirmDialog() {
    return (
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this event? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteEvent}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: New/Edit event form dialog
  // ---------------------------------------------------------------------------

  function renderFormDialog() {
    return (
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? "Edit Event" : "New Event"}
            </DialogTitle>
            <DialogDescription>
              {editingEvent
                ? "Update the event details below."
                : "Fill in the details to schedule a new event."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Project selector */}
            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              {projectsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading projects...
                </div>
              ) : (
                <Select
                  value={formProjectId}
                  onValueChange={setFormProjectId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.property.address},{" "}
                        {project.property.city} -{" "}
                        {project.client.agentName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Event type */}
            <div className="space-y-2">
              <Label htmlFor="eventType">Event Type</Label>
              <Select
                value={formEventType}
                onValueChange={(v) => setFormEventType(v as EventType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((type) => {
                    const config = EVENT_TYPE_CONFIG[type];
                    return (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-2.5 h-2.5 rounded-full",
                              config.color
                            )}
                          />
                          {config.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                />
              </div>
            </div>

            {/* Crew members */}
            <div className="space-y-2">
              <Label>Assign Crew</Label>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-1">
                {crewMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleCrewMember(member.id)}
                    className={cn(
                      "flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm transition-colors",
                      formCrewIds.includes(member.id)
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-4 h-4 rounded border",
                        formCrewIds.includes(member.id)
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-input"
                      )}
                    >
                      {formCrewIds.includes(member.id) && (
                        <Check className="h-3 w-3" />
                      )}
                    </div>
                    <span>{member.name}</span>
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      {member.role}
                    </Badge>
                  </button>
                ))}
                {crewMembers.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2 text-center">
                    No crew members available
                  </p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Add any notes about this event..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEvent} disabled={formSaving}>
              {formSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingEvent ? "Update Event" : "Create Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarIcon className="h-6 w-6" />
            Calendar
            {!loading && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {filteredEvents.length} event
                {filteredEvents.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </h1>
        </div>

        {canWrite && (
          <Button onClick={() => openNewEventForm()} className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Event
          </Button>
        )}
      </div>

      {/* Controls bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* View toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              {(
                [
                  { value: "month", label: "Month" },
                  { value: "week", label: "Week" },
                  { value: "day", label: "Day" },
                  { value: "agenda", label: "Agenda" },
                ] as { value: ViewMode; label: string }[]
              ).map((v) => (
                <Button
                  key={v.value}
                  variant={viewMode === v.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode(v.value)}
                  className={cn(
                    "text-xs",
                    viewMode !== v.value && "text-muted-foreground"
                  )}
                >
                  {v.label}
                </Button>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={navigateToday}>
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={navigatePrev}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={navigateNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold min-w-[180px] text-center">
                {getNavigationLabel()}
              </span>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Event type filters */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setFilterOpen(!filterOpen)}
                >
                  <Filter className="h-3.5 w-3.5" />
                  Filters
                  {activeEventTypes.length < EVENT_TYPES.length && (
                    <Badge
                      variant="secondary"
                      className="h-5 px-1.5 text-[10px]"
                    >
                      {activeEventTypes.length}
                    </Badge>
                  )}
                </Button>

                {filterOpen && (
                  <div className="absolute right-0 top-full mt-1 z-50 bg-popover border rounded-lg shadow-lg p-3 min-w-[200px]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Event Types
                      </span>
                      <button
                        onClick={() => setFilterOpen(false)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      {EVENT_TYPES.map((type) => {
                        const config = EVENT_TYPE_CONFIG[type];
                        const active = activeEventTypes.includes(type);
                        return (
                          <button
                            key={type}
                            onClick={() => toggleEventType(type)}
                            className={cn(
                              "flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm transition-colors",
                              active ? "bg-muted" : "opacity-50 hover:opacity-75"
                            )}
                          >
                            <div
                              className={cn(
                                "flex items-center justify-center w-4 h-4 rounded border",
                                active
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-input"
                              )}
                            >
                              {active && <Check className="h-3 w-3" />}
                            </div>
                            <div
                              className={cn(
                                "w-2.5 h-2.5 rounded-full",
                                config.color
                              )}
                            />
                            <span>{config.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Crew filter */}
              <Select value={crewFilter} onValueChange={setCrewFilter}>
                <SelectTrigger className="w-[160px] h-9 text-xs">
                  <Users className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                  <SelectValue placeholder="All crew" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Crew</SelectItem>
                  {crewMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Calendar views */}
      {!loading && (
        <>
          {viewMode === "month" && renderMonthView()}
          {viewMode === "week" && renderWeekView()}
          {viewMode === "day" && renderDayView()}
          {viewMode === "agenda" && renderAgendaView()}
        </>
      )}

      {/* Dialogs */}
      {renderDetailDialog()}
      {renderDeleteConfirmDialog()}
      {renderFormDialog()}
    </div>
  );
}
