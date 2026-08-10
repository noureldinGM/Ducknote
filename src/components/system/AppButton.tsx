import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppButtonProps = React.ComponentProps<typeof Button>;

export default function AppButton({ className, ...props }: AppButtonProps) {
  return <Button className={cn("h-12 rounded-2xl font-bold shadow-sm transition-transform active:scale-[.98]", className)} {...props} />;
}