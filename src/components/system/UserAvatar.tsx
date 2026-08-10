import { User } from "lucide-react";
import { Image } from "@/components/ui/image";

export default function UserAvatar({ src, name, className = "h-11 w-11" }: { src?: string; name?: string; className?: string }) {
  return src ? (
    <Image src={src} alt={name || "Profile"} className={`${className} overflow-hidden rounded-2xl`} />
  ) : (
    <span className={`${className} grid place-items-center rounded-2xl bg-gradient-to-br from-rose-100 to-violet-100 text-rose-500`}><User className="h-5 w-5" /></span>
  );
}