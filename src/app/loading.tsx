import { Coffee, Loader2 } from "lucide-react";

export default function RootLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="relative">
        <Coffee className="h-10 w-10 text-mocha/30" aria-hidden="true" />
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-rust" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-4 text-sm text-mocha">Loading...</p>
    </div>
  );
}
