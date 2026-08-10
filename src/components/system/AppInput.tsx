import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AppInputProps = React.ComponentProps<typeof Input>;

export default function AppInput({ className, ...props }: AppInputProps) {
  return <Input className={cn("h-12 rounded-2xl border-rose-100 bg-white/80 px-4 shadow-sm focus-visible:ring-rose-300", className)} {...props} />;
}