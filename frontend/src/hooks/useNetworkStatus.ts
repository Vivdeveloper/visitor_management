import { useEffect, useState } from "react";
import { onNetworkChange } from "@/native/services/network";

export function useNetworkStatus() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => onNetworkChange(setOnline), []);

  return { online, offline: !online };
}
