import { Loader2 } from "lucide-react";

export default function MovingLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-forest" aria-hidden="true" />
      <span className="sr-only">Loading relocation details</span>
    </div>
  );
}
