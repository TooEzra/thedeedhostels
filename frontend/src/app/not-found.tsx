import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonClasses } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <Logo />
      <h1 className="mt-4 text-3xl font-bold">Page not found</h1>
      <p className="max-w-sm text-muted-foreground">The page you're looking for doesn't exist or you don't have access to it.</p>
      <Link href="/" className={buttonClasses()}>
        Back to home
      </Link>
    </div>
  );
}
