"use client";

import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

interface MiniAppProviderProps {
  children: React.ReactNode;
}

export function MiniAppProvider({ children }: MiniAppProviderProps) {
  useEffect(() => {
    // Initialize SDK and call ready() when app is loaded
    // This hides the loading splash screen and displays the app
    const initializeSDK = async () => {
      try {
        // Check if we're running in a MiniApp context
        // The SDK will only work when running inside Base app
        if (typeof window !== "undefined") {
          await sdk.actions.ready();
        }
      } catch (error) {
        // Silently fail if not in MiniApp context (e.g., regular web browser)
        // This allows the app to work in both contexts
        console.debug("MiniApp SDK not available:", error);
      }
    };

    initializeSDK();
  }, []);

  return <>{children}</>;
}

