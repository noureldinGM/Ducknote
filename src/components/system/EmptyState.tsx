import { ComponentType } from "react";
import { Sparkles } from "lucide-react";

type IconType = ComponentType<{ className?: string }>;

export default function EmptyState({ icon: Icon = Sparkles, title, message }: { icon?: IconType; title: string; message: string }) {
  return <div className="mx-auto flex max-w-sm flex-col items-center px-5 py-12 text-center"><span className="mb-5 grid h-16 w-16 place-items-center rounded-[1.4rem] bg-gradient-to-br from-rose-100 to-violet-100 text-rose-500"><Icon className="h-7 w-7" /></span><h2 className="font-heading text-xl font-extrabold text-rose-950">{title}</h2><p className="mt-2 text-sm leading-6 text-rose-500">{message}</p></div>;
}