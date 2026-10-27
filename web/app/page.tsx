import type { Viewport } from "next";
import Landing from "@/components/landing/Landing";

export const viewport: Viewport = { themeColor: "#070b14" };

export default function Page() {
  return <Landing />;
}
