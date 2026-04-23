import Link from "next/link";
import { ArrowLeft, PackageX } from "lucide-react";

export default function ProductNotFound() {
  return (
    <section className="section-padding">
      <div className="container-max max-w-lg text-center">
        <PackageX className="mx-auto h-16 w-16 text-latte" aria-hidden="true" />
        <h1 className="mt-4 font-heading text-2xl font-bold text-espresso">Product Not Found</h1>
        <p className="mt-2 text-mocha">The product you are trying to edit does not exist.</p>
        <Link href="/admin/products" className="btn-primary mt-6 inline-flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Link>
      </div>
    </section>
  );
}
