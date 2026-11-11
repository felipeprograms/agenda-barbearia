import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { Icon } from "@/components/shop/Icons";

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
