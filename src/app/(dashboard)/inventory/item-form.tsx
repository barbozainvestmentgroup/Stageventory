"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = [
  "Furniture",
  "Art & Wall Decor",
  "Rugs/Pillows/Linens",
  "Lighting/Plants/Accessories",
];

const SUBCATEGORIES: Record<string, string[]> = {
  Furniture: ["Sofa", "Chair", "Dining Table", "Coffee Table", "Side Table", "Console Table", "Bed", "Dresser", "Nightstand", "Bookshelf", "Bar Stool", "Desk", "Ottoman", "Bench"],
  "Art & Wall Decor": ["Canvas Art", "Print Set", "Mirror", "Wall Art", "Photography", "Print", "Sculpture", "Wall Clock"],
  "Rugs/Pillows/Linens": ["Rug", "Pillow Set", "Blanket", "Bedding", "Curtains", "Table Linen", "Towels"],
  "Lighting/Plants/Accessories": ["Table Lamp", "Floor Lamp", "Pendant Light", "Plant", "Vase", "Tray", "Books", "Candle Holder", "Storage", "Bookend", "Floral", "Bath Accessory", "Kitchen Accessory", "Tableware", "Lighting"],
};

const STYLE_OPTIONS = [
  "Modern", "Coastal", "Traditional", "Contemporary", "Mid-Century",
  "Luxury", "Glam", "Industrial", "Minimalist", "Natural", "Mediterranean",
  "Farmhouse", "Transitional", "Bohemian", "Neutral", "Bold", "Warm",
  "Cozy", "Elegant", "Classic",
];

interface ItemFormProps {
  categories: string[];
  item?: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    subcategory: string | null;
    length: number | null;
    width: number | null;
    height: number | null;
    color: string | null;
    styleTags: string[];
    purchaseCost: number | null;
    purchaseDate: string | null;
    replacementValue: number | null;
    condition: string;
    notes: string | null;
  };
  onSuccess: () => void;
}

export function ItemForm({ item, onSuccess }: ItemFormProps) {
  const isEditing = !!item;
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(item?.name || "");
  const [description, setDescription] = useState(item?.description || "");
  const [category, setCategory] = useState(item?.category || "");
  const [subcategory, setSubcategory] = useState(item?.subcategory || "");
  const [length, setLength] = useState(item?.length?.toString() || "");
  const [width, setWidth] = useState(item?.width?.toString() || "");
  const [height, setHeight] = useState(item?.height?.toString() || "");
  const [color, setColor] = useState(item?.color || "");
  const [styleTags, setStyleTags] = useState<string[]>(item?.styleTags || []);
  const [purchaseCost, setPurchaseCost] = useState(item?.purchaseCost?.toString() || "");
  const [purchaseDate, setPurchaseDate] = useState(
    item?.purchaseDate ? new Date(item.purchaseDate).toISOString().split("T")[0] : ""
  );
  const [replacementValue, setReplacementValue] = useState(item?.replacementValue?.toString() || "");
  const [condition, setCondition] = useState(item?.condition || "GOOD");
  const [notes, setNotes] = useState(item?.notes || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const body = {
      name,
      description: description || undefined,
      category,
      subcategory: subcategory || undefined,
      length: length ? parseFloat(length) : undefined,
      width: width ? parseFloat(width) : undefined,
      height: height ? parseFloat(height) : undefined,
      color: color || undefined,
      styleTags,
      purchaseCost: purchaseCost ? parseFloat(purchaseCost) : undefined,
      purchaseDate: purchaseDate || undefined,
      replacementValue: replacementValue ? parseFloat(replacementValue) : undefined,
      condition,
      notes: notes || undefined,
    };

    try {
      const url = isEditing ? `/api/inventory/${item.id}` : "/api/inventory";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save item");
      }

      toast({
        title: isEditing ? "Item updated" : "Item created",
        description: `${name} has been ${isEditing ? "updated" : "added to inventory"}.`,
      });

      onSuccess();
      router.refresh();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleStyle = (style: string) => {
    setStyleTags((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Item" : "Add Inventory Item"}</DialogTitle>
        <DialogDescription>
          {isEditing
            ? "Update the item's details."
            : "Add a new item to your staging inventory."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <div className="space-y-2">
          <Label htmlFor="name">Item Name *</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={category} onValueChange={(v) => { setCategory(v); setSubcategory(""); }}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Subcategory</Label>
            <Select value={subcategory} onValueChange={setSubcategory} disabled={!category}>
              <SelectTrigger><SelectValue placeholder="Select subcategory" /></SelectTrigger>
              <SelectContent>
                {(SUBCATEGORIES[category] || []).map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Dimensions */}
        <div>
          <Label className="mb-2 block">Dimensions (inches)</Label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Input placeholder="Length" type="number" step="0.1" value={length} onChange={(e) => setLength(e.target.value)} />
            </div>
            <div>
              <Input placeholder="Width" type="number" step="0.1" value={width} onChange={(e) => setWidth(e.target.value)} />
            </div>
            <div>
              <Input placeholder="Height" type="number" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Color & Condition */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Input id="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Condition</Label>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EXCELLENT">Excellent</SelectItem>
                <SelectItem value="GOOD">Good</SelectItem>
                <SelectItem value="FAIR">Fair</SelectItem>
                <SelectItem value="NEEDS_REPAIR">Needs Repair</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Style Tags */}
        <div className="space-y-2">
          <Label>Style Tags</Label>
          <div className="flex flex-wrap gap-1.5">
            {STYLE_OPTIONS.map((style) => (
              <Badge
                key={style}
                variant={styleTags.includes(style) ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => toggleStyle(style)}
              >
                {style}
                {styleTags.includes(style) && <X className="ml-1 h-3 w-3" />}
              </Badge>
            ))}
          </div>
        </div>

        {/* Financial */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="purchaseCost">Purchase Cost</Label>
            <Input id="purchaseCost" type="number" step="0.01" min="0" placeholder="$0.00" value={purchaseCost} onChange={(e) => setPurchaseCost(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="replacementValue">Replacement Value</Label>
            <Input id="replacementValue" type="number" step="0.01" min="0" placeholder="$0.00" value={replacementValue} onChange={(e) => setReplacementValue(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchaseDate">Purchase Date</Label>
            <Input id="purchaseDate" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : isEditing ? "Save Changes" : "Add Item"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
