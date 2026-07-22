import {
  Activity,
  ArrowUpIcon,
  Bell,
  CalendarDays,
  Globe2,
  History,
  Megaphone,
  PackageCheck,
  Radio,
  RadioTower,
  Rocket,
  Send,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import { ExternalLinkIcon } from "@/components/ui/external-link-icon";
import { IconLabel } from "@/components/ui/icon-label";
import { KeyboardNavigation } from "./components/keyboard-navigation";
import { ParticleCountdown } from "./components/particle-countdown";
import { ParticleTrophy } from "./components/particle-trophy";
import { SignalEngine } from "./components/signal-engine";
import { TrackParticles } from "./components/track-particles";

const registrationUrl = "https://luma.com/realtime-hackathon";

const tracks = [
  {
    name: "CO-OP AI",
    description: "People and agents sharing one live workspace.",
    icon: Users,
  },
  {
    name: "LIVE SYSTEMS",
    description: "Products that act on changing data.",
    icon: Activity,
  },
  {
    name: "CROWD MODE",
    description: "Experiences shaped by the audience.",
    icon: RadioTower,
  },
  {
    name: "WILD SIGNAL",
    description: "Realtime experiments without a category.",
    icon: Sparkles,
  },
];

const trackSlides = [tracks.slice(0, 2), tracks.slice(2)];

const portalCapabilities = [
  { label: "Channels", icon: RadioTower },
  { label: "Presence", icon: Users },
  { label: "History", icon: History },
  { label: "Broadcast", icon: Megaphone },
  { label: "Direct sends", icon: Send },
  { label: "In-app alerts", icon: Bell },
];

const schedule = [
  {
    day: "FRI",
    date: "AUG 07",
    isoDate: "2026-08-07",
    title: "CONNECT",
    icon: Radio,
    items: [
      ["19:00", "Kickoff"],
      ["20:00", "Portal Quick Start with Rodrigo"],
      ["21:00", "Build window opens"],
    ],
  },
  {
    day: "SUN",
    date: "AUG 09",
    isoDate: "2026-08-09",
    title: "SHIP",
    icon: Rocket,
    items: [
      ["00:00", "Submissions open"],
      ["10:00", "Submissions close"],
      ["19:00", "Top five showcase and winners announcement, live on Discord"],
    ],
  },
];

const judging = [
  { label: "Realtime + Portal", weight: 30 },
  { label: "Useful AI behavior", weight: 20 },
  { label: "Execution + reliability", weight: 20 },
  { label: "Originality + value", weight: 15 },
  { label: "UX + accessibility", weight: 10 },
  { label: "Demo clarity", weight: 5 },
] as const;

const faqs = [
  {
    question: "Who can join?",
    answer: "Developers and technical builders can join online from anywhere.",
    icon: Globe2,
  },
  {
    question: "Do I need a team?",
    answer:
      "No. Build solo or with up to three teammates. Team matching opens before kickoff.",
    icon: Users,
  },
  {
    question: "What must I build?",
    answer:
      "A working product where Portal powers a visible realtime interaction and AI changes the experience.",
    icon: Workflow,
  },
  {
    question: "What do I submit?",
    answer:
      "A live URL or reproducible demo, a two-minute video, a repo with commit history, and a short technical note. English or Spanish is fine.",
    icon: PackageCheck,
  },
];

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <KeyboardNavigation />

      <main id="main-content">
        <section className="hero hero--landing" id="top">
          <SignalEngine />

          <div className="shell hero-landing__masthead">
            <h1 className="hero-landing__title">
              <span>THE</span>
              <span className="hero-landing__slash">REALTIME</span>
              <span>HACKATHON</span>
            </h1>
            <p className="hero-landing__meta">
              <IconLabel icon={CalendarDays} tone="accent">
                AUG 07-09 2026
              </IconLabel>
              <IconLabel icon={Globe2} tone="muted">
                ONLINE / UTC-5
              </IconLabel>
              <IconLabel icon={Users} size="sm" tone="muted">
                Teams of 1-4
              </IconLabel>
            </p>
          </div>

          <div className="hero-landing__action">
            <a
              className={buttonVariants({
                size: "lg",
                className:
                  "external-link external-link--collapse hero-landing__cta",
              })}
              href={registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Register free
              <ExternalLinkIcon collapse />
            </a>
          </div>
        </section>

        {trackSlides.map((slideTracks, slideIndex) => {
          const headingId = `tracks-title-${slideIndex + 1}`;

          return (
            <section
              className={`missions-section missions-section--visual-${
                slideIndex === 0 ? "right" : "left"
              }`}
              id={slideIndex === 0 ? "tracks" : `tracks-${slideIndex + 1}`}
              aria-labelledby={headingId}
              key={slideTracks[0].name}
            >
              <div className="shell missions-slide">
                <div className="section-heading-row section-heading-row--missions">
                  <h2 id={headingId}>Pick a track</h2>
                </div>

                <TrackParticles
                  variant={slideIndex === 0 ? "cooperative" : "crowd"}
                />

                <div className="mission-list">
                  {slideTracks.map((track) => {
                    const Icon = track.icon;
                    return (
                      <article
                        className="content-box content-box--standard mission"
                        key={track.name}
                      >
                        <h3>
                          <IconLabel
                            appearance="inherit"
                            className="content-box__title"
                            icon={Icon}
                          >
                            {track.name}
                          </IconLabel>
                        </h3>
                        <p className="content-box__description">
                          {track.description}
                        </p>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}

        <section className="portal-section" aria-labelledby="portal-title">
          <div className="shell">
            <div className="section-heading-row">
              <h2 id="portal-title">Use Portal Ship realtime</h2>
            </div>

            <ul className="capability-list" aria-label="Portal capabilities">
              {portalCapabilities.map((capability) => {
                const Icon = capability.icon;
                return (
                  <li
                    className="content-box content-box--standard"
                    key={capability.label}
                  >
                    <IconLabel
                      appearance="inherit"
                      className="content-box__title"
                      icon={Icon}
                    >
                      {capability.label}
                    </IconLabel>
                  </li>
                );
              })}
            </ul>

            <a
              className="external-link external-link--collapse external-link--lined portal-docs-link"
              href="https://docs.useportal.co/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Read Portal docs
              <ExternalLinkIcon collapse />
            </a>
          </div>
        </section>

        <section className="schedule-section" id="schedule">
          <div className="shell">
            <div className="schedule-heading">
              <div>
                <h2>
                  <span>39-hour</span> schedule
                </h2>
                <p className="eyebrow">All times in Lima / UTC-5</p>
              </div>
            </div>

            <div className="schedule-grid">
              {schedule.map((day) => {
                const Icon = day.icon;
                return (
                  <article className="content-box schedule-day" key={day.day}>
                    <header className="schedule-day__header">
                      <div className="schedule-day__date">
                        <span>{day.day}</span>
                        <time dateTime={day.isoDate}>{day.date}</time>
                      </div>
                      <div className="schedule-day__phase">
                        <h3>
                          <IconLabel
                            appearance="inherit"
                            className="content-box__title"
                            icon={Icon}
                          >
                            {day.title}
                          </IconLabel>
                        </h3>
                      </div>
                    </header>
                    <ol>
                      {day.items.map(([time, label]) => (
                        <li key={`${day.day}-${time}`}>
                          <time dateTime={`${day.isoDate}T${time}:00-05:00`}>
                            {time}
                          </time>
                          <span className="content-box__description">
                            {label}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="prizes-section" id="prizes" aria-label="Prizes">
          <ParticleTrophy />
          <dl className="prize-slide__awards">
            <div>
              <dt>First place</dt>
              <dd>US$500</dd>
            </div>
            <div>
              <dt>Second place</dt>
              <dd>US$300</dd>
            </div>
          </dl>
        </section>

        <section
          className="judging-section"
          id="judging"
          aria-labelledby="judging-title"
        >
          <div className="shell judging-slide">
            <header className="judging-slide__header">
              <h2 id="judging-title">Evaluation criteria</h2>
            </header>

            <ol className="judging-slide__list">
              {judging.map((criterion) => (
                <li key={criterion.label}>
                  <span>{criterion.label}</span>
                  <strong>{criterion.weight}%</strong>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="faq-section" id="faq">
          <div className="shell editorial-grid">
            <h2>FAQ</h2>
            <Accordion className="faq-list" defaultValue={[]}>
              {faqs.map((faq, index) => {
                const Icon = faq.icon;
                return (
                  <AccordionItem key={faq.question} value={`faq-${index}`}>
                    <AccordionTrigger>
                      <IconLabel appearance="inherit" icon={Icon} size="lg">
                        {faq.question}
                      </IconLabel>
                    </AccordionTrigger>
                    <AccordionContent>{faq.answer}</AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        </section>

        <section className="apply-section" id="apply">
          <div className="shell apply-section__inner">
            <h2>Build it live</h2>
            <div className="apply-section__action">
              <a
                className={buttonVariants({
                  variant: "outline",
                  className:
                    "external-link external-link--collapse apply-section__cta",
                })}
                href={registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Register free
                <ExternalLinkIcon collapse />
              </a>
            </div>
          </div>
        </section>

        <ParticleCountdown
          footer={
            <footer className="site-footer">
              <div className="shell site-footer__bottom">
                <a
                  className="external-link external-link--collapse external-link--lined"
                  href="https://crafter.run"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  By Crafter Station
                  <ExternalLinkIcon collapse />
                </a>
                <div>
                  <a
                    className="external-link external-link--collapse external-link--lined"
                    href="https://useportal.co/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Portal
                    <ExternalLinkIcon collapse />
                  </a>
                  <a
                    className="external-link external-link--collapse external-link--lined"
                    href="https://docs.useportal.co/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Docs
                    <ExternalLinkIcon collapse />
                  </a>
                </div>
                <a href="#top">
                  <IconLabel trailingIcon={ArrowUpIcon}>Back to top</IconLabel>
                </a>
              </div>
            </footer>
          }
        />
      </main>
    </>
  );
}
