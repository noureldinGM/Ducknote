type Status = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

const MAP: Record<Status, { label: string; cls: string }> = {
  sending: { label: 'Sending…', cls: 'bg-amber-100 text-amber-600' },
  sent: { label: 'Sent', cls: 'bg-sky-100 text-sky-600' },
  delivered: { label: 'Delivered', cls: 'bg-violet-100 text-violet-600' },
  read: { label: 'Read', cls: 'bg-emerald-100 text-emerald-600' },
  failed: { label: "Couldn't send", cls: 'bg-red-100 text-red-600' },
};

export default function StatusBadge({ status }: { status: Status }) {
  const entry = MAP[status] || MAP.sent;
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${entry.cls}`}>{entry.label}</span>;
}