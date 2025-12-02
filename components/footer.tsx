import { Code, Github, Twitter, Mail } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-black border-t border-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Code className="h-6 w-6 text-[#00d9ff]" />
              <span className="text-xl font-heading font-bold text-white">Skillon</span>
            </div>
            <p className="text-gray-400 text-sm">
              AI-powered platform for coding interview practice. Master technical interviews with realistic
              simulations and personalized feedback.
            </p>
            <div className="flex space-x-4">
              <Github className="h-5 w-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              <Twitter className="h-5 w-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              <Mail className="h-5 w-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
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
                <a href="/docs" className="text-gray-400 hover:text-white transition-colors">
                  Documentation
                </a>
              </li>
            </ul>
          </div>

          {/* Support & Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/docs" className="text-gray-400 hover:text-white transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="/legal" className="text-gray-400 hover:text-white transition-colors">
                  Privacy & Terms
                </a>
              </li>
              <li>
                <a href="mailto:support@skillon.dev" className="text-gray-400 hover:text-white transition-colors">
                  Contact Support
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/nikayel/skillon/issues"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Report Issues
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400 text-sm">© 2025 Skillon. All rights reserved. Made with care for developers.</p>
        </div>
      </div>
    </footer>
  )
}
