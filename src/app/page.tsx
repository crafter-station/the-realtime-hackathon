import {
  Activity,
  ArrowDownIcon,
  ArrowDownRightIcon,
  ArrowUpIcon,
  ArrowUpRight,
  Bell,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  Clock3,
  Code2,
  Globe2,
  History,
  Medal,
  Megaphone,
  PackageCheck,
  Radio,
  RadioTower,
  RefreshCw,
  Rocket,
  Send,
  Server,
  Sparkles,
  Trophy,
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
import { IconLabel, labelVariants } from "@/components/ui/icon-label";
import { ParticleCountdown } from "./components/particle-countdown";
import { SignalEngine } from "./components/signal-engine";

const registrationUrl = "https://luma.com/realtime-hackathon";

const eventFacts = [
  { icon: Clock3, value: "39H", label: "Build window" },
  { icon: Globe2, value: "Online", label: "UTC-5" },
  { icon: Users, value: "1-4", label: "Builders / team" },
  { icon: Trophy, value: "$800", label: "Cash prizes" },
];

const missions = [
  {
    id: "01",
    name: "CO-OP AI",
    description: "People and agents sharing one live workspace.",
    icon: Users,
  },
  {
    id: "02",
    name: "LIVE SYSTEMS",
    description: "Products that act on changing data.",
    icon: Activity,
  },
  {
    id: "03",
    name: "CROWD MODE",
    description: "Experiences shaped by the audience.",
    icon: RadioTower,
  },
  {
    id: "04",
    name: "WILD SIGNAL",
    description: "Realtime experiments without a category.",
    icon: Sparkles,
  },
];

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
    title: "CONNECT",
    icon: Radio,
    items: [
      ["19:00", "Kickoff"],
      ["20:00", "Portal quick start"],
      ["21:00", "Build opens"],
    ],
  },
  {
    day: "SAT",
    date: "AUG 08",
    title: "BUILD",
    icon: Code2,
    items: [
      ["09:00", "Portal clinic"],
      ["12:00", "Checkpoint"],
      ["16:00", "Product + AI clinic"],
      ["20:00", "Bug bash"],
    ],
  },
  {
    day: "SUN",
    date: "AUG 09",
    title: "SHIP",
    icon: Rocket,
    items: [
      ["00:00", "Submissions open"],
      ["10:00", "Code freeze"],
      ["12:30", "Live finals"],
      ["13:40", "Awards"],
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
            </p>
          </div>

          <div className="hero-landing__action">
            <a
              className={buttonVariants({
                size: "lg",
                className: "hero-landing__cta",
              })}
              href={registrationUrl}
              target="_blank"
              rel="noreferrer"
            >
              Register free
              <ArrowDownRightIcon data-icon="inline-end" aria-hidden="true" />
            </a>
            <small>
              <IconLabel icon={Users} size="sm" tone="muted">
                Teams of 1-4
              </IconLabel>
            </small>
          </div>

          <a
            className="hero-landing__scroll"
            href="#event-details"
            aria-label="Explore event details"
          >
            <ArrowDownIcon aria-hidden="true" />
          </a>
        </section>

        <section
          className="hero-details"
          id="event-details"
          aria-labelledby="event-details-title"
        >
          <div className="shell hero-details__intro">
            <div>
              <p
                className={labelVariants({
                  tone: "accent",
                  className: "hero-details__kicker",
                })}
              >
                39 HOURS / ONE WEEKEND
              </p>
              <h2 id="event-details-title">Build it live. Ship by Sunday.</h2>
            </div>
          </div>

          <ul className="shell facts" aria-label="Event facts">
            {eventFacts.map((fact) => {
              const Icon = fact.icon;
              return (
                <li className="fact" key={fact.label}>
                  <IconLabel icon={Icon} tone="accent">
                    {fact.label}
                  </IconLabel>
                  <span className="fact__value">{fact.value}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section
          className="signal-flow-section"
          aria-labelledby="signal-flow-title"
        >
          <div className="shell">
            <div className="section-heading-row">
              <h2 id="signal-flow-title">Build the loop.</h2>
              <p className="section-note">
                <IconLabel icon={Workflow} tone="muted">
                  AI decides. Portal syncs.
                </IconLabel>
              </p>
            </div>

            <ol className="signal-flow">
              <li>
                <IconLabel
                  appearance="inherit"
                  className="signal-flow__heading"
                  icon={Radio}
                  size="lg"
                >
                  <strong>INPUT</strong>
                </IconLabel>
                <span>People + live data</span>
              </li>
              <li>
                <IconLabel
                  appearance="inherit"
                  className="signal-flow__heading"
                  icon={BrainCircuit}
                  size="lg"
                >
                  <strong>REASON</strong>
                </IconLabel>
                <span>AI decides</span>
              </li>
              <li>
                <IconLabel
                  appearance="inherit"
                  className="signal-flow__heading"
                  icon={Send}
                  size="lg"
                >
                  <strong>ACT</strong>
                </IconLabel>
                <span>Portal syncs</span>
              </li>
              <li>
                <IconLabel
                  appearance="inherit"
                  className="signal-flow__heading"
                  icon={RefreshCw}
                  size="lg"
                >
                  <strong>REPEAT</strong>
                </IconLabel>
                <span>State updates live</span>
              </li>
            </ol>
          </div>
        </section>

        <section className="missions-section" id="missions">
          <div className="shell">
            <div className="section-heading-row section-heading-row--missions">
              <h2>Pick a track.</h2>
              <p className="section-note">
                <IconLabel icon={Sparkles} tone="muted">
                  Starting points, not limits.
                </IconLabel>
              </p>
            </div>

            <div className="mission-list">
              {missions.map((mission) => {
                const Icon = mission.icon;
                return (
                  <article className="mission" key={mission.name}>
                    <span
                      className={labelVariants({
                        tone: "accent",
                        className: "mission__index",
                      })}
                    >
                      M-{mission.id}
                    </span>
                    <h3>
                      <IconLabel appearance="inherit" icon={Icon} size="lg">
                        {mission.name}
                      </IconLabel>
                    </h3>
                    <p className="mission__summary">{mission.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="portal-section" aria-labelledby="portal-title">
          <div className="shell">
            <div className="section-heading-row">
              <h2 id="portal-title">Use Portal. Ship realtime.</h2>
              <p className="section-note">
                <IconLabel icon={Server} tone="muted">
                  AI backend + Portal live layer.
                </IconLabel>
              </p>
            </div>

            <ul className="capability-list" aria-label="Portal capabilities">
              {portalCapabilities.map((capability) => {
                const Icon = capability.icon;
                return (
                  <li key={capability.label}>
                    <IconLabel icon={Icon}>{capability.label}</IconLabel>
                  </li>
                );
              })}
            </ul>

            <a
              className="portal-docs-link"
              href="https://docs.useportal.co/"
              target="_blank"
              rel="noreferrer"
            >
              <IconLabel icon={BookOpen} trailingIcon={ArrowUpRight}>
                Read Portal docs
              </IconLabel>
            </a>
          </div>
        </section>

        <section className="schedule-section" id="schedule">
          <div className="shell">
            <div className="section-heading-row">
              <h2>39-hour schedule.</h2>
              <p className="section-note">
                <IconLabel icon={Clock3} tone="muted">
                  All times UTC-5 / Lima.
                </IconLabel>
              </p>
            </div>

            <div className="schedule-grid">
              {schedule.map((day) => {
                const Icon = day.icon;
                return (
                  <article className="schedule-day" key={day.day}>
                    <div className="schedule-day__header">
                      <div>
                        <span>{day.day}</span>
                        <span>{day.date}</span>
                      </div>
                      <strong>
                        <IconLabel icon={Icon} tone="accent">
                          {day.title}
                        </IconLabel>
                      </strong>
                    </div>
                    <ol>
                      {day.items.map(([time, label]) => (
                        <li key={`${day.day}-${time}`}>
                          <time>{time}</time>
                          <span>{label}</span>
                        </li>
                      ))}
                    </ol>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="prizes-section" id="prizes">
          <div className="shell">
            <div className="prize-grid">
              <div className="prize-copy">
                <h2>
                  <IconLabel appearance="inherit" icon={Trophy} size="xl">
                    Prizes.
                  </IconLabel>
                </h2>
              </div>
              <div className="prize-card prize-card--first">
                <IconLabel icon={Trophy} iconTone="current">
                  First place
                </IconLabel>
                <strong>US$500</strong>
              </div>
              <div className="prize-card">
                <IconLabel icon={Medal}>Second place</IconLabel>
                <strong>US$300</strong>
              </div>
            </div>

            <section className="judging" aria-labelledby="judging-title">
              <div className="judging__header">
                <h3 id="judging-title">Judging criteria</h3>
                <p className={labelVariants({ tone: "muted" })}>
                  100 points total
                </p>
              </div>

              <ul className="judging__list">
                {judging.map((criterion) => {
                  return (
                    <li key={criterion.label}>
                      <span>{criterion.label}</span>
                      <strong>{criterion.weight}%</strong>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </section>

        <section className="faq-section" id="faq">
          <div className="shell editorial-grid">
            <h2>FAQ.</h2>
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
            <h2>Build it live.</h2>
            <div className="apply-section__action">
              <a
                className={buttonVariants({
                  variant: "inverse",
                  size: "lg",
                  className: "w-full",
                })}
                href={registrationUrl}
                target="_blank"
                rel="noreferrer"
              >
                Register free
                <ArrowDownRightIcon data-icon="inline-end" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        <ParticleCountdown />
      </main>

      <footer className="site-footer">
        <div className="shell site-footer__bottom">
          <span>PORTAL x CRAFTER STATION</span>
          <div>
            <a href="https://useportal.co/" target="_blank" rel="noreferrer">
              <IconLabel trailingIcon={ArrowUpRight}>Portal</IconLabel>
            </a>
            <a
              href="https://docs.useportal.co/"
              target="_blank"
              rel="noreferrer"
            >
              <IconLabel trailingIcon={ArrowUpRight}>Docs</IconLabel>
            </a>
          </div>
          <a href="#top">
            <IconLabel trailingIcon={ArrowUpIcon}>Back to top</IconLabel>
          </a>
        </div>
      </footer>
    </>
  );
}
