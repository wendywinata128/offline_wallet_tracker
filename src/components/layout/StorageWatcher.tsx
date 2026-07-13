import { useEffect } from "react";
import { storage } from "@/storage/storage";
import { useToast } from "@/components/ui/use-toast";

/** Surfaces storage-layer events (quota, corruption, recovery) as toasts. */
export function StorageWatcher() {
  const { toast } = useToast();
  useEffect(() => {
    if (!storage.isAvailable) {
      toast({
        variant: "destructive",
        title: "Storage unavailable",
        description:
          "Your browser is blocking local storage (private mode?). Changes won't be saved.",
      });
    }
    return storage.subscribe((event) => {
      toast({
        variant: event.type === "quota" || event.type === "corrupt" ? "destructive" : "default",
        title:
          event.type === "quota"
            ? "Storage full"
            : event.type === "corrupt"
              ? "Data issue"
              : event.type === "recovered"
                ? "Data recovered"
                : "Data upgraded",
        description: event.message,
      });
    });
  }, [toast]);
  return null;
}
