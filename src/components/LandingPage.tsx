"use client";

import Link from "next/link";
import {
  Layers,
  AppWindow,
  Target,
  Radar,
  GanttChart,
  ShieldCheck,
  ArrowRight,
  Network,
  TrendingUp,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-rosely-blush/50 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-rosely-plum/10">
              <Network className="size-4 text-rosely-plum" />
            </div>
            <span className="font-serif text-xl font-bold text-rosely-night">VantageMap</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-rosely-dusk hover:text-rosely-night">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-rosely-plum text-white hover:bg-rosely-plum/90">
                Get Started
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-24">
        {/* Subtle geometric accent */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 size-[600px] rounded-full bg-rosely-petal/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 size-[400px] rounded-full bg-rosely-lilac/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-sm font-medium tracking-widest text-rosely-plum uppercase animate-fade-in">
              Enterprise Architecture Platform
            </p>
            <h1 className="font-serif text-4xl font-bold leading-tight text-rosely-night sm:text-5xl lg:text-6xl animate-fade-in [animation-delay:100ms]">
              See your strategy
              <br />
              <span className="text-rosely-plum">from every vantage point</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-rosely-dusk animate-fade-in [animation-delay:200ms]">
              Map business capabilities to applications, align technology investments with strategic
              objectives, and govern your portfolio with clarity and confidence.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4 animate-fade-in [animation-delay:300ms]">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-rosely-plum text-white hover:bg-rosely-plum/90 px-8 h-12 text-base"
                >
                  Start Mapping
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-rosely-blush text-rosely-night hover:bg-rosely-petal/50 px-8 h-12 text-base"
                >
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="border-t border-rosely-blush/50 bg-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="font-serif text-3xl font-bold text-rosely-night">
              One platform, complete visibility
            </h2>
            <p className="mt-3 text-rosely-dusk">
              From capability mapping to technology governance — every dimension of your enterprise
              architecture in a single, interconnected view.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-rosely-blush/60 bg-rosely-blush/40 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Layers className="size-5" />}
              title="Business Capabilities"
              description="Hierarchical capability maps with health indicators and ownership tracking"
            />
            <FeatureCard
              icon={<AppWindow className="size-5" />}
              title="Application Portfolio"
              description="Lifecycle management with TIME classification and technical fit scoring"
            />
            <FeatureCard
              icon={<Target className="size-5" />}
              title="Strategy Alignment"
              description="Balanced Scorecard with objectives, KPIs, and initiative linkage"
            />
            <FeatureCard
              icon={<Radar className="size-5" />}
              title="Technology Radar"
              description="Quadrant visualization to track technology adoption decisions"
            />
            <FeatureCard
              icon={<GanttChart className="size-5" />}
              title="Strategic Roadmap"
              description="Timeline view of initiatives with dependencies and milestones"
            />
            <FeatureCard
              icon={<ShieldCheck className="size-5" />}
              title="Governance Hub"
              description="Quality seals, data stewardship, and compliance tracking"
            />
          </div>
        </div>
      </section>

      {/* Differentiators */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-3">
            <DifferentiatorCard
              icon={<Eye className="size-6 text-rosely-plum" />}
              title="Unified Visibility"
              description="Break down silos between business, technology, and strategy teams. See how every application, capability, and initiative connects."
            />
            <DifferentiatorCard
              icon={<TrendingUp className="size-6 text-rosely-teal" />}
              title="Data-Driven Decisions"
              description="Portfolio health scores, obsolescence risk analysis, and TIME distribution reports guide investment priorities."
            />
            <DifferentiatorCard
              icon={<Network className="size-6 text-rosely-cornflower" />}
              title="Relationship Intelligence"
              description="Trace dependencies from strategic objectives through capabilities down to individual applications and technologies."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-rosely-blush/50 py-24">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="font-serif text-3xl font-bold text-rosely-night">
            Ready to map your enterprise?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-rosely-dusk">
            Join architecture teams using VantageMap to align technology investments with business
            strategy.
          </p>
          <div className="mt-8">
            <Link href="/register">
              <Button
                size="lg"
                className="bg-rosely-plum text-white hover:bg-rosely-plum/90 px-8 h-12 text-base"
              >
                Get Started Free
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-rosely-blush/50 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Network className="size-4 text-rosely-mist" />
            <span className="text-sm text-rosely-mist">VantageMap</span>
          </div>
          <p className="text-xs text-rosely-mist">
            Enterprise Architecture &amp; Business Strategy Platform
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-3 bg-white p-8 transition-colors hover:bg-rosely-petal/20">
      <div className="flex size-10 items-center justify-center rounded-lg bg-rosely-plum/10 text-rosely-plum">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-rosely-night">{title}</h3>
      <p className="text-sm leading-relaxed text-rosely-dusk">{description}</p>
    </div>
  );
}

function DifferentiatorCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex size-12 items-center justify-center rounded-xl bg-rosely-petal/50">
        {icon}
      </div>
      <h3 className="font-serif text-lg font-semibold text-rosely-night">{title}</h3>
      <p className="text-sm leading-relaxed text-rosely-dusk">{description}</p>
    </div>
  );
}
