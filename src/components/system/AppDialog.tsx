import { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AppDialog({ open, onOpenChange, title, description, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-[calc(100%-2rem)] rounded-[1.75rem] border-rose-100 sm:max-w-md"><DialogHeader><DialogTitle className="font-heading text-rose-950">{title}</DialogTitle>{description && <DialogDescription>{description}</DialogDescription>}</DialogHeader>{children}</DialogContent></Dialog>;
}