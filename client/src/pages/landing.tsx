import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight, Target, Calendar, BarChart3, Brain, Zap, ChevronDown,
  CheckCircle2, Play, Menu, X, TrendingUp, Clock, Shield, Layers,
  Activity, Star, Users, Sparkles
} from "lucide-react";
import { useRef, useState } from "react";
import founderImg from "@assets/1-1_1771668652217.png";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, delay: i * 0.12, ease: [0.25, 0.4, 0.25, 1] },
  }),
};

const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border border-white/[0.08] rounded-2xl overflow-hidden cursor-pointer"
      onClick={() => setOpen(!open)}
      data-testid={`faq-${question.slice(0, 15).replace(/\s/g, "-").toLowerCase()}`}
    >
      <div className="flex items-center justify-between px-5 py-4 sm:py-5">
        <span className="font-semibold text-sm md:text-base text-white/90">{question}</span>
        <ChevronDown className={`w-5 h-5 text-white/30 transition-transform duration-300 shrink-0 ml-4 ${open ? "rotate-180" : ""}`} />
      </div>
      {open && (
        <div className="px-5 pb-5 text-sm text-white/40 leading-relaxed border-t border-white/[0.05]">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.96]);

  const enterApp = () => {
    if (user) {
      window.location.href = "/dashboard";
    } else {
      window.location.href = "/api/login";
    }
  };

  return (
    <div className="min-h-screen bg-[#07070d] text-white selection:bg-violet-500/20 overflow-x-hidden" data-testid="landing-page">

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav className="fixed w-full z-50 bg-[#07070d]/85 backdrop-blur-2xl border-b border-white/[0.06]" data-testid="landing-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
              CS
            </div>
            <span className="text-base font-bold tracking-tight" data-testid="text-brand">Consistency System</span>
          </div>

          <div className="hidden md:flex items-center gap-7 text-sm text-white/45">
            <a href="#problem" className="hover:text-white transition-colors">Problem</a>
            <a href="#solution" className="hover:text-white transition-colors">Solution</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#vision" className="hover:text-white transition-colors">Vision</a>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl px-5 text-sm"
              onClick={enterApp}
              data-testid="button-enter-nav"
            >
              Enter
            </Button>
            <button
              className="md:hidden p-1.5 rounded-lg text-white/50"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/[0.06] bg-[#07070d]/95 backdrop-blur-2xl px-5 py-4 space-y-3" data-testid="mobile-menu">
            {["problem", "solution", "features", "vision"].map(id => (
              <a key={id} href={`#${id}`} onClick={() => setMobileMenuOpen(false)} className="block text-sm text-white/50 py-2 capitalize">{id}</a>
            ))}
          </div>
        )}
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center pt-14 sm:pt-16 overflow-hidden" data-testid="hero-section">
        {/* background glow */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-violet-600/10 blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-indigo-600/8 blur-[100px]" />
        </div>

        {/* floating widgets */}
        <motion.div
          initial="hidden" animate="visible" variants={fadeUp} custom={4}
          className="absolute bottom-20 left-6 lg:left-16 hidden lg:block z-10"
          data-testid="widget-focus-score"
        >
          <div className="w-52 rounded-2xl border border-white/[0.08] bg-[#0d0d18]/90 backdrop-blur-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-[10px] text-white/35 uppercase tracking-[0.2em]">Focus Score</span>
            </div>
            <div className="text-4xl font-bold text-violet-400 mb-0.5">87%</div>
            <div className="text-[11px] text-white/25">↑ 12% from last week</div>
            <div className="mt-3 h-1.5 rounded-full bg-white/[0.06]">
              <div className="h-full w-[87%] rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial="hidden" animate="visible" variants={fadeUp} custom={3}
          className="absolute top-28 right-6 lg:right-16 hidden lg:block z-10"
          data-testid="widget-streaks"
        >
          <div className="w-52 rounded-2xl border border-white/[0.08] bg-[#0d0d18]/90 backdrop-blur-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-[10px] text-white/35 uppercase tracking-[0.2em]">Daily Execution</span>
            </div>
            <div className="space-y-1.5">
              {[85, 65, 90, 50, 78].map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-14 h-1.5 rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-violet-500/60" style={{ width: `${v}%` }} />
                  </div>
                  <span className="text-[10px] text-white/25">{v}%</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-16 sm:py-24">
          <motion.div style={{ opacity: heroOpacity, scale: heroScale }} className="flex flex-col items-center text-center">

            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/25 bg-violet-500/[0.06] text-xs text-violet-400 mb-8"
            >
              <Sparkles className="w-3 h-3" />
              EXECUTION SYSTEM FOR CONSISTENCY
            </motion.div>

            <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1}
              className="text-[2rem] sm:text-5xl md:text-6xl lg:text-[4.5rem] font-bold tracking-tight leading-[1.1] mb-6 max-w-4xl"
            >
              Stop Planning.{" "}
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                Start Executing.
              </span>
            </motion.h1>

            <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2}
              className="text-base sm:text-lg text-white/40 max-w-2xl mb-10 leading-relaxed"
            >
              Consistency System turns your goals into daily action, tracks real productivity,
              and keeps you accountable — automatically.
            </motion.p>

            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3}
              className="flex flex-col sm:flex-row gap-3 items-center"
            >
              <Button
                size="lg"
                className="bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-2xl px-8 text-base h-12"
                onClick={enterApp}
                data-testid="button-enter-hero"
              >
                Enter
              </Button>
              <a href="#solution">
                <Button size="lg" variant="outline"
                  className="border-white/12 text-white/60 rounded-2xl bg-transparent h-12 px-7 text-base"
                  data-testid="button-see-how"
                >
                  See how it works <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </a>
            </motion.div>

            <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={4}
              className="text-xs text-white/20 mt-6"
            >
              Free to start · No credit card required
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ── PROBLEM ──────────────────────────────────────────────────── */}
      <section id="problem" className="py-20 sm:py-32 relative" data-testid="problem-section">
        <div className="absolute inset-0 -z-10 bg-white/[0.01]" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}
            className="text-center mb-14"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-violet-400 mb-4 block">THE REAL PROBLEM</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
              You don't have a<br />
              <span className="text-white/30">discipline problem.</span>
            </h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-14"
          >
            {[
              { emoji: "🔁", text: "You start things but don't finish them" },
              { emoji: "😤", text: "You feel busy but not actually productive" },
              { emoji: "❓", text: "You don't know what to focus on daily" },
              { emoji: "⚡", text: "You depend on motivation, not systems" },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp} custom={i}
                className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-4"
                data-testid={`problem-item-${i}`}
              >
                <span className="text-2xl shrink-0">{item.emoji}</span>
                <span className="text-white/60 text-sm sm:text-base">{item.text}</span>
              </motion.div>
            ))}
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp}
            className="text-center rounded-3xl border border-violet-500/20 bg-violet-500/[0.04] p-8 sm:p-12"
          >
            <div className="w-14 h-14 rounded-2xl bg-violet-500/15 flex items-center justify-center mx-auto mb-6">
              <Brain className="w-7 h-7 text-violet-400" />
            </div>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold leading-snug mb-3">
              You don't need more motivation.
            </p>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-violet-400">
              You need a system.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── SOLUTION ─────────────────────────────────────────────────── */}
      <section id="solution" className="py-20 sm:py-32" data-testid="solution-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}
            className="text-center mb-14"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-violet-400 mb-4 block">THE SOLUTION</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
              An execution system built<br />for real life
            </h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {[
              { icon: Target, title: "Goals → Daily Steps", desc: "Converts your big goals into concrete, daily actionable tasks automatically." },
              { icon: BarChart3, title: "Real Productivity Tracking", desc: "Tracks actual execution — not fake checklists. See where your time really goes." },
              { icon: Activity, title: "Deep Work Analysis", desc: "Separates focused deep work from wasted, distracted time with clear visualizations." },
              { icon: Brain, title: "AI-Powered Guidance", desc: "Get personalized daily plans and improvement suggestions powered by AI." },
              { icon: Shield, title: "Built-in Accountability", desc: "Automatic streaks, progress reports, and social accountability to keep you on track." },
              { icon: TrendingUp, title: "Compound Growth", desc: "Small daily wins compound into massive results over weeks and months." },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp} custom={i}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 hover:border-violet-500/30 hover:bg-violet-500/[0.03] transition-all duration-300"
                data-testid={`solution-card-${i}`}
              >
                <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="font-bold text-base mb-2">{item.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="py-20 sm:py-32 relative" data-testid="how-it-works-section">
        <div className="absolute inset-0 -z-10 bg-white/[0.01]" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}
            className="text-center mb-16"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-violet-400 mb-4 block">THE PROCESS</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">How It Works</h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={stagger}
            className="relative"
          >
            <div className="absolute left-[19px] sm:left-[23px] top-4 bottom-4 w-px bg-gradient-to-b from-violet-500/40 via-violet-500/20 to-transparent hidden sm:block" />
            <div className="space-y-6">
              {[
                { n: "01", title: "Set your goal", desc: "Define what you want to achieve — long-term vision broken into monthly and weekly outcomes." },
                { n: "02", title: "System breaks it into execution", desc: "The system automatically converts your goal into specific daily tasks and habits." },
                { n: "03", title: "Track real work", desc: "Log your actual deep work hours, task completion, and habits — manually or automatically." },
                { n: "04", title: "Get AI insights", desc: "Receive personalized feedback on your patterns, bottlenecks, and improvement areas." },
                { n: "05", title: "Stay consistent", desc: "Accountability loops, streaks, and social features ensure you never fall off track again." },
              ].map((step, i) => (
                <motion.div key={i} variants={fadeUp} custom={i}
                  className="flex items-start gap-5 sm:gap-7"
                  data-testid={`step-${step.n}`}
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-violet-600 flex items-center justify-center font-bold text-sm shrink-0 z-10">
                    {step.n}
                  </div>
                  <div className="flex-1 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                    <h3 className="font-bold text-base mb-1">{step.title}</h3>
                    <p className="text-sm text-white/40 leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section id="features" className="py-20 sm:py-32" data-testid="features-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}
            className="text-center mb-14"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-violet-400 mb-4 block">WHAT'S INSIDE</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">Key Features</h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {[
              { icon: Brain, label: "AI Daily Planner", desc: "Auto-generates your optimized daily schedule based on goals and energy levels." },
              { icon: BarChart3, label: "Productivity Dashboard", desc: "Real-time analytics showing exactly where you're excelling and falling behind." },
              { icon: Activity, label: "Deep Work Tracker", desc: "Separate your deep focused work from distracted shallow tasks." },
              { icon: Target, label: "Habit + Task Integration", desc: "Habits and tasks work together in one unified execution system." },
              { icon: TrendingUp, label: "Weekly Progress Reports", desc: "Automated reports showing your trends, wins, and areas to improve." },
              { icon: Layers, label: "Goal Breakdown Engine", desc: "Automatically breaks yearly goals into monthly, weekly, and daily actions." },
            ].map((f, i) => (
              <motion.div key={i} variants={fadeUp} custom={i}
                className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 hover:border-violet-500/40 transition-all duration-300"
                data-testid={`feature-card-${i}`}
              >
                <div className="w-11 h-11 rounded-xl bg-violet-500/12 group-hover:bg-violet-500/20 flex items-center justify-center mb-4 transition-colors">
                  <f.icon className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="font-bold text-sm mb-2">{f.label}</h3>
                <p className="text-xs text-white/35 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── COMPARISON ───────────────────────────────────────────────── */}
      <section className="py-20 sm:py-32 relative" data-testid="comparison-section">
        <div className="absolute inset-0 -z-10 bg-white/[0.01]" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}
            className="text-center mb-14"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-violet-400 mb-4 block">DIFFERENTIATION</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
              Not another<br />productivity app
            </h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp}>
            <div className="rounded-3xl border border-white/[0.08] overflow-hidden">
              <div className="grid grid-cols-3 bg-white/[0.03] border-b border-white/[0.06] text-center">
                <div className="px-4 py-4 text-sm text-white/30 font-medium">Category</div>
                <div className="px-4 py-4 text-sm text-white/30 font-medium border-x border-white/[0.06]">Others</div>
                <div className="px-4 py-4 text-sm text-violet-400 font-bold">Consistency System</div>
              </div>
              {[
                { label: "Setup time", others: "Hours of config", us: "Ready instantly" },
                { label: "What it tracks", others: "Tasks only", us: "Full execution" },
                { label: "Accountability", others: "None built-in", us: "Built-in loops" },
                { label: "Focus", others: "Planning more", us: "Results-first" },
                { label: "AI", others: "Basic or none", us: "Deep AI guidance" },
                { label: "Goal system", others: "Manual lists", us: "Auto-breakdown" },
              ].map((row, i) => (
                <div key={i} className={`grid grid-cols-3 text-center border-b border-white/[0.05] last:border-0 ${i % 2 === 0 ? "bg-white/[0.01]" : ""}`} data-testid={`compare-row-${i}`}>
                  <div className="px-4 py-4 text-xs text-white/40 font-medium">{row.label}</div>
                  <div className="px-4 py-4 text-xs text-white/30 border-x border-white/[0.05] flex items-center justify-center gap-1.5">
                    <X className="w-3.5 h-3.5 text-red-400/50 shrink-0" />
                    {row.others}
                  </div>
                  <div className="px-4 py-4 text-xs text-violet-300 font-medium flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                    {row.us}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ─────────────────────────────────────────────── */}
      <section className="py-20 sm:py-32" data-testid="social-proof-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}
            className="text-center mb-14"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-violet-400 mb-4 block">EARLY USERS</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Built for ambitious people</h2>
            <p className="text-white/35 mt-3 text-sm">Early users report significantly higher consistency within the first month.</p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-14"
          >
            {[
              { stars: 5, quote: "Finally a system that actually keeps me accountable. I've tried every app out there — this one actually works.", name: "Arjun K.", role: "Engineering Student" },
              { stars: 5, quote: "The AI planner alone saves me an hour of planning every day. My execution rate went from 40% to 85% in 3 weeks.", name: "Priya M.", role: "Early Professional" },
              { stars: 5, quote: "I always knew what I wanted but never had a system to get there. Consistency System changed that completely.", name: "Rahul S.", role: "Small Business Owner" },
            ].map((t, i) => (
              <motion.div key={i} variants={fadeUp} custom={i}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6"
                data-testid={`testimonial-${i}`}
              >
                <div className="flex gap-0.5 mb-4">
                  {Array(t.stars).fill(0).map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 fill-violet-400 text-violet-400" />
                  ))}
                </div>
                <p className="text-sm text-white/55 leading-relaxed mb-5">"{t.quote}"</p>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-white/30">{t.role}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={stagger}
            className="grid grid-cols-3 gap-5 text-center"
          >
            {[
              { stat: "85%", label: "Avg consistency improvement" },
              { stat: "3×", label: "More tasks completed daily" },
              { stat: "30 days", label: "Average to see real results" },
            ].map((s, i) => (
              <motion.div key={i} variants={fadeUp} custom={i} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 sm:p-8" data-testid={`stat-${i}`}>
                <div className="text-3xl sm:text-4xl font-bold text-violet-400 mb-1">{s.stat}</div>
                <div className="text-xs sm:text-sm text-white/35">{s.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── ABOUT / FOUNDER ──────────────────────────────────────────── */}
      <section className="py-20 sm:py-32 relative" data-testid="about-section">
        <div className="absolute inset-0 -z-10 bg-white/[0.01]" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}
            className="text-center mb-14"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-violet-400 mb-4 block">THE FOUNDER</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Built from lived experience</h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={stagger}
            className="flex flex-col md:flex-row gap-10 items-center"
          >
            <motion.div variants={fadeUp} className="md:w-2/5 shrink-0">
              <div className="w-full max-w-[260px] rounded-2xl overflow-hidden border border-white/[0.08] mx-auto aspect-square">
                <img src={founderImg} alt="Shashidhar - Founder" className="w-full h-full object-cover" data-testid="img-founder" />
              </div>
            </motion.div>
            <motion.div variants={fadeUp} custom={1} className="md:w-3/5 space-y-4">
              <div className="pl-4 border-l-2 border-violet-500">
                <p className="text-lg sm:text-xl font-bold leading-snug">
                  Consistency doesn't come from motivation. It comes from systems.
                </p>
              </div>
              <p className="text-white/45 leading-relaxed text-sm">
                Hi, I'm Shashidhar. Three years ago, I was constantly distracted — addicted to social media, wasting time, and lacking direction. I had ambition but no system to channel it.
              </p>
              <p className="text-white/45 leading-relaxed text-sm">
                I spent years researching productivity, reading over 100 books, and building systems that actually work in real life. Everything I learned went into building Consistency System.
              </p>
              <p className="text-white/45 leading-relaxed text-sm">
                This isn't a generic app. It's the exact system I used to rebuild my life — now available to help you do the same.
              </p>
              <p className="text-white/70 font-semibold text-sm">If you're tired of starting over, you're in the right place.</p>
              <div className="flex items-center gap-3 pt-2">
                <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center text-xs font-bold shrink-0">S</div>
                <div>
                  <div className="text-sm font-semibold">Shashidhar</div>
                  <div className="text-xs text-violet-400">Founder, Consistency System</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── VISION ───────────────────────────────────────────────────── */}
      <section id="vision" className="py-20 sm:py-32" data-testid="vision-section">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}>
            <span className="text-xs uppercase tracking-[0.3em] text-violet-400 mb-6 block">OUR VISION</span>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mx-auto mb-8">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-6">
              We are building the execution layer<br />
              <span className="text-violet-400">of human potential</span>
            </h2>
            <p className="text-white/40 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              Our goal is to help millions of people move from intention to action, and from action to results.
              Not with hype or motivation — with clear, practical systems that respect real life.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-32 relative" data-testid="faq-section">
        <div className="absolute inset-0 -z-10 bg-white/[0.01]" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}
            className="text-center mb-12"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-violet-400 mb-4 block">FAQ</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Common Questions</h2>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={stagger}
            className="space-y-3"
          >
            {[
              { q: "Is this only for students?", a: "No — it's built for anyone who's ambitious but inconsistent: students, early professionals, freelancers, and small business owners. If you struggle to follow through on goals, this is for you." },
              { q: "How is this different from Notion or Todoist?", a: "Those are tools. This is a system. Consistency System doesn't just track tasks — it converts your goals into daily execution, tracks real productivity, and builds accountability automatically." },
              { q: "How quickly will I see results?", a: "Most users notice a meaningful improvement in consistency and focus within the first 2–3 weeks. The key is using the system daily, even for just 15 minutes." },
              { q: "Do I need to be tech-savvy to use it?", a: "Not at all. The interface is clean and intuitive. You just show up, log your work, and the system does the heavy lifting." },
              { q: "Does it work without internet?", a: "You need an internet connection to sync data, but the interface is fast and optimized for low-bandwidth connections." },
            ].map(({ q, a }) => (
              <FAQItem key={q} question={q} answer={a} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-32 relative overflow-hidden" data-testid="cta-section">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-violet-600/12 blur-[100px]" />
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/25 bg-violet-500/[0.06] text-xs text-violet-400 mb-8">
              <Sparkles className="w-3 h-3" />
              START TODAY
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-5">
              Your goals don't need<br />more planning.
            </h2>
            <p className="text-xl sm:text-2xl font-bold text-violet-400 mb-8">They need execution.</p>
            <p className="text-white/35 text-sm mb-10 max-w-md mx-auto">
              Join thousands of ambitious people using Consistency System to finally follow through on what matters most.
            </p>
            <Button
              size="lg"
              className="bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-2xl px-12 text-lg h-14"
              onClick={enterApp}
              data-testid="button-enter-cta"
            >
              Enter
            </Button>
            <p className="text-xs text-white/20 mt-4">Free to start · No credit card needed</p>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-10 px-4" data-testid="footer">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-[10px]">CS</div>
            <span className="text-sm font-bold">Consistency System</span>
          </div>
          <p className="text-xs text-white/25">© {new Date().getFullYear()} Consistency System. Built for execution.</p>
          <div className="flex items-center gap-5 text-xs text-white/25">
            <a href="#" className="hover:text-white/60 transition-colors">Privacy</a>
            <a href="#" className="hover:text-white/60 transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
