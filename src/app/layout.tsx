import type { Metadata } from "next";
import { Noto_Sans, Noto_Serif, Noto_Sans_Mono } from "next/font/google";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const notoSerif = Noto_Serif({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const notoSansMono = Noto_Sans_Mono({
  variable: "--font-noto-sans-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "VantageMap",
  description:
    "Enterprise architecture and business strategy platform — capabilities, applications, strategy, technology, and roadmap in one unified view.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${notoSans.variable} ${notoSerif.variable} ${notoSansMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme:dark)").matches))document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
      </head>
      <body className="flex min-h-full bg-card font-sans text-foreground">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-rosely-plum focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:outline-none focus:ring-2 focus:ring-rosely-lilac"
        >
          Skip to main content
        </a>
        <AuthSessionProvider>
          <AppShell>{children}</AppShell>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
