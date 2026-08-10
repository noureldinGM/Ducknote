import { HeartCrack } from "lucide-react";

export default function ErrorState({ message }: { message: string }) {
  return <div role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-600"><HeartCrack className="mr-2 inline h-4 w-4" />{message}</div>;
}