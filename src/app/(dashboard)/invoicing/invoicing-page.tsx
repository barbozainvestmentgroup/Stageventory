"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Plus,
  DollarSign,
  Send,
  XCircle,
  Trash2,
  CreditCard,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Project {
  id: string;
  status: string;
  property: { id: string; address: string; city: string };
  client: { id: string; agentName: string; companyName: string | null };
}

interface Payment {
  id: string;
  amount: number;
  method: string | null;
  reference: string | null;
  date: string;
}

interface Invoice {
  id: string;
  projectId: string;
  invoiceNumber: string;
  amount: number;
  tax: number;
  total: number;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number }> | null;
  status: string;
  dueDate: string | null;
  paidDate: string | null;
  createdAt: string;
  project: Project;
  payments: Payment[];
}

interface InvoicingPageProps {
  invoices: Invoice[];
  projects: Project[];
  canWrite: boolean;
}

const invoiceStatusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"; label: string }> = {
  DRAFT: { variant: "secondary", label: "Draft" },
  SENT: { variant: "warning", label: "Sent" },
  PAID: { variant: "success", label: "Paid" },
  PARTIAL: { variant: "default", label: "Partial" },
  OVERDUE: { variant: "destructive", label: "Overdue" },
  VOID: { variant: "outline", label: "Void" },
};

export function InvoicingPage({ invoices, projects, canWrite }: InvoicingPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [showPayment, setShowPayment] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [taxRate, setTaxRate] = useState(0);

  const [lineItems, setLineItems] = useState<Array<{ description: string; quantity: number; unitPrice: number }>>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);

  // Payment form
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Check");
  const [paymentRef, setPaymentRef] = useState("");

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: string, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const invoiceTotal = subtotal + taxAmount;

  // Stats
  const totalOutstanding = invoices
    .filter((i) => i.status === "SENT" || i.status === "OVERDUE" || i.status === "PARTIAL")
    .reduce((sum, i) => sum + i.total, 0);
  const totalPaid = invoices
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + i.total, 0);
  const overdueCount = invoices.filter((i) => i.status === "OVERDUE").length;

  const filteredInvoices = statusFilter === "all"
    ? invoices
    : invoices.filter((i) => i.status === statusFilter);

  const handleCreateInvoice = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          lineItems: lineItems.filter((li) => li.description),
          tax: taxAmount,
          dueDate: dueDate || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create invoice");
      }
      toast({ title: "Invoice created successfully" });
      setShowNewInvoice(false);
      setSelectedProjectId("");
      setLineItems([{ description: "", quantity: 1, unitPrice: 0 }]);
      setTaxRate(0);
      setDueDate("");
      router.refresh();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to create invoice", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }
      toast({ title: `Invoice status updated to ${newStatus}` });
      router.refresh();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to update", variant: "destructive" });
    }
  };

  const handleRecordPayment = async (invoiceId: string) => {
    if (paymentAmount <= 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PAID",
          payment: {
            amount: paymentAmount,
            method: paymentMethod,
            reference: paymentRef || undefined,
            date: new Date().toISOString(),
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to record payment");
      }
      toast({ title: "Payment recorded successfully" });
      setShowPayment(null);
      setPaymentAmount(0);
      setPaymentRef("");
      router.refresh();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to record payment", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      toast({ title: "Invoice deleted" });
      router.refresh();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to delete", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Invoicing</h2>
          <p className="text-muted-foreground">Manage invoices and payments</p>
        </div>
        {canWrite && (
          <Dialog open={showNewInvoice} onOpenChange={setShowNewInvoice}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Invoice</DialogTitle>
                <DialogDescription>Create a new invoice for a project</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Project</Label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.property.address}, {p.property.city} - {p.client.agentName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Line Items</Label>
                  <div className="space-y-2 mt-2">
                    {lineItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(idx, "quantity", parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                        <Input
                          type="number"
                          placeholder="Price"
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                          className="w-28"
                        />
                        <Button variant="ghost" size="icon" onClick={() => removeLineItem(idx)} disabled={lineItems.length === 1}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addLineItem}>
                      <Plus className="mr-1 h-3 w-3" />Add Line Item
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tax Rate (%)</Label>
                    <Input
                      type="number"
                      value={taxRate}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax ({taxRate}%):</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{formatCurrency(invoiceTotal)}</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewInvoice(false)}>Cancel</Button>
                <Button onClick={handleCreateInvoice} disabled={!selectedProjectId || lineItems.filter((li) => li.description).length === 0 || loading}>
                  {loading ? "Creating..." : "Create Invoice"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <DollarSign className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdueCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button variant={statusFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("all")}>All ({invoices.length})</Button>
        {Object.entries(invoiceStatusConfig).map(([key, config]) => {
          const count = invoices.filter((i) => i.status === key).length;
          return (
            <Button key={key} variant={statusFilter === key ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(key)}>
              {config.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Invoices List */}
      <div className="space-y-3">
        {filteredInvoices.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No invoices found</CardContent></Card>
        ) : (
          filteredInvoices.map((invoice) => {
            const config = invoiceStatusConfig[invoice.status] || { variant: "outline" as const, label: invoice.status };
            const isExpanded = expandedId === invoice.id;
            const items = invoice.lineItems as Array<{ description: string; quantity: number; unitPrice: number }> | null;
            return (
              <Card key={invoice.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold font-mono">{invoice.invoiceNumber}</h3>
                        <Badge variant={config.variant}>{config.label}</Badge>
                        <span className="font-semibold">{formatCurrency(invoice.total)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {invoice.project.property.address}, {invoice.project.property.city} &middot; {invoice.project.client.agentName}
                      </p>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Created: {formatDate(invoice.createdAt)}</span>
                        {invoice.dueDate && <span>Due: {formatDate(invoice.dueDate)}</span>}
                        {invoice.paidDate && <span>Paid: {formatDate(invoice.paidDate)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {canWrite && (
                        <>
                          {invoice.status === "DRAFT" && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleStatusChange(invoice.id, "SENT")}>
                                <Send className="mr-1 h-3 w-3" />Send
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(invoice.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                          {(invoice.status === "SENT" || invoice.status === "OVERDUE" || invoice.status === "PARTIAL") && (
                            <Button variant="outline" size="sm" onClick={() => { setShowPayment(invoice.id); setPaymentAmount(invoice.total); }}>
                              <CreditCard className="mr-1 h-3 w-3" />Record Payment
                            </Button>
                          )}
                        </>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setExpandedId(isExpanded ? null : invoice.id)}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 border-t pt-4 space-y-4">
                      {items && items.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Line Items</h4>
                          <div className="border rounded-md">
                            <div className="grid grid-cols-4 gap-2 p-2 bg-muted text-xs font-medium">
                              <span className="col-span-2">Description</span>
                              <span className="text-right">Qty x Price</span>
                              <span className="text-right">Total</span>
                            </div>
                            {items.map((item, idx) => (
                              <div key={idx} className="grid grid-cols-4 gap-2 p-2 text-sm border-t">
                                <span className="col-span-2">{item.description}</span>
                                <span className="text-right">{item.quantity} x {formatCurrency(item.unitPrice)}</span>
                                <span className="text-right">{formatCurrency(item.quantity * item.unitPrice)}</span>
                              </div>
                            ))}
                            <div className="border-t p-2 space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>Subtotal</span>
                                <span>{formatCurrency(invoice.amount)}</span>
                              </div>
                              {invoice.tax > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span>Tax</span>
                                  <span>{formatCurrency(invoice.tax)}</span>
                                </div>
                              )}
                              <div className="flex justify-between font-semibold">
                                <span>Total</span>
                                <span>{formatCurrency(invoice.total)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {invoice.payments.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Payments</h4>
                          <div className="space-y-2">
                            {invoice.payments.map((payment) => (
                              <div key={payment.id} className="flex items-center justify-between text-sm border rounded-md p-2">
                                <div>
                                  <span className="font-medium">{formatCurrency(payment.amount)}</span>
                                  {payment.method && <span className="text-muted-foreground ml-2">via {payment.method}</span>}
                                  {payment.reference && <span className="text-muted-foreground ml-2">Ref: {payment.reference}</span>}
                                </div>
                                <span className="text-xs text-muted-foreground">{formatDate(payment.date)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={showPayment !== null} onOpenChange={(open) => { if (!open) setShowPayment(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Record a payment for this invoice</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Check">Check</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reference Number (optional)</Label>
              <Input
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="Check number, transaction ID, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(null)}>Cancel</Button>
            <Button onClick={() => showPayment && handleRecordPayment(showPayment)} disabled={paymentAmount <= 0 || loading}>
              {loading ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
