import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { LoadingListPrintButton } from "./print-button";

export default async function LoadingListPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "projects:read")) {
    redirect("/dashboard");
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      property: true,
      client: true,
      projectItems: {
        include: {
          item: {
            select: {
              id: true,
              sku: true,
              name: true,
              category: true,
              subcategory: true,
              length: true,
              width: true,
              height: true,
              condition: true,
              currentLocation: true,
              photos: true,
            },
          },
        },
        orderBy: { checkedOutAt: "desc" },
      },
      scheduleEvents: {
        include: {
          crew: {
            select: { id: true, name: true },
          },
        },
        orderBy: { date: "asc" },
      },
    },
  });

  if (!project) {
    notFound();
  }

  // Build dimensions string from individual fields
  function formatDimensions(item: {
    length: number | null;
    width: number | null;
    height: number | null;
  }): string | null {
    const parts: string[] = [];
    if (item.length != null) parts.push(`${item.length}L`);
    if (item.width != null) parts.push(`${item.width}W`);
    if (item.height != null) parts.push(`${item.height}H`);
    return parts.length > 0 ? parts.join(" x ") : null;
  }

  // Estimate weight from dimensions
  function estimateWeight(item: {
    length: number | null;
    width: number | null;
    height: number | null;
  }): number | null {
    if (item.length != null && item.width != null && item.height != null) {
      return Math.round((item.length * item.width * item.height) / 100);
    }
    return null;
  }

  // Group items by room assignment
  const itemsByRoom: Record<
    string,
    Array<{
      sku: string;
      name: string;
      category: string;
      subcategory: string | null;
      dimensions: string | null;
      condition: string;
    }>
  > = {};

  let totalWeight = 0;

  for (const pi of project.projectItems) {
    const room = pi.roomAssignment || "Unassigned";
    if (!itemsByRoom[room]) {
      itemsByRoom[room] = [];
    }

    const dimensions = formatDimensions(pi.item);
    const weight = estimateWeight(pi.item);
    if (weight != null) {
      totalWeight += weight;
    }

    itemsByRoom[room].push({
      sku: pi.item.sku,
      name: pi.item.name,
      category: pi.item.category,
      subcategory: pi.item.subcategory,
      dimensions,
      condition: pi.item.condition,
    });
  }

  const roomKeys = Object.keys(itemsByRoom).sort((a, b) => {
    if (a === "Unassigned") return 1;
    if (b === "Unassigned") return -1;
    return a.localeCompare(b);
  });

  // Find next upcoming schedule event
  const now = new Date();
  const upcomingEvent = project.scheduleEvents.find(
    (e) => new Date(e.date) >= now
  );

  const CONDITION_LABELS: Record<string, string> = {
    EXCELLENT: "Excellent",
    GOOD: "Good",
    FAIR: "Fair",
    NEEDS_REPAIR: "Needs Repair",
    RETIRED: "Retired",
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              /* Hide navigation, sidebar, and non-print elements */
              nav, aside, header, footer,
              [data-no-print],
              .no-print {
                display: none !important;
              }

              /* Reset the layout for printing */
              body {
                background: white !important;
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }

              main {
                padding: 0 !important;
                margin: 0 !important;
                max-width: 100% !important;
              }

              /* Ensure the loading list fills the page */
              .loading-list-container {
                padding: 0 !important;
                margin: 0 !important;
              }

              /* Page break handling */
              .room-section {
                break-inside: avoid;
              }

              .item-row {
                break-inside: avoid;
              }

              /* Table styling for print */
              table {
                font-size: 11px !important;
              }

              /* Checkbox sizing for print */
              .print-checkbox {
                width: 14px !important;
                height: 14px !important;
                border: 1.5px solid #000 !important;
              }
            }
          `,
        }}
      />

      <div className="loading-list-container space-y-6 max-w-4xl mx-auto">
        {/* Print Button */}
        <div className="no-print flex items-center justify-between mb-6">
          <a
            href={`/projects/${params.id}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Back to Project
          </a>
          <LoadingListPrintButton />
        </div>

        {/* Header */}
        <div className="border-b-2 border-black pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight uppercase">
                Loading List
              </h1>
              <p className="text-lg font-semibold mt-1">
                {project.property.address}
              </p>
              <p className="text-sm text-muted-foreground">
                {project.property.city}, {project.property.state}{" "}
                {project.property.zip}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {project.client.agentName}
              </p>
              {project.client.companyName && (
                <p className="text-xs text-muted-foreground">
                  {project.client.companyName}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Generated {formatDate(new Date())}
              </p>
            </div>
          </div>
        </div>

        {/* Project Info Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-lg border bg-muted/30 p-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Stage Date
            </p>
            <p className="text-sm font-semibold mt-0.5">
              {project.stageDate
                ? formatDate(project.stageDate)
                : "Not scheduled"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Destage Date
            </p>
            <p className="text-sm font-semibold mt-0.5">
              {project.destageDate
                ? formatDate(project.destageDate)
                : "Not scheduled"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Items
            </p>
            <p className="text-sm font-semibold mt-0.5">
              {project.projectItems.length}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Est. Total Weight
            </p>
            <p className="text-sm font-semibold mt-0.5">
              {totalWeight > 0 ? `${totalWeight} lbs` : "N/A"}
            </p>
          </div>
        </div>

        {/* Property Details */}
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Property Details
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Address: </span>
              <span className="font-medium">
                {project.property.address}, {project.property.city},{" "}
                {project.property.state} {project.property.zip}
              </span>
            </div>
            {project.property.sqft != null && (
              <div>
                <span className="text-muted-foreground">Sqft: </span>
                <span className="font-medium">
                  {project.property.sqft.toLocaleString()}
                </span>
              </div>
            )}
            {project.property.bedrooms != null && (
              <div>
                <span className="text-muted-foreground">Bedrooms: </span>
                <span className="font-medium">{project.property.bedrooms}</span>
              </div>
            )}
            {project.property.bathrooms != null && (
              <div>
                <span className="text-muted-foreground">Bathrooms: </span>
                <span className="font-medium">
                  {project.property.bathrooms}
                </span>
              </div>
            )}
            {project.property.notes && (
              <div className="col-span-2 md:col-span-3">
                <span className="text-muted-foreground">Notes: </span>
                <span className="font-medium">{project.property.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Schedule Info */}
        {upcomingEvent && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400 mb-2">
              Upcoming: {upcomingEvent.eventType.replace(/_/g, " ")}
            </h2>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">Date: </span>
                <span className="font-medium">
                  {formatDate(upcomingEvent.date)}
                </span>
              </div>
              {upcomingEvent.startTime && (
                <div>
                  <span className="text-muted-foreground">Time: </span>
                  <span className="font-medium">
                    {upcomingEvent.startTime}
                    {upcomingEvent.endTime && ` - ${upcomingEvent.endTime}`}
                  </span>
                </div>
              )}
              {upcomingEvent.crew.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Crew: </span>
                  <span className="font-medium">
                    {upcomingEvent.crew.map((c) => c.name).join(", ")}
                  </span>
                </div>
              )}
            </div>
            {upcomingEvent.notes && (
              <p className="text-xs text-muted-foreground mt-2">
                {upcomingEvent.notes}
              </p>
            )}
          </div>
        )}

        {/* Items Table Grouped by Room */}
        <div className="space-y-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Items by Room
          </h2>

          {project.projectItems.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No items assigned to this project.
              </p>
            </div>
          ) : (
            roomKeys.map((room) => {
              const roomItems = itemsByRoom[room];
              return (
                <div key={room} className="room-section">
                  {/* Room Header */}
                  <div className="flex items-center justify-between bg-muted/50 rounded-t-lg border border-b-0 px-4 py-2">
                    <h3 className="text-sm font-bold">{room}</h3>
                    <span className="text-xs text-muted-foreground font-medium">
                      {roomItems.length} item
                      {roomItems.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Items Table */}
                  <div className="border rounded-b-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/20">
                          <th className="w-10 px-3 py-2 text-left"></th>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            SKU
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Name
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Category
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Dimensions
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Condition
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {roomItems.map((item, idx) => (
                          <tr
                            key={`${room}-${item.sku}-${idx}`}
                            className="item-row hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-3 py-2">
                              <div className="print-checkbox h-4 w-4 rounded border-2 border-muted-foreground/40" />
                            </td>
                            <td className="px-3 py-2 font-mono text-xs">
                              {item.sku}
                            </td>
                            <td className="px-3 py-2 font-medium">
                              {item.name}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {item.category}
                              {item.subcategory && (
                                <span className="text-xs">
                                  {" "}
                                  / {item.subcategory}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {item.dimensions || "--"}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                  item.condition === "EXCELLENT"
                                    ? "bg-green-100 text-green-800"
                                    : item.condition === "GOOD"
                                      ? "bg-blue-100 text-blue-800"
                                      : item.condition === "FAIR"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : item.condition === "NEEDS_REPAIR"
                                          ? "bg-red-100 text-red-800"
                                          : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {CONDITION_LABELS[item.condition] ||
                                  item.condition}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Notes Section */}
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Crew Notes
          </h2>
          {project.notes && (
            <p className="text-sm mb-4 whitespace-pre-wrap">{project.notes}</p>
          )}
          <div className="space-y-4">
            <div className="border-b border-dashed border-muted-foreground/30 pb-6" />
            <div className="border-b border-dashed border-muted-foreground/30 pb-6" />
            <div className="border-b border-dashed border-muted-foreground/30 pb-6" />
            <div className="border-b border-dashed border-muted-foreground/30 pb-6" />
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Use this space for additional crew notes during staging/destaging
          </p>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pb-8">
          <p>
            Generated on {formatDate(new Date())} | Project ID: {project.id}
          </p>
        </div>
      </div>
    </>
  );
}
