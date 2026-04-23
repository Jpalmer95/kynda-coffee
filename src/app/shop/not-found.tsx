import Link from "next/link";
import { ArrowLeft, PackageX } from "lucide-react";

export default function ShopNotFound() {
  return (
    <section className="section-padding">
      <div className="container-max max-w-lg text-center">
        <PackageX className="mx-auto h-16 w-16 text-latte" aria-hidden="true" />
        <h1 className="mt-4 font-heading text-2xl font-bold text-espresso">Page Not Found</h1>
        <p className="mt-2 text-mocha">We couldn&apos;t find that page in our shop.</p>
        <Link href="/shop" className="btn-primary mt-6 inline-flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Browse Shop
        </Link>
      </div>
    </section>
  );
}
