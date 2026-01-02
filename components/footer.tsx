import { Github, Twitter, Mail } from "lucide-react"
import { Logo } from "@/components/Logo"

export function Footer() {
  return (
    <footer className="bg-background border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Logo size={24} className="text-[#00d9ff]" />
              <span className="text-xl font-heading font-bold tracking-tight">
                <span className="text-white">Code</span>
                <span className="text-accent">Sparring</span>
              </span>
            </div>
            <p className="text-gray-400 text-sm">
              AI-powered platform for coding interview practice. Master technical interviews with realistic
              simulations and personalized feedback.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://github.com/Nikayel/codesparring"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              </a>
              <a
                href="https://twitter.com/codesparring"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              </a>
              <a
                href="mailto:hello@codesparring.dev"
                aria-label="Email us"
              >
                <Mail className="h-5 w-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/pricing" className="text-gray-400 hover:text-white transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="/interview" className="text-gray-400 hover:text-white transition-colors">
                  Try It Free
                </a>
              </li>
              <li>
                <a href="/samples" className="text-gray-400 hover:text-white transition-colors">
                  Sample Reports
                </a>
              </li>
              <li>
                <a href="/blog" className="text-gray-400 hover:text-white transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="/docs" className="text-gray-400 hover:text-white transition-colors">
                  Documentation
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/legal#privacy-policy" className="text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/legal#terms-of-service" className="text-gray-400 hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="/legal#cookie-policy" className="text-gray-400 hover:text-white transition-colors">
                  Cookie Policy
                </a>
              </li>
              <li>
                <a href="/legal#data-processing" className="text-gray-400 hover:text-white transition-colors">
                  Your Data Rights
                </a>
              </li>
              <li>
                <a href="mailto:security@codesparring.dev" className="text-gray-400 hover:text-white transition-colors">
                  Security
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/docs" className="text-gray-400 hover:text-white transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="mailto:support@codesparring.dev" className="text-gray-400 hover:text-white transition-colors">
                  Contact Support
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/nikayel/codesparring/issues"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Report Issues
                </a>
              </li>
              <li>
                <a href="/careers" className="text-gray-400 hover:text-white transition-colors">
                  Careers
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-500 text-sm">
            © 2025 CodeSparring. Built by{" "}
            <a
              href="https://linkedin.com/in/nikayel-ali"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-400 transition-colors"
            >
              Nikayel
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
