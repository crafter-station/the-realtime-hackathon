"use client";

import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bot,
  Check,
  Cloud,
  Code2,
  DatabaseZap,
  ExternalLink,
  FileVideo2,
  GitBranch,
  Radio,
  Rocket,
  Sparkles,
  Users,
  Wifi,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "./kickoff.module.css";

const TOTAL_SLIDES = 10;
const CONTROLS_IDLE_DELAY = 1800;
const CONTROLS_TRIGGER_WIDTH = 320;
const CONTROLS_TRIGGER_HEIGHT = 180;
const SUBMISSION_URL = "https://forms.gle/JVMq3Jag74218YBQ8";
const KICKOFF_PRESENTATION_START = new Date(
  "2026-08-07T19:10:00-05:00",
).getTime();

const schedule = [
  ["VIE 19:00", "Kickoff", "start"],
  ["20:00", "Portal Quick Start", "quickstart"],
  ["SÁB 09–21", "Mentorías", "mentors"],
  ["DOM 00:00", "Entregas abiertas", "submissions"],
  ["10:00", "Cierre", "close"],
  ["19:00", "Ganadores", "winners"],
] as const;

const deliverables = [
  { icon: Users, value: "Equipo + contacto", note: "1–4 personas" },
  { icon: Sparkles, value: "Pitch", note: "≤ 280 caracteres" },
  { icon: Cloud, value: "Producto live", note: "URL desplegada" },
  { icon: FileVideo2, value: "Demo", note: "≤ 01:30" },
  { icon: GitBranch, value: "GitHub", note: "Repositorio público" },
  { icon: Radio, value: "Uso de Portal", note: "Explicación concreta" },
] as const;

function SlideNumber({ children }: { children: string }) {
  return <span className={styles.slideNumber}>{children}</span>;
}

function KickoffCountdown() {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  useEffect(() => {
    const updateCountdown = () => {
      setRemainingSeconds(
        Math.max(
          0,
          Math.ceil((KICKOFF_PRESENTATION_START - Date.now()) / 1000),
        ),
      );
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 250);
    return () => window.clearInterval(interval);
  }, []);

  const hours =
    remainingSeconds === null ? null : Math.floor(remainingSeconds / 3600);
  const minutes =
    remainingSeconds === null
      ? null
      : Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds === null ? null : remainingSeconds % 60;
  const parts = [hours, minutes, seconds].map((part) =>
    part === null ? "--" : String(part).padStart(2, "0"),
  );

  return (
    <div
      className={styles.countdownClock}
      role="timer"
      aria-label={
        remainingSeconds === 0
          ? "El kickoff comienza ahora"
          : `Faltan ${parts.join(":")} para el kickoff`
      }
    >
      {parts.map((part, index) => (
        <span key={["hours", "minutes", "seconds"][index]}>
          <strong>{part}</strong>
          <small>{["horas", "minutos", "segundos"][index]}</small>
        </span>
      ))}
    </div>
  );
}

function scrollToSlide(
  slides: (HTMLElement | null)[],
  index: number,
  behavior: ScrollBehavior = "smooth",
) {
  const next = Math.max(0, Math.min(TOTAL_SLIDES - 1, index));
  slides[next]?.scrollIntoView({ behavior });
}

export function KickoffDeck() {
  const [current, setCurrent] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsHovered = useRef(false);
  const currentSlide = useRef(0);
  const slides = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible) {
          const index = Number(visible.target.getAttribute("data-slide"));
          currentSlide.current = index;
          setCurrent(index);
        }
      },
      { threshold: [0.55, 0.75] },
    );

    for (const slide of slides.current) {
      if (slide) observer.observe(slide);
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("a, button")
      ) {
        return;
      }

      if (["ArrowDown", "ArrowRight", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        scrollToSlide(slides.current, currentSlide.current + 1, "auto");
      }
      if (["ArrowUp", "ArrowLeft", "PageUp"].includes(event.key)) {
        event.preventDefault();
        scrollToSlide(slides.current, currentSlide.current - 1, "auto");
      }
      if (event.key === "Home") scrollToSlide(slides.current, 0, "auto");
      if (event.key === "End")
        scrollToSlide(slides.current, TOTAL_SLIDES - 1, "auto");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    const hasMouse = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;

    if (!hasMouse) return;

    let hideTimer = 0;
    const showControls = () => {
      window.clearTimeout(hideTimer);
      setControlsVisible(true);
      hideTimer = window.setTimeout(() => {
        if (!controlsHovered.current) setControlsVisible(false);
      }, CONTROLS_IDLE_DELAY);
    };
    const onMouseMove = (event: MouseEvent) => {
      const isNearControls =
        event.clientX >= window.innerWidth - CONTROLS_TRIGGER_WIDTH &&
        event.clientY >= window.innerHeight - CONTROLS_TRIGGER_HEIGHT;

      if (isNearControls) showControls();
    };

    showControls();
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    return () => {
      window.clearTimeout(hideTimer);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <main className={styles.deck} lang="es">
      <section
        className={`${styles.slide} ${styles.countdownSlide}`}
        data-slide="0"
        ref={(node) => {
          slides.current[0] = node;
        }}
      >
        <div className={styles.topline}>
          <span>Portal × Crafter Station</span>
          <span>07.08.26 · Lima</span>
        </div>
        <div className={styles.countdownBody}>
          <p className={styles.kicker}>The Realtime Hackathon</p>
          <h1>Empezamos en</h1>
          <KickoffCountdown />
          <p className={styles.countdownStart}>KICKOFF · 19:10 · UTC−5</p>
        </div>
      </section>

      <section
        className={`${styles.slide} ${styles.opening}`}
        data-slide="1"
        ref={(node) => {
          slides.current[1] = node;
        }}
      >
        <div className={styles.topline}>
          <span>Portal × Crafter Station</span>
          <span>07.08.26 · Lima</span>
        </div>
        <div className={styles.openingBody}>
          <p className={styles.kicker}>The Realtime Hackathon</p>
          <h1>
            Construyan algo
            <br />
            que esté <em>vivo.</em>
          </h1>
          <div className={styles.openingStats}>
            <strong>39H</strong>
            <span>07 → 09 AGO</span>
          </div>
        </div>
        <div className={styles.scrollCue} aria-hidden="true">
          <ArrowDown />
          <span>Comenzar</span>
        </div>
      </section>

      <section
        className={`${styles.slide} ${styles.light}`}
        data-slide="2"
        ref={(node) => {
          slides.current[2] = node;
        }}
      >
        <SlideNumber>01 / EL RETO</SlideNumber>
        <div className={styles.challengeGrid}>
          <div className={styles.oldModel}>
            <span className={styles.modelLabel}>IA ESTÁTICA</span>
            <div className={styles.singleFlow} aria-hidden="true">
              <span>Prompt</span>
              <ArrowRight />
              <span>Respuesta</span>
            </div>
            <p>Solo cambia cuando alguien pregunta.</p>
          </div>
          <div className={styles.newModel}>
            <span className={styles.modelLabel}>IA REALTIME</span>
            <h2>
              Algo pasa.
              <br />
              El producto responde.
            </h2>
            <div className={styles.liveInputs}>
              <span>
                <Users />
                Personas
              </span>
              <span>
                <Bot />
                Agentes
              </span>
              <span>
                <DatabaseZap />
                Datos live
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        className={styles.slide}
        data-slide="3"
        ref={(node) => {
          slides.current[3] = node;
        }}
      >
        <SlideNumber>02 / LA FÓRMULA</SlideNumber>
        <div className={styles.formula}>
          <div>
            <Sparkles />
            <strong>IA</strong>
          </div>
          <span>+</span>
          <div>
            <Wifi />
            <strong>Realtime</strong>
          </div>
          <span>=</span>
          <div className={styles.ship}>
            <Rocket />
            <strong>Producto</strong>
          </div>
        </div>
        <p className={styles.bottomStatement}>
          Funcional. Desplegado. Demostrable.
        </p>
      </section>

      <section
        className={`${styles.slide} ${styles.light}`}
        data-slide="4"
        ref={(node) => {
          slides.current[4] = node;
        }}
      >
        <SlideNumber>03 / PORTAL</SlideNumber>
        <div className={styles.networkWrap}>
          <h2 className={styles.portalPromise}>La vía rápida al realtime.</h2>
          <div className={styles.network}>
            <span className={`${styles.networkNode} ${styles.nodePeople}`}>
              <Users />
              Personas
            </span>
            <span className={`${styles.networkNode} ${styles.nodeAgents}`}>
              <Bot />
              Agentes
            </span>
            <span className={`${styles.networkNode} ${styles.nodeApps}`}>
              <Code2 />
              Apps
            </span>
            <span className={`${styles.networkNode} ${styles.nodeData}`}>
              <DatabaseZap />
              Datos live
            </span>
            <span className={styles.portalCore}>
              <Image
                src="/brand-assets/brand/logos/portal-dark.svg"
                width={1014}
                height={1014}
                alt="Portal"
              />
            </span>
            <svg viewBox="0 0 600 380" role="presentation">
              <path d="M300 190L105 75M300 190L495 75M300 190L105 305M300 190L495 305" />
            </svg>
          </div>
          <div className={styles.capabilities}>
            <span>Presence</span>
            <span>Chat</span>
            <span>Sync</span>
            <span>Signals</span>
            <span>Location</span>
          </div>
        </div>
      </section>

      <section
        className={styles.slide}
        data-slide="5"
        ref={(node) => {
          slides.current[5] = node;
        }}
      >
        <SlideNumber>04 / 39 HORAS</SlideNumber>
        <div className={styles.timelineHeader}>
          <h2>Viernes 19:00</h2>
          <ArrowDown aria-hidden="true" />
          <h2>Domingo 10:00</h2>
        </div>
        <ol className={styles.timeline}>
          {schedule.map(([time, label, id], index) => (
            <li
              key={id}
              className={
                index === 0 || index === 4 ? styles.milestone : undefined
              }
            >
              <span className={styles.timelineDot} />
              <time>{time}</time>
              <strong>{label}</strong>
            </li>
          ))}
        </ol>
        <p className={styles.timezone}>Todos los horarios · UTC−5 · Lima</p>
      </section>

      <section
        className={`${styles.slide} ${styles.light}`}
        data-slide="6"
        ref={(node) => {
          slides.current[6] = node;
        }}
      >
        <SlideNumber>05 / LA ENTREGA</SlideNumber>
        <div className={styles.sectionHeading}>
          <h2>Seis piezas.</h2>
          <span>DOM · 10:00</span>
        </div>
        <div className={styles.deliverables}>
          {deliverables.map(({ icon: Icon, value, note }) => (
            <article key={value}>
              <Icon aria-hidden="true" />
              <strong>{value}</strong>
              <span>{note}</span>
            </article>
          ))}
        </div>
      </section>

      <section
        className={styles.slide}
        data-slide="7"
        ref={(node) => {
          slides.current[7] = node;
        }}
      >
        <SlideNumber>06 / ELEGIBILIDAD</SlideNumber>
        <div className={styles.countsGrid}>
          <div className={styles.countsYes}>
            <p>
              <Check />
              Producto funcional
            </p>
            <p>
              <Check />
              Interacción realtime real
            </p>
            <p>
              <Check />
              Commits dentro de la ventana
            </p>
          </div>
          <div className={styles.countsNo}>
            <p>
              <X />
              Solo una idea o slides
            </p>
            <p>
              <X />
              Prototipo sin desplegar
            </p>
            <p>
              <X />
              Repositorio privado
            </p>
          </div>
        </div>
        <div className={styles.tagRule}>
          <GitBranch />
          <span>¿Producto existente?</span>
          <code>the-realtime-hackathon</code>
        </div>
      </section>

      <section
        className={`${styles.slide} ${styles.light}`}
        data-slide="8"
        ref={(node) => {
          slides.current[8] = node;
        }}
      >
        <SlideNumber>07 / PREMIOS</SlideNumber>
        <div className={styles.prizeLayout}>
          <div className={styles.prizeChart}>
            <div className={styles.donut}>
              <span>
                US$<strong>800</strong>
              </span>
            </div>
            <div className={styles.legend}>
              <p>
                <i />
                01 <strong>$500</strong>
              </p>
              <p>
                <i />
                02 <strong>$300</strong>
              </p>
            </div>
          </div>
          <div className={styles.judgingFocus}>
            <span>EL FOCO</span>
            <h2>Qué tan viva se siente la experiencia.</h2>
            <p>Demo live + video + repo + explicación.</p>
          </div>
        </div>
      </section>

      <section
        className={`${styles.slide} ${styles.finalSlide}`}
        data-slide="9"
        ref={(node) => {
          slides.current[9] = node;
        }}
      >
        <SlideNumber>08 / AHORA</SlideNumber>
        <div className={styles.finalBody}>
          <div className={styles.finalCopy}>
            <div className={styles.liveMark}>
              <span />
              LIVE
            </div>
            <h2>
              El reloj ya está <em>corriendo.</em>
            </h2>
            <p>Construyan algo vivo.</p>
          </div>
          <div className={styles.finalClock}>
            <strong>39H</strong>
            <span>VIE 19:00 → DOM 10:00</span>
          </div>
        </div>
        <div className={styles.finalFooter}>
          <div className={styles.finalActions}>
            <span>#announcements</span>
            <span>#soporte-portal</span>
            <a href={SUBMISSION_URL} target="_blank" rel="noopener noreferrer">
              Formulario de entrega <ExternalLink />
            </a>
          </div>
          <p className={styles.credit}>Portal × Crafter Station · 2026</p>
        </div>
      </section>

      <nav
        className={`${styles.controls} ${controlsVisible ? "" : styles.controlsHidden}`}
        aria-label="Navegación de la presentación"
        onMouseEnter={() => {
          controlsHovered.current = true;
          setControlsVisible(true);
        }}
        onMouseLeave={() => {
          controlsHovered.current = false;
        }}
      >
        <button
          type="button"
          onClick={() => scrollToSlide(slides.current, current - 1)}
          disabled={current === 0}
          aria-label="Slide anterior"
        >
          <ArrowUp />
        </button>
        <span>
          <strong>{String(current + 1).padStart(2, "0")}</strong> /{" "}
          {String(TOTAL_SLIDES).padStart(2, "0")}
        </span>
        <button
          type="button"
          onClick={() => scrollToSlide(slides.current, current + 1)}
          disabled={current === TOTAL_SLIDES - 1}
          aria-label="Siguiente slide"
        >
          <ArrowDown />
        </button>
      </nav>
      <div className={styles.progress} aria-hidden="true">
        <span
          style={{ transform: `scaleX(${(current + 1) / TOTAL_SLIDES})` }}
        />
      </div>
    </main>
  );
}
