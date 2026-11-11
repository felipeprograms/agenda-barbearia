import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { APP_URL } from "@/lib/config";
import { LIMITS, rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  const captchaToken = typeof body.captchaToken === "string" && body.captchaToken.length < 3000 ? body.captchaToken : undefined;
  const captchaMsg = "Não conseguimos confirmar que você não é um robô. Recarregue a página e tente de novo.";
  const isCaptchaError = (m: string) => /captcha/i.test(m);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return fail(400, "Informe um e-mail válido.");

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  if (action === "login") {
    const limited = (await rateLimit(req, LIMITS.authLoginIp)) ?? (await rateLimit(req, LIMITS.authLoginEmail, email));
    if (limited) return limited;
    if (!password || password.length > 72) return fail(400, "Informe a senha.");
    const { data, error } = await sb.auth.signInWithPassword({ email, password, options: { captchaToken } });
    if (error && isCaptchaError(error.message)) return fail(400, captchaMsg);
    if (error || !data.session) return fail(401, "E-mail ou senha incorretos.");
    return NextResponse.json({
      session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
    });
  }

  if (action === "signup") {
    const limited = await rateLimit(req, LIMITS.authSignupIp);
    if (limited) return limited;
    if (password.length < 8 || password.length > 72) return fail(400, "A senha precisa ter de 8 a 72 caracteres.");
    if (body.acceptTerms !== true) return fail(400, "É preciso aceitar os Termos de uso e a Política de privacidade.");
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${APP_URL}/painel`,
        captchaToken,

        data: { terms_accepted_at: new Date().toISOString(), terms_version: "2026-11" },
      },
    });
    if (error && isCaptchaError(error.message)) return fail(400, captchaMsg);
    if (error) {
      return fail(
        /rate|limit|seconds/i.test(error.message) ? 429 : 400,
        /rate|limit|seconds/i.test(error.message)
          ? "Muitos cadastros em pouco tempo. Espere alguns minutos e tente de novo."
          : /registered|exists/i.test(error.message)
            ? "Este e-mail já tem conta. Use “Entrar” ou “Esqueci minha senha”."
            : "Não foi possível criar a conta.",
      );
    }
    if (data.session) {
      return NextResponse.json({
        session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
      });
    }
    return NextResponse.json({ needsConfirm: true });
  }

  if (action === "reset") {
    const limited = (await rateLimit(req, LIMITS.authResetIp)) ?? (await rateLimit(req, LIMITS.authResetEmail, email));
    if (limited) return limited;
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${APP_URL}/painel/senha`, captchaToken });
    if (error && isCaptchaError(error.message)) return fail(400, captchaMsg);

    return NextResponse.json({ ok: true });
  }

  return fail(400, "Ação desconhecida.");
}
