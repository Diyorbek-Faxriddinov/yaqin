"use client";

import { useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function FormControlsDemo() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor="demo-district">Tuman</Label>
        <Select defaultValue="chilonzor">
          <SelectTrigger id="demo-district" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="chilonzor">Chilonzor</SelectItem>
            <SelectItem value="yunusobod">Yunusobod</SelectItem>
            <SelectItem value="mirzo-ulugbek">Mirzo Ulugʻbek</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <fieldset className="grid gap-3">
        <legend className="mb-2 text-sm font-medium">Saralash</legend>
        <RadioGroup defaultValue="distance">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="distance" id="sort-distance" />
            <Label htmlFor="sort-distance">Eng yaqin</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="rating" id="sort-rating" />
            <Label htmlFor="sort-rating">Reyting boʻyicha</Label>
          </div>
        </RadioGroup>
      </fieldset>

      <div className="flex items-center gap-2">
        <Checkbox id="demo-open-now" defaultChecked />
        <Label htmlFor="demo-open-now">Faqat hozir ochiqlar</Label>
      </div>

      <div className="flex items-center gap-2">
        <Switch id="demo-delivery" />
        <Label htmlFor="demo-delivery">Yetkazib berish bor</Label>
      </div>
    </div>
  );
}

export function OverlaysDemo() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-3">
      {/* Telefonda filtrlar pastdan chiqadigan oynada ochiladi */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">
            <SlidersHorizontal aria-hidden="true" />
            Filtrlar (bottom sheet)
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Filtrlar</SheetTitle>
            <SheetDescription>Telefonda filtrlar shu koʻrinishda ochiladi.</SheetDescription>
          </SheetHeader>
          <div className="px-4">
            <FormControlsDemo />
          </div>
          <SheetFooter>
            <Button size="lg">Natijalarni koʻrsatish</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">Tasdiqlash oynasi</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sharhni oʻchirasizmi?</DialogTitle>
            <DialogDescription>
              Xavfli amallar sabab bilan tasdiqlanadi va audit jurnaliga yoziladi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
            <Button variant="destructive" onClick={() => setOpen(false)}>
              Oʻchirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            Menyu
            <ChevronDown aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Biznes</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Tahrirlash</DropdownMenuItem>
          <DropdownMenuItem>Hisobot havolasi</DropdownMenuItem>
          <DropdownMenuItem variant="destructive">Arxivlash</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost">Tooltip</Button>
        </TooltipTrigger>
        <TooltipContent>Qoʻshimcha izoh</TooltipContent>
      </Tooltip>

      <Button variant="secondary" onClick={() => toast.success("Biznes saqlandi")}>
        Bildirishnoma (toast)
      </Button>
      <Button
        variant="secondary"
        onClick={() => toast.error("Saqlab boʻlmadi. Qayta urinib koʻring.")}
      >
        Xato bildirishnomasi
      </Button>
    </div>
  );
}

export function TabsDemo() {
  return (
    <Tabs defaultValue="catalog">
      <TabsList>
        <TabsTrigger value="catalog">Katalog</TabsTrigger>
        <TabsTrigger value="branches">Filiallar</TabsTrigger>
        <TabsTrigger value="reviews">Sharhlar</TabsTrigger>
      </TabsList>
      <TabsContent value="catalog" className="pt-3 text-sm text-muted-foreground">
        Mahsulot va xizmatlar roʻyxati.
      </TabsContent>
      <TabsContent value="branches" className="pt-3 text-sm text-muted-foreground">
        Filiallar va ish vaqti.
      </TabsContent>
      <TabsContent value="reviews" className="pt-3 text-sm text-muted-foreground">
        Mijozlar sharhlari.
      </TabsContent>
    </Tabs>
  );
}
