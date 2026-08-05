import { Session } from "./types";

export function filterCitizenNotifications(notifications: Array<Record<string, any>>, session?: Session) {
  const zone = String(session?.zone ?? "").toLowerCase();
  return (notifications ?? []).filter(n => {
    if (String(n.type ?? "").toLowerCase() === "proximity" && session && session.proximity_alerts === false) return false;
    const message = String(n.message ?? n.title ?? "").toLowerCase();
    const title = String(n.title ?? "").toLowerCase();
    return !zone || message.includes(zone) || title.includes(zone) || message.includes("ciudadano") || message.includes("zona");
  });
}
