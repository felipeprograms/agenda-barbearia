export type StackItem = {
  src?: string | null;
  label?: string;
  href?: string;
  initials?: string;
};

/**
 * Fotos distribuídas e sobrepostas em camadas (tamanhos diferentes, alturas diferentes, sombra).
 * Aceita de 1 a 3 itens; quem chama divide listas maiores em grupos de 3.
 */
export default function PhotoStack({ items }: { items: StackItem[] }) {
  const list = items.slice(0, 3);
  if (list.length === 0) return null;

  return (
    <div className={`pstack pstack-${list.length}`}>
      {list.map((it, i) => {
        const inner = (
          <>
            {it.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.src} alt={it.label ? `Foto de ${it.label}` : ""} loading="lazy" />
            ) : (
              <span className="pstack-initials" aria-hidden="true">
                {it.initials ?? ""}
              </span>
            )}
            {it.label && <span className="pstack-label">{it.label}</span>}
          </>
        );
        const cls = `pstack-item pstack-i${i}`;
        return it.href ? (
          <a key={i} className={cls} href={it.href}>
            {inner}
          </a>
        ) : (
          <div key={i} className={cls}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
