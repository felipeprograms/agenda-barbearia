import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="wrap" style={{ maxWidth: 760, padding: "40px 16px 80px", lineHeight: 1.65 }}>
      <p>
        <Link href="/">← Voltar</Link>
      </p>
      <h1>{title}</h1>
      <p className="muted">Última atualização: {updated}</p>
      <div className="stack">{children}</div>
    </main>
  );
}
