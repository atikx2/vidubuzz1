"use client";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="page-shell public-not-found"><p>SOMETHING WENT WRONG</p><h1>Let's try that again.</h1><div>Your saved data has not been deleted. Reload this view, or return to the homepage.</div><button type="button" onClick={reset}><RefreshCw size={16} />Try again</button><Link href="/">Back to homepage</Link></main>;
}
