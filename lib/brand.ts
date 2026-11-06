/** Nome do sistema (aparece na página inicial, no painel e na aba do navegador).
 *  Para mudar sem mexer no código: crie NEXT_PUBLIC_APP_NAME na Vercel e faça Redeploy. */
export const BRAND = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Agenda Barbearia";
