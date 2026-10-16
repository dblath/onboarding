import { useCallback, useEffect, useState } from "react";
import type { OnboardingService } from "./application";
import { emptyState, type State } from "./domain";

/** Always reload the repository. Notifications and focus changes never supply business state. */
export function useWorkspace(service: OnboardingService) {
  const [state, setState] = useState<State>(emptyState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    const snapshot = await service.getState();
    if (snapshot.schemaVersion !== 3)
      throw new Error(
        "This workspace requires a safely locked data upgrade. Use Chrome on localhost or HTTPS.",
      );
    // A slower pre-commit read must not replace a more recent snapshot.
    setState((previous) =>
      snapshot.revision >= previous.revision ? snapshot : previous,
    );
  }, [service]);

  useEffect(() => {
    let mounted = true;
    const reload = async () => {
      if (!mounted) return;
      setRefreshing(true);
      try {
        await refresh();
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (mounted) setRefreshing(false);
      }
    };
    // Subscribe before initializing, so commits from other tabs during startup are not missed.
    const unsubscribe = service.subscribe(() => {
      void reload();
    });
    const active = () => {
      if (document.visibilityState === "visible") void reload();
    };
    const focus = () => {
      void reload();
    };
    window.addEventListener("focus", focus);
    window.addEventListener("pageshow", focus);
    document.addEventListener("visibilitychange", active);
    const initialize = async () => {
      try {
        if (service.unavailableReason) {
          setError(service.unavailableReason);
          await refresh();
        } else {
          await service.initialize();
          await refresh();
          if (mounted) setError("");
        }
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void initialize();
    return () => {
      mounted = false;
      unsubscribe();
      window.removeEventListener("focus", focus);
      window.removeEventListener("pageshow", focus);
      document.removeEventListener("visibilitychange", active);
    };
  }, [service, refresh]);
  return { state, refresh, loading, error, setError, refreshing };
}
