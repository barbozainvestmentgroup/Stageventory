"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function LoadingListPrintButton() {
  return (
    <Button
      onClick={() => window.print()}
      variant="outline"
      className="no-print"
    >
      <Printer className="mr-2 h-4 w-4" />
      Print Loading List
    </Button>
  );
}
