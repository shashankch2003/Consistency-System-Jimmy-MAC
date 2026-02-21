import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import { CheckCircle2, Zap, Shield, LayoutDashboard, ArrowRight, Target, Calendar, Clock, ListTodo, TrendingUp, BookOpen, ChevronDown } from "lucide-react";
import { useRef } from "react";
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

export default function LandingPage() {
  const { user } = useAuth();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/20 overflow-x-hidden" data-testid="landing-page">
      <nav className="fixed w-full z-50 bg-black/60 backdrop-blur-2xl border-b border-white/[0.06]" data-testid="landing-nav">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-black" />
            </div>
            <span className="text-lg font-display font-bold tracking-tight" data-testid="text-brand">Consistency System</span>
          </div>
          <div className="hidden md:flex items-center gap-10 text-sm text-white/50">
            <a href="#features" className="hover:text-white transition-colors duration-300" data-testid="link-nav-features">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors duration-300" data-testid="link-nav-how-it-works">How It Works</a>
            <a href="#founder" className="hover:text-white transition-colors duration-300" data-testid="link-nav-founder">Founder</a>
            <a href="#pricing" className="hover:text-white transition-colors duration-300" data-testid="link-nav-pricing">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button className="bg-white text-black hover:bg-white/90 font-semibold px-6 h-11 rounded-full" data-testid="button-dashboard">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <Button
                onClick={() => window.location.href = "/api/login"}
                className="bg-white text-black hover:bg-white/90 font-semibold px-6 h-11 rounded-full"
                data-testid="button-signin"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>

      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-20" style={{ position: "relative" }} data-testid="hero-section">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-white/[0.03] blur-[150px]" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="max-w-5xl mx-auto px-6 lg:px-8 text-center"
        >
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-sm text-white/60 mb-10"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Built for people who take life seriously
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={1}
            className="text-5xl sm:text-6xl md:text-8xl font-display font-bold tracking-tight leading-[0.9] mb-8"
          >
            Master Your Life
            <br />
            <span className="text-white/40">with Consistency</span>
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={2}
            className="text-lg md:text-xl text-white/40 max-w-2xl mx-auto mb-12 leading-relaxed font-light"
          >
            The all-in-one system to track goals, habits, and daily productivity.
            Build the life you want, one day at a time.
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
              className="text-base px-10 h-14 bg-white text-black hover:bg-white/90 rounded-full font-semibold shadow-[0_0_40px_rgba(255,255,255,0.1)]"
              onClick={() => window.location.href = "/api/login"}
              data-testid="button-get-started"
            >
              Get Started for Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base px-10 h-14 border-white/10 text-white/70 hover:text-white hover:border-white/30 rounded-full bg-transparent"
              data-testid="button-demo"
            >
              View Demo
            </Button>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={4}
            className="mt-20"
          >
            <a href="#features" className="inline-flex flex-col items-center gap-2 text-white/20 hover:text-white/40 transition-colors">
              <span className="text-xs uppercase tracking-[0.2em]">Explore</span>
              <ChevronDown className="w-4 h-4 animate-bounce" />
            </a>
          </motion.div>
        </motion.div>
      </section>

      <section className="py-32 relative" data-testid="stats-section">
        <div className="absolute inset-0 -z-10 bg-white/[0.01]" />
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4"
          >
            {[
              { value: "10x", label: "Productivity Boost" },
              { value: "365", label: "Days of Tracking" },
              { value: "24/7", label: "Cloud Access" },
              { value: "100%", label: "Data Ownership" },
            ].map((stat) => (
              <motion.div key={stat.label} variants={fadeUp} className="text-center">
                <div className="text-4xl md:text-5xl font-display font-bold mb-2 text-white">{stat.value}</div>
                <div className="text-sm text-white/30 uppercase tracking-[0.15em]">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="features" className="py-32 relative" data-testid="features-section">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="text-center mb-20"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-white/30 mb-4 block">Everything You Need</span>
            <h2 className="text-4xl md:text-6xl font-display font-bold tracking-tight">
              One system.<br />
              <span className="text-white/30">Infinite potential.</span>
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[
              {
                icon: Target,
                title: "Goal Tracking",
                desc: "Set ambitious goals and break them down into actionable steps. Track yearly and monthly progress with clarity.",
              },
              {
                icon: ListTodo,
                title: "Daily Tasks",
                desc: "Manage your tasks with a clean calendar view. Add time, priority, and descriptions to stay organized.",
              },
              {
                icon: Zap,
                title: "Daily Productivity",
                desc: "Track hourly performance and optimize your peak hours. Know exactly where your time goes.",
              },
              {
                icon: Shield,
                title: "Good Habits",
                desc: "Build good habits with visual streaks and daily check-ins. Watch your consistency grow over time.",
              },
              {
                icon: TrendingUp,
                title: "Bad Habits",
                desc: "Track and eliminate bad habits. Awareness is the first step to breaking the cycle.",
              },
              {
                icon: BookOpen,
                title: "Notes & Pages",
                desc: "Notion-like notes with rich text, nested pages, and slash commands. Your second brain, organized.",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                custom={i}
                className="group relative p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-500"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/[0.06] flex items-center justify-center mb-6 group-hover:bg-white/[0.1] transition-colors duration-500">
                  <feature.icon className="w-5 h-5 text-white/70" />
                </div>
                <h3 className="text-lg font-semibold mb-3 tracking-tight">{feature.title}</h3>
                <p className="text-white/35 leading-relaxed text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="how-it-works" className="py-32 relative" data-testid="how-it-works-section">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.02] blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="text-center mb-20"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-white/30 mb-4 block">Simple Process</span>
            <h2 className="text-4xl md:text-6xl font-display font-bold tracking-tight">
              Three steps to<br />
              <span className="text-white/30">transform your life.</span>
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8"
          >
            {[
              {
                step: "01",
                title: "Set Your Vision",
                desc: "Define your yearly and monthly goals. Break down your biggest ambitions into trackable milestones.",
              },
              {
                step: "02",
                title: "Build Daily Systems",
                desc: "Create tasks, track habits, and log your hours. Small daily actions compound into extraordinary results.",
              },
              {
                step: "03",
                title: "Review & Optimize",
                desc: "Use your daily score and analytics to understand patterns. Adjust, improve, and keep growing.",
              },
            ].map((item, i) => (
              <motion.div key={item.step} variants={fadeUp} custom={i} className="relative">
                <div className="text-7xl font-display font-bold text-white/[0.04] mb-6">{item.step}</div>
                <h3 className="text-xl font-semibold mb-3 tracking-tight">{item.title}</h3>
                <p className="text-white/35 leading-relaxed text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="founder" className="py-32 relative" data-testid="founder-section">
        <div className="absolute inset-0 -z-10 border-y border-white/[0.04]" />
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="flex flex-col md:flex-row items-center gap-16"
          >
            <motion.div variants={fadeUp} className="shrink-0">
              <div className="relative">
                <div className="w-64 h-64 md:w-80 md:h-80 rounded-3xl overflow-hidden border border-white/[0.08]">
                  <img
                    src={founderImg}
                    alt="Founder"
                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
                    data-testid="img-founder"
                  />
                </div>
                <div className="absolute -bottom-3 -right-3 w-64 h-64 md:w-80 md:h-80 rounded-3xl border border-white/[0.04] -z-10" />
              </div>
            </motion.div>

            <motion.div variants={fadeUp} custom={1} className="text-center md:text-left">
              <span className="text-xs uppercase tracking-[0.3em] text-white/30 mb-4 block">The Founder</span>
              <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight mb-6">
                Built from personal<br />
                <span className="text-white/40">obsession with growth.</span>
              </h2>
              <p className="text-white/35 leading-relaxed mb-6 max-w-lg">
                Consistency System was born from a simple realization: the difference between where
                you are and where you want to be is consistency. I built this system for myself first,
                then refined it for people who refuse to settle for an average life.
              </p>
              <p className="text-white/35 leading-relaxed max-w-lg">
                Every feature exists because it solves a real problem. No bloat. No distractions.
                Just pure focus on what matters most — showing up every single day.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="py-32" data-testid="testimonial-section">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
          >
            <div className="text-6xl md:text-8xl text-white/[0.05] font-serif mb-8">"</div>
            <p className="text-2xl md:text-3xl font-light leading-relaxed text-white/60 mb-8">
              You don't rise to the level of your goals.
              You fall to the level of your systems.
            </p>
            <p className="text-sm text-white/25 uppercase tracking-[0.2em]">James Clear, Atomic Habits</p>
          </motion.div>
        </div>
      </section>

      <section id="pricing" className="py-32 relative" data-testid="pricing-section">
        <div className="absolute inset-0 -z-10">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-white/[0.02] blur-[120px]" />
        </div>

        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-white/30 mb-4 block">Pricing</span>
            <h2 className="text-4xl md:text-6xl font-display font-bold tracking-tight mb-4">
              Invest in<br />
              <span className="text-white/30">yourself.</span>
            </h2>
            <p className="text-white/35 max-w-xl mx-auto">
              One payment. No subscriptions. Own your data.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={fadeUp}
          >
            <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.02] p-10 md:p-14 text-center overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              <h3 className="text-lg font-semibold text-white/50 uppercase tracking-[0.2em] mb-6">Lifetime Access</h3>

              <div className="flex items-baseline justify-center gap-2 mb-10">
                <span className="text-6xl md:text-7xl font-display font-bold">₹3999</span>
                <span className="text-white/25 text-lg">/ forever</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto mb-12 text-left">
                {[
                  "Unlimited Goals",
                  "Advanced Analytics",
                  "Priority Support",
                  "Cloud Sync",
                  "Daily Score Tracking",
                  "Notion-like Notes",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-white/40 shrink-0" />
                    <span className="text-sm text-white/60">{item}</span>
                  </div>
                ))}
              </div>

              <Button
                size="lg"
                className="bg-white text-black hover:bg-white/90 rounded-full px-14 h-14 text-base font-semibold shadow-[0_0_60px_rgba(255,255,255,0.08)]"
                onClick={() => window.location.href = "/api/login"}
                data-testid="button-buy"
              >
                Buy Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <p className="text-xs text-white/20 mt-6 tracking-wide">Secured by Razorpay</p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-32" data-testid="cta-section">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
          >
            <h2 className="text-4xl md:text-6xl font-display font-bold tracking-tight mb-6">
              Ready to become<br />
              <span className="text-white/30">unstoppable?</span>
            </h2>
            <p className="text-white/35 max-w-lg mx-auto mb-10">
              Join the people who decided that average isn't good enough. Start tracking, start growing, start winning.
            </p>
            <Button
              size="lg"
              className="bg-white text-black hover:bg-white/90 rounded-full px-12 h-14 text-base font-semibold"
              onClick={() => window.location.href = "/api/login"}
              data-testid="button-cta-start"
            >
              Get Started for Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-white/[0.04] py-12" data-testid="footer">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                <LayoutDashboard className="w-4 h-4 text-black" />
              </div>
              <span className="font-display font-bold text-sm">Consistency System</span>
            </div>
            <div className="flex items-center gap-8 text-xs text-white/20">
              <a href="#features" className="hover:text-white/50 transition-colors" data-testid="link-footer-features">Features</a>
              <a href="#pricing" className="hover:text-white/50 transition-colors" data-testid="link-footer-pricing">Pricing</a>
              <a href="#founder" className="hover:text-white/50 transition-colors" data-testid="link-footer-founder">Founder</a>
            </div>
            <p className="text-xs text-white/15">
              &copy; {new Date().getFullYear()} Consistency System. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
