import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-foreground">Dynamic QR</h1>
        <p className="text-lg text-muted-foreground">Marketing-ready dynamic QR management</p>
        <p className="mt-4 text-sm text-muted-foreground">
          Pure Black theme active • Blue accent color • WCAG 2.1 AA compliant
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md border border-primary bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Go to Login
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-md border border-primary/50 bg-transparent px-5 py-2 text-sm font-medium text-primary hover:bg-primary/10"
          >
            Go to Register
          </Link>
        </div>
      </div>
    </main>
  );
}

