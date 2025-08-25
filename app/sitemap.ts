import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://havengames.org";
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/home`, changeFrequency: "weekly" },
    { url: `${base}/rumble`, changeFrequency: "weekly" },
    { url: `${base}/rumble/reports`, changeFrequency: "weekly" },
    { url: `${base}/leaderboard`, changeFrequency: "weekly" },
    // add more key routes if you like
  ];
}
