import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function SurfaceCard({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-[1.75rem] border border-white/80 bg-white/85 p-5 shadow-[0_16px_50px_-28px_rgba(159,18,57,.45)] backdrop-blur", className)}>{children}</section>;
}