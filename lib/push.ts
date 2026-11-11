import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

let ready: boolean | null = null;
function setup(): boolean {
  if (ready !== null) return ready;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !subject) return (ready = false);
  try {
    webpush.setVapidDetails(subject, pub, priv);
    ready = true;
  } catch (e) {
    console.error("vapid:", e);
    ready = false;
  }
  return ready;
}

export async function sendPushToUsers(admin: SupabaseClient, userIds: string[], payload: PushPayload): Promise<number> {
  if (userIds.length === 0 || !setup()) return 0;
  try {
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("id,endpoint,p256dh,auth")
      .in("user_id", userIds);
    let sent = 0;
    const body = JSON.stringify({ url: "/painel", ...payload });
    await Promise.all(
      (subs ?? []).map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
            TTL: 3600,
            urgency: "high",
          });
          sent += 1;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) await admin.from("push_subscriptions").delete().eq("id", s.id);
          else console.error("push:", code ?? "erro");
        }
      }),
    );
    return sent;
  } catch (e) {
    console.error("push geral:", e);
    return 0;
  }
}

export async function sendPushForBarber(admin: SupabaseClient, barberId: string, payload: PushPayload): Promise<number> {
  try {
    const { data: barber } = await admin.from("barbers").select("user_id,shop_id").eq("id", barberId).maybeSingle();
    if (!barber) return 0;
    const { data: shop } = await admin.from("shops").select("owner_user_id").eq("id", barber.shop_id).maybeSingle();
    const ids = [barber.user_id, shop?.owner_user_id].filter((v): v is string => typeof v === "string");
    return await sendPushToUsers(admin, Array.from(new Set(ids)), payload);
  } catch (e) {
    console.error("push barbeiro:", e);
    return 0;
  }
}
