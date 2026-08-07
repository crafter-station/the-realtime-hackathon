import { readFileSync } from "node:fs";
import type { Metadata } from "next";
import Link from "next/link";
import Markdown from "react-markdown";
import styles from "./terms.module.css";

export const metadata: Metadata = {
  title: "Términos y condiciones | The Realtime Hackathon",
  description:
    "Términos, reglas, requisitos, premios y condiciones oficiales de The Realtime Hackathon by Portal.",
  alternates: {
    canonical: "/terms",
  },
};

const markdown = readFileSync(
  `${process.cwd()}/src/app/terms/content.md`,
  "utf8",
);

export default function TermsPage() {
  return (
    <main className={styles.page} lang="es">
      <header className={styles.header}>
        <Link className={styles.wordmark} href="/">
          Portal × Crafter Station
        </Link>
        <Link className={styles.backLink} href="/">
          Volver al inicio
        </Link>
      </header>

      <article className={styles.document}>
        <Markdown>{markdown}</Markdown>
      </article>

      <footer className={styles.footer}>
        <span>The Realtime Hackathon</span>
        <span>Portal × Crafter Station</span>
      </footer>
    </main>
  );
}
