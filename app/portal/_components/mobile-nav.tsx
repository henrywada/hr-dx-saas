"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { PortalSidebar } from "./portal-sidebar";
import { PortalCategory } from "@/utils/portal-actions";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

export function MobileNav({ categories }: { categories: PortalCategory[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden mr-2 -ml-2">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] p-0 bg-gray-50">
        <VisuallyHidden.Root>
          <SheetTitle>Navigation Menu</SheetTitle>
          <SheetDescription>Portal navigation menu</SheetDescription>
        </VisuallyHidden.Root>
        <div className="p-4 h-full overflow-y-auto">
            <div className="mb-4 pl-2 font-bold text-lg text-gray-800">
                Menu
            </div>
            <PortalSidebar categories={categories} setOpen={setOpen} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
