import Link from "next/link"
import { Facebook, Twitter, Instagram, Youtube, MapPin, Phone, Mail } from "lucide-react"

export default function Footer() {
  return (
    <footer className="bg-gray-100 border-t">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-2xl font-bold text-[var(--primary)] mb-4">Lendify</h3>
            <p className="text-[var(--gray-dark)] mb-4">
              Share more, own less. Join the circular economy and save money while reducing waste.
            </p>
            <div className="flex gap-4">
              <Link href="#" className="text-[var(--gray-dark)] hover:text-[var(--primary)] transition-colors">
                <Facebook className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-[var(--gray-dark)] hover:text-[var(--primary)] transition-colors">
                <Twitter className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-[var(--gray-dark)] hover:text-[var(--primary)] transition-colors">
                <Instagram className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-[var(--gray-dark)] hover:text-[var(--primary)] transition-colors">
                <Youtube className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-[var(--black)] mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-[var(--gray-dark)] hover:text-[var(--primary)] transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="text-[var(--gray-dark)] hover:text-[var(--primary)] transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/categories" className="text-[var(--gray-dark)] hover:text-[var(--primary)] transition-colors">
                  Browse Categories
                </Link>
              </li>
              <li>
                <Link href="/host" className="text-[var(--gray-dark)] hover:text-[var(--primary)] transition-colors">
                  List Your Items
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-[var(--black)] mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/help" className="text-[var(--gray-dark)] hover:text-[var(--primary)] transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/safety" className="text-[var(--gray-dark)] hover:text-[var(--primary)] transition-colors">
                  Safety & Insurance
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-[var(--gray-dark)] hover:text-[var(--primary)] transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-[var(--gray-dark)] hover:text-[var(--primary)] transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-[var(--black)] mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-[var(--gray-dark)] flex-shrink-0 mt-0.5" />
                <span className="text-[var(--gray-dark)]">
                  123 Sharing Street<br />
                  San Francisco, CA 94105
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-[var(--gray-dark)] flex-shrink-0" />
                <Link href="tel:+1234567890" className="text-[var(--gray-dark)] hover:text-[var(--primary)] transition-colors">
                  (123) 456-7890
                </Link>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-[var(--gray-dark)] flex-shrink-0" />
                <Link href="mailto:hello@lendify.com" className="text-[var(--gray-dark)] hover:text-[var(--primary)] transition-colors">
                  hello@lendify.com
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-[var(--gray-dark)] text-sm">
              © 2024 Lendify. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="/sitemap" className="text-[var(--gray-dark)] hover:text-[var(--primary)] text-sm transition-colors">
                Sitemap
              </Link>
              <Link href="/accessibility" className="text-[var(--gray-dark)] hover:text-[var(--primary)] text-sm transition-colors">
                Accessibility
              </Link>
              <Link href="/cookies" className="text-[var(--gray-dark)] hover:text-[var(--primary)] text-sm transition-colors">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}