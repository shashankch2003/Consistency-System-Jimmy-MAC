import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Target, Calendar, BarChart3, Eye, Lightbulb, Search, Layout, Zap, ChevronDown, CheckCircle2, Star, Play } from "lucide-react";
import { SiInstagram, SiLinkedin, SiYoutube } from "react-icons/si";
import { useRef, useState } from "react";
import founderImg from "@assets/1-1_1771668652217.png";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay: i * 0.15, ease: [0.25, 0.4, 0.25, 1] },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border border-white/[0.08] rounded-md overflow-hidden cursor-pointer"
      onClick={() => setOpen(!open)}
      data-testid={`faq-item-${question.slice(0, 20).replace(/\s/g, '-').toLowerCase()}`}
    >
      <div className="flex items-center justify-between px-6 py-5">
        <span className="font-semibold text-sm md:text-base text-white/90">{question}</span>
        <ChevronDown className={`w-5 h-5 text-white/40 transition-transform duration-300 shrink-0 ml-4 ${open ? "rotate-180" : ""}`} />
      </div>
      {open && (
        <div className="px-6 pb-5 text-sm text-white/40 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white selection:bg-emerald-500/20 overflow-x-hidden" data-testid="landing-page">
      <nav className="fixed w-full z-50 bg-[#0a0a0f]/80 backdrop-blur-2xl border-b border-white/[0.06]" data-testid="landing-nav">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">
              JM
            </div>
            <span className="text-lg font-display font-bold tracking-tight" data-testid="text-brand">Jimmy Mac</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
            <a href="#about" className="hover:text-white transition-colors duration-300" data-testid="link-nav-about">About</a>
            <a href="#system" className="hover:text-white transition-colors duration-300" data-testid="link-nav-system">System</a>
            <a href="#clarity-call" className="hover:text-white transition-colors duration-300" data-testid="link-nav-clarity-call">Clarity Call</a>
            <a href="#pricing" className="hover:text-white transition-colors duration-300" data-testid="link-nav-pricing">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors duration-300" data-testid="link-nav-faq">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button size="sm" className="bg-emerald-500 text-white font-semibold rounded-md" data-testid="button-dashboard">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <a href="#pricing">
                <Button size="sm" variant="outline" className="border-emerald-500 text-emerald-400 font-semibold rounded-md bg-transparent" data-testid="button-book-call-nav">
                  Book a Call <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </a>
            )}
          </div>
        </div>
      </nav>

      <section ref={heroRef} className="relative min-h-screen flex items-center pt-16" data-testid="hero-section">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.03] via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={3}
          className="absolute bottom-16 left-6 lg:left-16 hidden lg:block z-10"
          data-testid="widget-focus-score"
        >
          <div className="w-48 rounded-2xl border border-white/[0.08] bg-[#0d0d14]/90 backdrop-blur-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] text-white/40 uppercase tracking-[0.2em]">Focus Score</span>
            </div>
            <div className="text-4xl font-display font-bold text-emerald-400 mb-0.5">87%</div>
            <div className="text-[11px] text-white/30">+12% from last week</div>
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={2}
          className="absolute top-28 right-6 lg:right-16 hidden lg:block z-10"
          data-testid="widget-daily-tracker"
        >
          <div className="w-52 rounded-2xl border border-white/[0.08] bg-[#0d0d14]/90 backdrop-blur-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] text-white/40 uppercase tracking-[0.2em]">Daily Tracker</span>
            </div>
            <div className="space-y-2">
              <div className="h-2 rounded-full bg-white/[0.06]">
                <div className="h-full w-[85%] rounded-full bg-emerald-500/60" />
              </div>
              <div className="h-2 rounded-full bg-white/[0.06]">
                <div className="h-full w-[65%] rounded-full bg-emerald-500/40" />
              </div>
              <div className="h-2 rounded-full bg-white/[0.06]">
                <div className="h-full w-[45%] rounded-full bg-emerald-500/25" />
              </div>
            </div>
          </div>
          <div className="absolute -right-10 top-1/2 -translate-y-1/2 flex flex-col gap-2">
            <div className="w-8 h-8 rounded-lg border border-white/[0.08] bg-[#0d0d14]/90 flex items-center justify-center">
              <Target className="w-3.5 h-3.5 text-white/30" />
            </div>
            <div className="w-8 h-8 rounded-lg border border-white/[0.08] bg-[#0d0d14]/90 flex items-center justify-center">
              <BarChart3 className="w-3.5 h-3.5 text-white/30" />
            </div>
            <div className="w-8 h-8 rounded-lg border border-white/[0.08] bg-[#0d0d14]/90 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5 text-white/30" />
            </div>
          </div>
        </motion.div>

        <div className="max-w-6xl mx-auto px-6 lg:px-8 w-full py-20">
          <motion.div
            style={{ opacity: heroOpacity, scale: heroScale }}
            className="flex flex-col items-center"
          >
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.05] text-sm text-emerald-400 mb-10"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SYSTEMS FOR A DISTRACTED WORLD
            </motion.div>

            <motion.h1
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.8rem] xl:text-7xl font-display font-bold tracking-tight leading-[1.15] mb-6 text-center"
            >
              Helping You be <span className="text-emerald-400 underline decoration-emerald-500 underline-offset-[6px] decoration-[3px]">Productive</span> &<br />
              Reach Your <span className="text-emerald-400 underline decoration-emerald-500 underline-offset-[6px] decoration-[3px]">Goals</span> Through<br />
              <span className="underline decoration-emerald-500 underline-offset-[6px] decoration-[3px]">Systems</span> in a Distracted World
            </motion.h1>

            <motion.p
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={2}
              className="text-base md:text-lg text-white/40 max-w-2xl mb-10 leading-relaxed text-center"
            >
              If you can't see where your time is going, you'll never be consistent with where your life is going
            </motion.p>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={3}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Button
                size="lg"
                className="bg-emerald-500 text-white rounded-md font-semibold"
                onClick={() => window.location.href = "/api/login"}
                data-testid="button-get-system"
              >
                Get the System <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <a href="#clarity-call">
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-white/70 rounded-md bg-transparent"
                  data-testid="button-book-clarity"
                >
                  Book a Clarity Call <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section id="about" className="py-24 md:py-32 relative" data-testid="about-section">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-4 block">THE STORY</span>
            <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight">About Me</h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="flex flex-col md:flex-row gap-12 md:gap-16 items-start"
          >
            <motion.div variants={fadeUp} className="md:w-2/5 shrink-0 mx-auto md:mx-0">
              <div className="w-full max-w-sm rounded-2xl overflow-hidden border border-white/[0.08]">
                <img
                  src={founderImg}
                  alt="Shashidhar - Founder"
                  className="w-full aspect-square object-cover"
                  data-testid="img-founder"
                />
              </div>
            </motion.div>

            <motion.div variants={fadeUp} custom={1} className="md:w-3/5 space-y-5">
              <p className="text-white/70 leading-relaxed">
                Hi, my name is Shashidhar, and I like to go by <span className="text-emerald-400 font-semibold italic">Jimmy</span>.
              </p>
              <p className="text-white/50 leading-relaxed text-sm">
                Three years ago, my life had no real direction. I was constantly distracted, addicted to social media, smoking, drinking, and wasting time on things that gave short-term comfort but no long-term progress. I didn't lack ambition — I lacked <strong className="text-white/70">clarity, systems, and guidance</strong>.
              </p>
              <p className="text-white/70 font-medium">I didn't give up.</p>
              <p className="text-white/50 leading-relaxed text-sm">
                Over the last three years, I spent thousands of hours researching, experimenting, and rebuilding my life from the ground up. I read more than <strong className="text-white/70">100 books</strong> on focus, productivity, mindset, wealth, and systems — not just to consume information, but to apply what actually works in real life.
              </p>
              <p className="text-white/70 font-medium">What I learned changed everything.</p>
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={fadeUp}
            className="mt-20 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 md:p-12"
          >
            <div className="flex flex-col md:flex-row gap-10 items-center">
              <div className="md:w-2/5 shrink-0 flex justify-center">
                <div className="w-48 h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden border border-white/[0.08]">
                  <img
                    src={founderImg}
                    alt="Jimmy Mac"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="md:w-3/5 space-y-5">
                <p className="text-white/40 text-sm">What I learned changed everything.</p>
                <div className="pl-5 relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-full" />
                  <p className="text-xl md:text-2xl font-display font-bold leading-snug">
                    Consistency doesn't come from motivation. It comes from systems.
                  </p>
                </div>
                <p className="text-white/50 leading-relaxed text-sm">
                  I am the Founder of <span className="text-emerald-400 font-semibold italic">Jimmy Mac</span>, a startup focused on helping individuals improve productivity and maintain deep focus through structured systems, enabling them to achieve their personal and professional goals efficiently.
                </p>
                <p className="text-white/50 leading-relaxed text-sm">
                  In addition to my entrepreneurial work, I am also actively involved in cryptocurrency trading.
                </p>
                <p className="text-white/50 leading-relaxed text-sm">
                  This consistency system and 1-1 clarity call exist for one simple reason:
                </p>
                <p className="text-white/50 leading-relaxed text-sm">
                  I want to help people who feel stuck, overwhelmed, or inconsistent — not with hype or motivation, but with clear, practical systems that respect real life.
                </p>
                <p className="text-white/70 font-semibold">
                  If you're tired of starting over, you're in the right place.
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Founder</div>
                    <div className="text-xs text-emerald-400">Jimmy Mac</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <motion.div variants={fadeUp} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-[10px] uppercase tracking-widest text-emerald-400 mb-1">2 YEARS AGO</div>
              <div className="font-semibold text-sm">Lost & Distracted</div>
            </motion.div>
            <motion.div variants={fadeUp} custom={1} className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-6 text-center">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                <Target className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-[10px] uppercase tracking-widest text-emerald-400 mb-1">TODAY</div>
              <div className="font-semibold text-sm">Systems That Work</div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section id="system" className="py-24 md:py-32 relative" data-testid="system-section">
        <div className="absolute inset-0 -z-10 bg-white/[0.01]" />
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="text-center mb-6"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-4 block">THE FRAMEWORK</span>
            <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight">Consistency System</h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="flex flex-col md:flex-row gap-12 mt-16"
          >
            <motion.div variants={fadeUp} className="md:w-1/2 space-y-5">
              <p className="text-white/50 leading-relaxed text-sm">You could write habits and goals on paper.</p>
              <p className="text-white/50 leading-relaxed text-sm">But paper doesn't show you patterns.</p>
              <p className="text-white/50 leading-relaxed text-sm">
                Most systems look simple from the outside. This one is simple, <strong className="text-white/80">only until you see how everything connects.</strong>
              </p>
              <p className="text-white/50 leading-relaxed text-sm">What you write each day turns into patterns.</p>
              <p className="text-white/50 leading-relaxed text-sm">What feels random becomes visible.</p>
              <p className="text-white/50 leading-relaxed text-sm">
                And once you can see your habits, focus, and time clearly, staying consistent stops feeling confusing.
              </p>
              <p className="text-white/50 leading-relaxed text-sm">This isn't something you understand by reading about it.</p>
              <p className="text-white/80 font-semibold">You understand it when you see it.</p>
              <p className="text-white/50 leading-relaxed text-sm">Watch the video to see how everything works inside the system.</p>
              <Button
                className="bg-emerald-500 text-white rounded-md font-semibold mt-4"
                onClick={() => window.location.href = "/api/login"}
                data-testid="button-get-system-2"
              >
                Get the Consistency System <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>

            <motion.div variants={fadeUp} custom={1} className="md:w-1/2">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] aspect-video flex items-center justify-center relative overflow-hidden">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center cursor-pointer" data-testid="button-play-video">
                  <Play className="w-7 h-7 text-emerald-400 ml-1" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-emerald-500/10 border-t border-emerald-500/20 px-4 py-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-emerald-400">Video coming soon</span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={fadeUp}
            className="mt-24"
          >
            <h3 className="text-2xl md:text-3xl font-display font-bold text-center mb-12">How Everything Connects</h3>
            <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {[
                { icon: Target, label: "Goals", desc: "Define what you want to achieve" },
                { icon: Calendar, label: "Habits", desc: "Daily actions that compound" },
                { icon: BarChart3, label: "Execution", desc: "Track your daily progress" },
                { icon: Eye, label: "Awareness", desc: "See patterns in your behavior" },
                { icon: Lightbulb, label: "Clarity", desc: "Understand what works for you" },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  variants={fadeUp}
                  custom={i}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 text-center hover-elevate"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                    <item.icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="font-semibold text-sm mb-1">{item.label}</div>
                  <div className="text-xs text-white/35">{item.desc}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section id="clarity-call" className="py-24 md:py-32 relative" data-testid="clarity-call-section">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-4 block">PRIVATE ADVISORY</span>
            <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight">Clarity Call</h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="flex flex-col lg:flex-row gap-12"
          >
            <motion.div variants={fadeUp} className="lg:w-1/2 space-y-5">
              <p className="text-white/50 leading-relaxed text-[15px]">
                You've been trying to change for a while now. Weeks turned into months but there is no change.
              </p>
              <p className="text-white/50 leading-relaxed text-[15px]">
                You sit down to plan, but distractions pull you in different directions. Some days you feel motivated, other days completely lost. You want focus and clarity, but you're not sure what to fix first or how to stay consistent.
              </p>
              <p className="text-white/50 leading-relaxed text-[15px]">
                If this feels familiar, you're not alone — I was in the same place before.
              </p>
              <p className="text-white/50 leading-relaxed text-[15px]">
                In this one-to-one call, we'll create a clear plan for what to focus on, how to build structure into your days, and how to slowly reduce the habits and addictions that keep pulling you off track — so you leave with direction, not confusion.
              </p>
              <div className="flex flex-wrap gap-3 pt-4">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-xs text-white/50">
                  <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  45 Minutes 1-on-1
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-xs text-white/50">
                  <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="m7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Private & Confidential
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-xs text-white/50">
                  <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  Actionable Clarity
                </span>
              </div>
              <div className="flex items-center gap-3 pt-4">
                <div className="flex -space-x-1.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-[#0a0a0f]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-[#0a0a0f]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-[#0a0a0f]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold">Limited Slots Available</div>
                  <div className="text-[11px] text-white/30">Book before they fill up</div>
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} custom={1} className="lg:w-1/2">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8">
                <h3 className="text-xl font-display font-bold mb-8">The Process</h3>
                <div className="space-y-8">
                  {[
                    { step: "STEP 01", icon: Search, title: "Diagnose", desc: "Identify what's really holding you back" },
                    { step: "STEP 02", icon: Layout, title: "Plan", desc: "Create a clear roadmap for your goals" },
                    { step: "STEP 03", icon: Zap, title: "Build", desc: "Implement systems that work for your life" },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                        <item.icon className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 mb-1">{item.step}</div>
                        <div className="font-bold text-base mb-1">{item.title}</div>
                        <div className="text-sm text-white/40">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  className="w-full bg-emerald-500 text-white rounded-xl font-semibold mt-10"
                  size="lg"
                  data-testid="button-book-clarity-call"
                >
                  Book Your Clarity Call <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <p className="text-xs text-white/30 text-center mt-3">No commitment required • 100% Confidential</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section id="pricing" className="py-24 md:py-32 relative" data-testid="pricing-section">
        <div className="absolute inset-0 -z-10 bg-white/[0.01]" />
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-4 block">INVESTMENT</span>
            <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-4">Choose Your Path</h2>
            <p className="text-white/40 max-w-xl mx-auto text-sm">
              Start building systems that work. No subscriptions, no hidden fees.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <motion.div variants={fadeUp} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-7 flex flex-col">
              <div>
                <h3 className="text-lg font-semibold mb-1">Consistency System</h3>
                <p className="text-xs text-white/40 mb-5">The complete productivity system</p>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-display font-bold">&#8377;999</span>
                  <span className="text-sm text-white/25 line-through">&#8377;4,999</span>
                </div>
                <p className="text-[10px] uppercase tracking-widest text-emerald-400 mb-6">ONE-TIME PAYMENT</p>
                <div className="space-y-3 mb-8">
                  {[
                    "Full Consistency System Access",
                    "Goal Setting Framework",
                    "Daily Habit Tracker",
                    "Weekly Review Templates",
                    "Progress Analytics",
                    "Lifetime Updates",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-sm text-white/60">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-auto">
                <Button
                  variant="outline"
                  className="w-full border-white/15 text-white/70 rounded-md font-semibold bg-transparent"
                  onClick={() => window.location.href = "/api/login"}
                  data-testid="button-buy-system"
                >
                  Get the System <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} custom={1} className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.03] p-7 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-emerald-500 text-xs font-semibold text-white">
                BEST POPULAR
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Bundle Deal</h3>
                <p className="text-xs text-white/40 mb-5">Consistency System + 1-1 Clarity Call</p>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-display font-bold">&#8377;1,999</span>
                  <span className="text-sm text-white/25 line-through">&#8377;5,999</span>
                </div>
                <p className="text-[10px] uppercase tracking-widest text-emerald-400 mb-6">ONE-TIME PAYMENT</p>
                <div className="space-y-3 mb-8">
                  {[
                    "Everything in Consistency System",
                    "1-on-1 Clarity Call (45 min)",
                    "Personalized Action Plan",
                    "Priority Support",
                    "Custom System Setup Help",
                    "50% Savings",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-sm text-white/60">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-auto">
                <Button
                  className="w-full bg-emerald-500 text-white rounded-md font-semibold"
                  onClick={() => window.location.href = "/api/login"}
                  data-testid="button-buy-bundle"
                >
                  Get the Bundle <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} custom={2} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-7 flex flex-col">
              <div>
                <h3 className="text-lg font-semibold mb-1">Clarity Call</h3>
                <p className="text-xs text-white/40 mb-5">Private 1-on-1 consultation</p>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-display font-bold">&#8377;2,999</span>
                  <span className="text-sm text-white/25 line-through">&#8377;4,999</span>
                </div>
                <p className="text-[10px] uppercase tracking-widest text-emerald-400 mb-6">ONE-TIME PAYMENT</p>
                <div className="space-y-3 mb-8">
                  {[
                    "45-Minute 1-on-1 Session",
                    "Personalized Problem Diagnosis",
                    "Custom Action Plan",
                    "Habit Reduction Strategy",
                    "Follow-up Notes",
                    "Priority Scheduling",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-sm text-white/60">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-auto">
                <Button
                  variant="outline"
                  className="w-full border-white/15 text-white/70 rounded-md font-semibold bg-transparent"
                  data-testid="button-buy-call"
                >
                  Book a Call <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="py-24 md:py-32 relative" data-testid="testimonials-section">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-4 block">SOCIAL PROOF</span>
            <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-4">Success Stories</h2>
            <p className="text-white/40 text-sm">Real transformations from real people</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {[
              {
                quote: "Your success story could be here. Join the community of people building systems that work.",
                name: "Coming Soon",
                role: "Future Client",
                initial: "C",
                color: "bg-emerald-500",
              },
              {
                quote: "Transform your productivity and share your journey. Real results from real people.",
                name: "Your Story",
                role: "Next Success",
                initial: "Y",
                color: "bg-emerald-500",
              },
              {
                quote: "Be among the first to experience the Consistency System and share your transformation.",
                name: "Be First",
                role: "Early Adopter",
                initial: "B",
                color: "bg-orange-500",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6"
              >
                <div className="flex gap-0.5 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                  ))}
                </div>
                <p className="text-sm text-white/50 leading-relaxed mb-6">"{item.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${item.color} flex items-center justify-center text-xs font-bold text-white`}>
                    {item.initial}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{item.name}</div>
                    <div className="text-xs text-white/30">{item.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
          <div className="text-center mt-8">
            <p className="text-sm text-white/30">
              Want to share your story? <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline underline-offset-4 hover:text-emerald-300">Reach out on Instagram</a>
            </p>
          </div>
        </div>
      </section>

      <section id="faq" className="py-24 md:py-32 relative" data-testid="faq-section">
        <div className="absolute inset-0 -z-10 bg-white/[0.01]" />
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-4 block">QUESTIONS</span>
            <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-4">Frequently Asked Questions</h2>
            <p className="text-white/40 text-sm">Everything you need to know before getting started</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="space-y-3"
          >
            {[
              {
                q: "What is the Consistency System?",
                a: "The Consistency System is a complete digital productivity framework that helps you track goals, habits, tasks, and time — all in one place. It connects everything so you can see your patterns and build real consistency."
              },
              {
                q: "How is this different from other productivity tools?",
                a: "Unlike fragmented apps, the Consistency System connects goals, habits, daily tasks, and hourly tracking into one unified system. You see how everything connects and impacts your progress."
              },
              {
                q: "What happens in a Clarity Call?",
                a: "It's a private 45-minute 1-on-1 session where we diagnose what's holding you back, create a custom action plan, and set up systems that work for your specific situation."
              },
              {
                q: "Do I need both the System and the Clarity Call?",
                a: "Not necessarily. The System works on its own for self-starters. The Clarity Call is ideal if you want personalized guidance. The Bundle combines both at 50% savings."
              },
              {
                q: "Is this a subscription?",
                a: "No. All plans are one-time payments. You pay once and get lifetime access with all future updates included."
              },
              {
                q: "What if it doesn't work for me?",
                a: "The system is designed to be practical and actionable. If you follow the framework consistently, you will see results. We're confident in what we've built."
              },
              {
                q: "How do I access the system after purchase?",
                a: "After purchase, you'll receive immediate access to the Consistency System through your account. You can start using all features right away."
              },
              {
                q: "Can I get a refund?",
                a: "Due to the digital nature of the product and instant access, we don't offer refunds. But we're committed to helping you get results."
              },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp} custom={i * 0.5}>
                <FAQItem question={item.q} answer={item.a} />
              </motion.div>
            ))}
          </motion.div>

          <div className="text-center mt-10">
            <p className="text-sm text-white/30">
              Still have questions? <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline underline-offset-4 hover:text-emerald-300">DM me on Instagram</a>
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] py-16" data-testid="footer">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-20 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                  JM
                </div>
                <span className="font-display font-bold text-lg">Jimmy Mac</span>
              </div>
              <p className="text-sm text-white/35 leading-relaxed mb-6">
                Helping you be productive and reach your goals through systems in a distracted world.
              </p>
              <div className="flex items-center gap-3">
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center text-white/40 hover-elevate" data-testid="link-instagram">
                  <SiInstagram className="w-4 h-4" />
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center text-white/40 hover-elevate" data-testid="link-linkedin">
                  <SiLinkedin className="w-4 h-4" />
                </a>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center text-white/40 hover-elevate" data-testid="link-youtube">
                  <SiYoutube className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-4">Quick Links</h4>
              <div className="space-y-2.5">
                <a href="#about" className="block text-sm text-white/40">About</a>
                <a href="#system" className="block text-sm text-white/40">Consistency System</a>
                <a href="#clarity-call" className="block text-sm text-white/40">Clarity Call</a>
                <a href="#pricing" className="block text-sm text-white/40">Pricing</a>
                <a href="#faq" className="block text-sm text-white/40">FAQ</a>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-4">Legal</h4>
              <div className="space-y-2.5">
                <a href="#" className="block text-sm text-white/40">Terms & Conditions</a>
                <a href="#" className="block text-sm text-white/40">Refund Policy</a>
                <a href="#" className="block text-sm text-white/40">Privacy Policy</a>
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/20">
              &copy; 2026 jimmymac.in - All rights reserved
            </p>
            <p className="text-xs text-white/20">
              BUILT WITH SYSTEMS. DRF 8917367130
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
