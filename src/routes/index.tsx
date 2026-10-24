import { createFileRoute } from "@tanstack/react-router";
import { EssenceApp } from "@/components/essence/EssenceApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Essence IQ — vizual mantiqiy IQ testi" },
      { name: "description", content: "Raven uslubidagi 20 ta vizual matritsa: mashq IQ bahosi, do‘st bilan battle va sertifikat." },
      { property: "og:title", content: "Essence IQ — vizual mantiqiy IQ testi" },
      { property: "og:description", content: "20 visual matrix puzzles, friend battles and a shareable practice certificate." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EssenceApp,
});
