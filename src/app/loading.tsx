import Image from "next/image";
import { Loader2 } from "lucide-react";

export default function RootLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="relative">
        <Image
          src="/images/logos/kynda-logo-black.png"
          alt=""
          width={200}
          height={155}
          priority
          aria-hidden="true"
          className="h-16 w-auto opacity-25 dark:invert sm:h-20"
        />
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
          <Loader2 className="h-5 w-5 animate-spin text-forest" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-4 text-sm text-mocha">Loading...</p>
    </div>
  );
}
