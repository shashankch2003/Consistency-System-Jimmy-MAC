import { useAuth } from "@/hooks/use-auth";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight, Target, BarChart3, Brain, Zap, ChevronDown,
  CheckCircle2, Menu, X, TrendingUp, Shield, Layers,
  Activity, Sparkles, Eye, Clock, Wifi
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: [0.25, 0.4, 0.25, 1] },
  }),
};
const stagger = { visible: { transition: { staggerChildren: 0.09 } } };

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border border-white/[0.08] rounded-2xl overflow-hidden cursor-pointer select-none"
      onClick={() => setOpen(!open)}
      data-testid={`faq-${q.slice(0, 12).replace(/\s/g, "-").toLowerCase()}`}
    >
      <div className="flex items-center justify-between px-5 py-4">
        <span className="font-semibold text-sm text-white/85">{q}</span>
        <ChevronDown className={`w-4 h-4 text-white/30 transition-transform duration-300 shrink-0 ml-4 ${open ? "rotate-180" : ""}`} />
      </div>
      {open && (
        <div className="px-5 pb-5 text-sm text-white/40 leading-relaxed border-t border-white/[0.05]">
          {a}
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  const [nav, setNav] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale  = useTransform(scrollYProgress, [0, 0.5], [1, 0.96]);

  const enter = () => {
    window.location.href = user ? "/dashboard" : "/api/login";
  };

  return (
    <div className="min-h-screen bg-[#06060c] text-white overflow-x-hidden selection:bg-emerald-500/20" data-testid="landing-page">

      {/* ── NAV ─────────────────────────────── */}
      <nav className="fixed w-full z-50 bg-[#06060c]/88 backdrop-blur-2xl border-b border-white/[0.06]" data-testid="landing-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">

          {/* logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center font-bold text-xs shrink-0">
              CS
            </div>
            <span className="font-bold tracking-tight text-base" data-testid="text-brand">Consistency System</span>
          </div>

          {/* desktop links */}
          <div className="hidden md:flex items-center gap-7 text-sm text-white/40">
            {[["#problem","Problem"],["#solution","Solution"],["#features","Features"],["#vision","Vision"]].map(([href,label]) => (
              <a key={href} href={href} className="hover:text-white transition-colors">{label}</a>
            ))}
          </div>

          {/* cta + hamburger */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl px-5"
              onClick={enter}
              data-testid="button-enter-nav"
            >
              Enter
            </Button>
            <button
              className="md:hidden p-1.5 rounded-lg text-white/50"
              onClick={() => setNav(!nav)}
              data-testid="button-mobile-menu"
            >
              {nav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {nav && (
          <div className="md:hidden border-t border-white/[0.06] bg-[#06060c]/95 backdrop-blur-2xl px-5 py-4 space-y-1" data-testid="mobile-menu">
            {[["#problem","Problem"],["#solution","Solution"],["#features","Features"],["#vision","Vision"]].map(([href,label]) => (
              <a key={href} href={href} onClick={() => setNav(false)} className="block text-sm text-white/50 py-2.5">{label}</a>
            ))}
          </div>
        )}
      </nav>

      {/* ── HERO ────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center pt-14 sm:pt-16 overflow-hidden" data-testid="hero-section">

        {/* ambient glow */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-emerald-500/8 blur-[130px]" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-green-600/6 blur-[100px]" />
        </div>

        {/* floating widget — left */}
        <motion.div
          initial="hidden" animate="visible" variants={fadeUp} custom={5}
          className="absolute bottom-24 left-6 lg:left-16 hidden lg:block z-10"
          data-testid="widget-focus"
        >
          <div className="w-52 rounded-2xl border border-white/[0.08] bg-[#0c0c15]/90 backdrop-blur-sm p-4 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-white/35 uppercase tracking-[0.2em]">Focus Score</span>
            </div>
            <div className="text-4xl font-bold text-emerald-400 mb-1">87%</div>
            <div className="text-[11px] text-white/25 mb-3">↑ 12% from last week</div>
            <div className="h-1.5 rounded-full bg-white/[0.06]">
              <div className="h-full w-[87%] rounded-full bg-gradient-to-r from-emerald-500 to-green-400" />
            </div>
          </div>
        </motion.div>

        {/* floating widget — right */}
        <motion.div
          initial="hidden" animate="visible" variants={fadeUp} custom={4}
          className="absolute top-32 right-6 lg:right-16 hidden lg:block z-10"
          data-testid="widget-execution"
        >
          <div className="w-52 rounded-2xl border border-white/[0.08] bg-[#0c0c15]/90 backdrop-blur-sm p-4 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-white/35 uppercase tracking-[0.2em]">Daily Execution</span>
            </div>
            <div className="space-y-2">
              {[82, 65, 91, 48, 74].map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-emerald-500/55" style={{ width: `${v}%` }} />
                  </div>
                  <span className="text-[10px] text-white/25 w-7 text-right">{v}%</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* hero copy */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20 sm:py-28">
          <motion.div style={{ opacity: heroOpacity, scale: heroScale }} className="flex flex-col items-center text-center">

            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/[0.06] text-xs text-emerald-400 mb-8"
            >
              <Sparkles className="w-3 h-3" />
              AI EXECUTION SYSTEM FOR CONSISTENCY
            </motion.div>

            <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1}
              className="text-[2rem] sm:text-5xl md:text-[3.5rem] lg:text-[4.5rem] font-bold tracking-tight leading-[1.1] mb-5 max-w-4xl"
            >
              Stop Getting Distracted.{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                Start Executing.
              </span>
            </motion.h1>

            <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2}
              className="text-base sm:text-lg text-white/38 max-w-2xl mb-10 leading-relaxed"
            >
              Consistency System is an AI-powered execution system that helps you take action,
              stay focused, and finally follow through on your goals — every single day.
            </motion.p>

            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3}
              className="flex flex-col sm:flex-row gap-3 items-center"
            >
              <Button
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl px-10 text-base h-12 shadow-lg shadow-emerald-900/40"
                onClick={enter}
                data-testid="button-enter-hero"
              >
                Enter
              </Button>
              <a href="#solution">
                <Button size="lg" variant="outline"
                  className="border-white/10 text-white/55 rounded-2xl bg-transparent h-12 px-7 text-base"
                  data-testid="button-see-how"
                >
                  See how it works <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </a>
            </motion.div>

            <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={4}
              className="text-xs text-white/18 mt-6"
            >
              Free to start · No credit card required
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ── PROBLEM ─────────────────────────── */}
      <section id="problem" className="py-20 sm:py-32 relative" data-testid="problem-section">
        <div className="absolute inset-0 -z-10 bg-white/[0.012]" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}
            className="text-center mb-14"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-4 block">THE REAL PROBLEM</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
              You don't lack discipline.<br />
              <span className="text-white/28">You're constantly distracted.</span>
            </h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-14"
          >
            {[
              { emoji: "📱", text: "Social media consumes hours without you noticing" },
              { emoji: "🔁", text: "You start your day with plans but lose focus fast" },
              { emoji: "😔", text: "You feel guilty at night for wasting another day" },
              { emoji: "❓", text: "You don't know what to do next to reach your goal" },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp} custom={i}
                className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-4"
                data-testid={`problem-${i}`}
              >
                <span className="text-2xl shrink-0">{item.emoji}</span>
                <span className="text-white/55 text-sm sm:text-[15px] leading-snug">{item.text}</span>
              </motion.div>
            ))}
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={fadeUp}
            className="text-center rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.04] p-8 sm:p-12"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-6">
              <Brain className="w-7 h-7 text-emerald-400" />
            </div>
            <p className="text-xl sm:text-2xl font-bold mb-2">This is not a motivation problem.</p>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-400">It's a system problem.</p>
          </motion.div>
        </div>
      </section>

      {/* ── SOLUTION ────────────────────────── */}
      <section id="solution" className="py-20 sm:py-32" data-testid="solution-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}
            className="text-center mb-14"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-4 block">THE SOLUTION</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
              An AI system that helps<br />you execute
            </h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {[
              { icon: Brain,       title: "AI Execution Plans",      desc: "AI creates a personalized daily execution plan based on your goals and schedule." },
              { icon: Activity,    title: "Real Productivity Tracking", desc: "Tracks actual deep work vs distracted time — not fake checklists." },
              { icon: Eye,         title: "Distraction Detection",   desc: "Identifies where your time is wasted and shows exactly what's pulling you off track." },
              { icon: Zap,         title: "AI Insights & Feedback",  desc: "Analyzes your behavior patterns and gives actionable improvement suggestions daily." },
              { icon: Shield,      title: "Built-in Accountability", desc: "Streaks, progress loops, and reports that ensure you never silently fall off track." },
              { icon: TrendingUp,  title: "Compound Growth",         desc: "Small daily wins tracked and stacked into visible, measurable long-term progress." },
            ].map((card, i) => (
              <motion.div key={i} variants={fadeUp} custom={i}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 hover:border-emerald-500/30 hover:bg-emerald-500/[0.03] transition-all duration-300"
                data-testid={`solution-card-${i}`}
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-4">
                  <card.icon className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="font-bold text-sm mb-2">{card.title}</h3>
                <p className="text-xs text-white/38 leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────── */}
      <section className="py-20 sm:py-32 relative" data-testid="how-it-works-section">
        <div className="absolute inset-0 -z-10 bg-white/[0.012]" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}
            className="text-center mb-14"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-4 block">THE PROCESS</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">How It Works</h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={stagger}
            className="relative space-y-5"
          >
            {/* connector line */}
            <div className="absolute left-[19px] sm:left-[23px] top-5 bottom-5 w-px bg-gradient-to-b from-emerald-500/40 via-emerald-500/15 to-transparent hidden sm:block" />

            {[
              { n: "01", title: "Set your goal",                  desc: "Define what you want to achieve — long-term vision broken into concrete milestones." },
              { n: "02", title: "AI creates your daily plan",      desc: "The system automatically generates a focused, realistic execution plan for each day." },
              { n: "03", title: "System tracks your real activity", desc: "Log your actual focused work hours, habits, and task completions honestly." },
              { n: "04", title: "AI analyzes your behaviour",      desc: "Get insights into your distraction patterns, time wasters, and peak focus windows." },
              { n: "05", title: "You improve with daily feedback", desc: "Personalized recommendations help you get better every single day — not just on Mondays." },
            ].map((step, i) => (
              <motion.div key={i} variants={fadeUp} custom={i}
                className="flex items-start gap-5 sm:gap-7"
                data-testid={`step-${step.n}`}
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-sm shrink-0 z-10 shadow-lg shadow-emerald-900/50">
                  {step.n}
                </div>
                <div className="flex-1 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                  <h3 className="font-bold text-sm mb-1">{step.title}</h3>
                  <p className="text-xs text-white/38 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────── */}
      <section id="features" className="py-20 sm:py-32" data-testid="features-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}
            className="text-center mb-14"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-4 block">WHAT'S INSIDE</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">Key Features</h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {[
              { icon: Brain,    label: "AI Daily Planner",            desc: "Auto-generates an optimized daily schedule tailored to your goals and energy." },
              { icon: Activity, label: "Deep Work Tracking",           desc: "Separate focused deep work sessions from shallow, distracted activity." },
              { icon: Eye,      label: "Distraction Detection",        desc: "Spots and flags time wasted on distractions before it adds up." },
              { icon: Wifi,     label: "App & Website Blocking",       desc: "Block distracting apps and sites during focus sessions automatically." },
              { icon: BarChart3,label: "Productivity Insights",        desc: "Real-time dashboard showing exactly where you win and where you lose time." },
              { icon: Clock,    label: "Daily + Weekly Reports",       desc: "Automated progress reports with trends, streaks, and actionable next steps." },
            ].map((f, i) => (
              <motion.div key={i} variants={fadeUp} custom={i}
                className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 hover:border-emerald-500/35 hover:bg-emerald-500/[0.03] transition-all duration-300"
                data-testid={`feature-${i}`}
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-500/12 group-hover:bg-emerald-500/20 flex items-center justify-center mb-4 transition-colors">
                  <f.icon className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="font-bold text-sm mb-2">{f.label}</h3>
                <p className="text-xs text-white/35 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── COMPARISON ──────────────────────── */}
      <section className="py-20 sm:py-32 relative" data-testid="comparison-section">
        <div className="absolute inset-0 -z-10 bg-white/[0.012]" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}
            className="text-center mb-14"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-4 block">DIFFERENTIATION</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Not another productivity tool</h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp}>
            <div className="rounded-3xl border border-white/[0.08] overflow-hidden">
              <div className="grid grid-cols-3 bg-white/[0.03] border-b border-white/[0.06] text-center">
                <div className="px-4 py-3.5 text-xs text-white/30 font-medium">Category</div>
                <div className="px-4 py-3.5 text-xs text-white/30 font-medium border-x border-white/[0.06]">Others</div>
                <div className="px-4 py-3.5 text-xs text-emerald-400 font-bold">Consistency System</div>
              </div>
              {[
                { label: "Approach",     others: "Require discipline",      us: "Guides execution" },
                { label: "Tracking",     others: "Tasks only",              us: "Real behaviour" },
                { label: "Distraction",  others: "Doesn't solve it",        us: "Detects & reduces" },
                { label: "AI",           others: "Basic or absent",         us: "Core of the system" },
                { label: "Consistency",  others: "You figure it out",       us: "Built-in improvement" },
              ].map((row, i) => (
                <div key={i} className={`grid grid-cols-3 text-center border-b border-white/[0.05] last:border-0 ${i % 2 === 0 ? "bg-white/[0.01]" : ""}`} data-testid={`compare-row-${i}`}>
                  <div className="px-4 py-4 text-xs text-white/35 font-medium">{row.label}</div>
                  <div className="px-4 py-4 text-xs text-white/28 border-x border-white/[0.05] flex items-center justify-center gap-1.5">
                    <X className="w-3 h-3 text-red-400/45 shrink-0" /> {row.others}
                  </div>
                  <div className="px-4 py-4 text-xs text-emerald-300 font-medium flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> {row.us}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── VISION ──────────────────────────── */}
      <section id="vision" className="py-20 sm:py-32 relative overflow-hidden" data-testid="vision-section">
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-emerald-500/7 blur-[120px]" />
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}>
            <span className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-6 block">OUR VISION</span>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-green-600 flex items-center justify-center mx-auto mb-8 shadow-lg shadow-emerald-900/40">
              <Layers className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-6">
              We are building the execution layer<br />
              <span className="text-emerald-400">for human potential</span>
            </h2>
            <p className="text-white/38 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
              Our goal is to help millions of people stop wasting time and start achieving what they truly want — not with hype or motivation, but with a system that actually works.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────── */}
      <section className="py-20 sm:py-32 relative" data-testid="faq-section">
        <div className="absolute inset-0 -z-10 bg-white/[0.012]" />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}
            className="text-center mb-12"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-4 block">FAQ</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Common Questions</h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={stagger}
            className="space-y-3"
          >
            {[
              { q: "Who is this for?",                   a: "Students, early professionals, and small business owners who are ambitious but struggle with consistency, distraction, and follow-through." },
              { q: "How is this different from Notion?", a: "Notion is a blank canvas — you build the system. Consistency System IS the system. It tracks your actual execution, detects distraction, and improves your consistency automatically." },
              { q: "Does it use real AI?",               a: "Yes. The AI powers your daily plan generation, behavioral analysis, distraction insights, and personalized feedback — not just sorting a to-do list." },
              { q: "How fast will I see results?",       a: "Most users notice a meaningful shift within the first 2–3 weeks of consistent daily use. The system gets smarter the more you use it." },
              { q: "Is my data private?",                a: "Yes. Your productivity data is stored securely and never shared or sold. You own your data." },
            ].map(({ q, a }) => <FAQItem key={q} q={q} a={a} />)}
          </motion.div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────── */}
      <section className="py-24 sm:py-36 relative overflow-hidden" data-testid="cta-section">
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-emerald-600/10 blur-[120px]" />
        </div>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/[0.06] text-xs text-emerald-400 mb-8">
              <Sparkles className="w-3 h-3" />
              START TODAY
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-4">
              Your goals don't need<br />more planning.
            </h2>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-400 mb-8">They need execution.</p>
            <Button
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl px-14 text-lg h-14 shadow-xl shadow-emerald-900/40"
              onClick={enter}
              data-testid="button-enter-cta"
            >
              Enter
            </Button>
            <p className="text-xs text-white/18 mt-4">Free to start · No credit card needed</p>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-8 px-4" data-testid="footer">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center font-bold text-[10px]">CS</div>
            <span className="text-sm font-bold">Consistency System</span>
          </div>
          <p className="text-xs text-white/22">© {new Date().getFullYear()} Consistency System. Built for execution.</p>
          <div className="flex items-center gap-5 text-xs text-white/25">
            <a href="#" className="hover:text-white/55 transition-colors">Privacy</a>
            <a href="#" className="hover:text-white/55 transition-colors">Terms</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
