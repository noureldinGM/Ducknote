import { useState } from "react";
import { Bell, BellOff, Check } from "lucide-react";

export default function BrowserNotifyToggle() {
  const supported = typeof Notification !== "undefined";
  const [permission, setPermission] = useState(supported ? Notification.permission : "denied");

  const request = async () => {
    if (!supported) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  if (!supported) {
    return <p className="text-xs text-rose-400">Device notifications aren't available on this browser.</p>;
  }

  const granted = permission === "granted";

  return (
    <button
      type="button"
      onClick={request}
      disabled={granted}
      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-bold transition-colors ${
        granted ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
      }`}
    >
      <span className="flex items-center gap-2">
        {granted ? <Check className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        {granted ? "Device notifications are on" : "Enable device notifications"}
      </span>
      {!granted && <span className="text-xs opacity-70">Tap to allow</span>}
    </button>
  );
}