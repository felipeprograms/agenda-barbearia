import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { Icon } from "@/components/shop/Icons";

/** Barra com o nome do sistema, usada nas páginas do próprio sistema (painel, administração, erros). */
export default function BrandBar() {
  return (
    <div className="brandbar">
      <Link className="brand" href="/">
        <Icon name="scissors" />
        {BRAND}
      </Link>
    </div>
  );
}
