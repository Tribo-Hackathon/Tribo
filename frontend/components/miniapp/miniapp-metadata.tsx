"use client";

import { useEffect } from "react";

export function MiniAppMetadata() {
  useEffect(() => {
    // Remove existing fc:miniapp meta tag if it exists
    const existingMeta = document.querySelector('meta[name="fc:miniapp"]');
    if (existingMeta) {
      existingMeta.remove();
    }

    // Create and add the fc:miniapp meta tag
    const meta = document.createElement("meta");
    meta.name = "fc:miniapp";
    meta.content = JSON.stringify({
      version: "next",
      imageUrl: "https://your-app.com/embed-image",
      button: {
        title: "Launch Creator DAO",
        action: {
          type: "launch_miniapp",
          name: "Creator DAO Platform",
          url: "https://your-app.com",
        },
      },
    });
    document.head.appendChild(meta);

    // Cleanup function
    return () => {
      const metaToRemove = document.querySelector('meta[name="fc:miniapp"]');
      if (metaToRemove) {
        metaToRemove.remove();
      }
    };
  }, []);

  return null;
}

