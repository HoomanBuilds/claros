import localFont from "next/font/local";

export const aeonik = localFont({
  src: [
    { path: "./fonts/aeonik-300.otf", weight: "300", style: "normal" },
    { path: "./fonts/aeonik-300-italic.otf", weight: "300", style: "italic" },
    { path: "./fonts/aeonik-400.otf", weight: "400", style: "normal" },
    { path: "./fonts/aeonik-500.otf", weight: "500", style: "normal" },
  ],
  variable: "--font-aeonik",
  display: "swap",
});

export const triple = localFont({
  src: "./fonts/oracle-triple-500.woff2",
  weight: "500",
  variable: "--font-triple",
  display: "swap",
});

export const bench = localFont({
  src: "./fonts/workbench.woff2",
  weight: "400",
  variable: "--font-bench",
  display: "swap",
});

export const fontVariables = [aeonik, triple, bench].map((font) => font.variable).join(" ");
