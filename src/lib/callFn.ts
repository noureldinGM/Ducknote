import { base44 } from "@/api/base44Client";

export async function callFunction(name: string, payload: any) {
  let res: any;
  try {
    res = await base44.functions.invoke(name, payload);
  } catch (err: any) {
    const data = err?.response?.data || err?.data || {};
    const msg = data?.error || err?.message || "Something went wrong.";
    throw new Error(typeof msg === "string" ? msg : "Something went wrong.");
  }
  const data = res?.data;
  if (res?.status >= 400) {
    throw new Error(data?.error || "Something went wrong.");
  }
  return data;
}