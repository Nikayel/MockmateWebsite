import { Github, Twitter, Mail } from "lucide-react"
import Link from "next/link"
import { Logo } from "@/components/Logo"

export function Footer() {
  return (
    <footer className="bg-background border-border border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Logo size={24} className="text-accent" />
              <span className="font-heading text-xl font-bold tracking-tight">
                <span className="text-foreground">Code</span>
                <span className="text-accent">Sparring</span>
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              CodeSparring.dev is the premier AI technical interview practice platform. Master your
              next software engineering interview with realistic coding, system design, and bug-fix
              simulations.
            </p>
            <div className="flex space-x-4">
              <Github className="text-muted-foreground hover:text-foreground h-5 w-5 cursor-pointer transition-colors" />
              <Twitter className="text-muted-foreground hover:text-foreground h-5 w-5 cursor-pointer transition-colors" />
              <Mail className="text-muted-foreground hover:text-foreground h-5 w-5 cursor-pointer transition-colors" />
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-foreground mb-4 font-semibold">Product</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="/pricing"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Pricing
                </a>
              </li>
              <li>
                <a
                  href="/interview"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Try It Free
                </a>
              </li>
              <li>
                <a
                  href="/samples"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sample Reports
                </a>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Blog
                </Link>
              </li>
              <li>
                <a
                  href="/docs"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Documentation
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-foreground mb-4 font-semibold">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="/legal#privacy-policy"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="/legal#terms-of-service"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="/legal#cookie-policy"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cookie Policy
                </a>
              </li>
              <li>
                <a
                  href="/legal#data-processing"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Your Data Rights
                </a>
              </li>
              <li>
                <a
                  href="mailto:security@codesparring.dev"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Security
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-foreground mb-4 font-semibold">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="/docs"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Help Center
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@codesparring.dev"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contact Support
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/nikayel/codesparring/issues"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Report Issues
                </a>
              </li>
              <li>
                <a
                  href="/careers"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Careers
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-border mt-8 border-t pt-8 text-center">
          <p className="text-muted-foreground text-sm">
            © 2025 CodeSparring. Built with care by{" "}
            <a
              href="https://linkedin.com/in/nikayel-ali"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
              title="Nikayel Ali - Founder of CodeSparring"
            >
              Nikayel Ali
            </a>{" "}
            in Sacramento, CA
          </p>
        </div>
      </div>
    </footer>
  )
}
