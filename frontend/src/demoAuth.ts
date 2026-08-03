export function shouldAutoLoginAsAdmin(target: string | undefined): boolean {
  if (!target) return false;

  try {
    const url = new URL(target, window.location.origin);
    const host = url.hostname.toLowerCase();
    return host === "sistema-de-recoleccion-de-residuos-solidos-e55p294t7.vercel.app";
  } catch {
    return false;
  }
}
