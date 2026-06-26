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
              <Logo size={24} className="text-[#c4703f]" />
              <span className="font-heading text-xl font-bold tracking-tight">
                <span className="text-white">Code</span>
                <span className="text-accent">Sparring</span>
              </span>
            </div>
            <p className="text-sm text-gray-400">
              CodeSparring.dev is the premier AI technical interview practice platform. Master your
              next software engineering interview with realistic coding, system design, and bug-fix
              simulations.
            </p>
            <div className="flex space-x-4">
              <Github className="h-5 w-5 cursor-pointer text-gray-400 transition-colors hover:text-white" />
              <Twitter className="h-5 w-5 cursor-pointer text-gray-400 transition-colors hover:text-white" />
              <Mail className="h-5 w-5 cursor-pointer text-gray-400 transition-colors hover:text-white" />
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="mb-4 font-semibold text-white">Product</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/pricing" className="text-gray-400 transition-colors hover:text-white">
                  Pricing
                </a>
              </li>
              <li>
                <a href="/interview" className="text-gray-400 transition-colors hover:text-white">
                  Try It Free
                </a>
              </li>
              <li>
                <a href="/samples" className="text-gray-400 transition-colors hover:text-white">
                  Sample Reports
                </a>
              </li>
              <li>
                <Link href="/blog" className="text-gray-400 transition-colors hover:text-white">
                  Blog
                </Link>
              </li>
              <li>
                <a href="/docs" className="text-gray-400 transition-colors hover:text-white">
                  Documentation
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-4 font-semibold text-white">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="/legal#privacy-policy"
                  className="text-gray-400 transition-colors hover:text-white"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="/legal#terms-of-service"
                  className="text-gray-400 transition-colors hover:text-white"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="/legal#cookie-policy"
                  className="text-gray-400 transition-colors hover:text-white"
                >
                  Cookie Policy
                </a>
              </li>
              <li>
                <a
                  href="/legal#data-processing"
                  className="text-gray-400 transition-colors hover:text-white"
                >
                  Your Data Rights
                </a>
              </li>
              <li>
                <a
                  href="mailto:security@codesparring.dev"
                  className="text-gray-400 transition-colors hover:text-white"
                >
                  Security
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="mb-4 font-semibold text-white">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/docs" className="text-gray-400 transition-colors hover:text-white">
                  Help Center
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@codesparring.dev"
                  className="text-gray-400 transition-colors hover:text-white"
                >
                  Contact Support
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/nikayel/codesparring/issues"
                  className="text-gray-400 transition-colors hover:text-white"
                >
                  Report Issues
                </a>
              </li>
              <li>
                <a href="/careers" className="text-gray-400 transition-colors hover:text-white">
                  Careers
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-800 pt-8 text-center">
          <p className="text-sm text-gray-500">
            © 2025 CodeSparring. Built with care by{" "}
            <a
              href="https://linkedin.com/in/nikayel-ali"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-gray-400"
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
