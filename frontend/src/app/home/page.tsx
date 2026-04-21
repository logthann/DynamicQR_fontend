import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Calendar,
  Globe,
  QrCode,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const features = [
  {
    icon: Activity,
    title: 'Real-time Tracking',
    description:
      'Monitor scans as they happen with live analytics. Track location, device, time, and user behavior instantly.',
  },
  {
    icon: RefreshCw,
    title: 'Dynamic Redirection',
    description:
      'Change your QR destination anytime without reprinting. A/B test URLs and optimize for conversions.',
  },
  {
    icon: Target,
    title: 'Campaign Management',
    description:
      'Organize QR codes into campaigns. Set start/end dates, budgets, and performance goals all in one place.',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description:
      'Bank-grade encryption and SSO support. Full GDPR compliance with custom data retention policies.',
  },
  {
    icon: Zap,
    title: 'Instant Generation',
    description:
      'Create branded QR codes in seconds. Customize colors, add logos, and download in multiple formats.',
  },
  {
    icon: Globe,
    title: 'Global CDN',
    description:
      'Lightning-fast redirects worldwide. 99.9% uptime guarantee with edge locations across 50+ countries.',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-muted/40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/home" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <QrCode className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">DynamicQR</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Features
            </Link>
            <Link href="#integrations" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Integrations
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/register">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-background py-20 md:py-32">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f610_1px,transparent_1px),linear-gradient(to_bottom,#3b82f610_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="container relative mx-auto px-4 md:px-6">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-muted bg-card px-4 py-1.5 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Now with AI-powered insights</span>
            </div>

            <h1 className="mb-6 text-balance text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              Dynamic QR Code Management
              <span className="block text-primary">Made Simple</span>
            </h1>

            <p className="mb-8 max-w-2xl text-pretty text-lg text-muted-foreground md:text-xl">
              Create, track, and optimize your QR campaigns with real-time analytics. Seamlessly integrated with{' '}
              <span className="font-semibold text-foreground">Google Analytics 4</span> and{' '}
              <span className="font-semibold text-foreground">Google Calendar</span>.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Button asChild size="lg" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/register">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-muted hover:bg-secondary">
                <Link href="/login">View Demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="integrations" className="border-y border-muted bg-secondary/40 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center justify-center gap-6">
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Seamlessly Integrated With</p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-muted bg-card shadow-sm">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold">Google Analytics 4</span>
                  <span className="text-sm text-muted-foreground">Real-time tracking</span>
                </div>
              </div>
              <div className="hidden h-12 w-px bg-muted md:block" />
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-muted bg-card shadow-sm">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold">Google Calendar</span>
                  <span className="text-sm text-muted-foreground">Campaign scheduling</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="bg-background py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">Everything You Need to Succeed</h2>
            <p className="text-lg text-muted-foreground">
              Powerful features designed to help you create, manage, and optimize your QR code campaigns at scale.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="group border-muted bg-card transition-all hover:border-primary/50 hover:shadow-lg">
                <CardHeader>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base text-muted-foreground">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-muted bg-card">
        <div className="container mx-auto px-4 py-12 md:px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <QrCode className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">DynamicQR</span>
            </div>

            <nav className="flex items-center gap-6">
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
                Privacy
              </Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
                Terms
              </Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
                Contact
              </Link>
            </nav>

            <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} DynamicQR. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

