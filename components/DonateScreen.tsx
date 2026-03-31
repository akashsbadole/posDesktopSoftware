"use client";
import {
  Heart,
  ExternalLink,
  Wrench,
  Monitor,
  Plug,
  BookOpen,
  Users,
  Zap,
  Award,
  Globe,
} from "lucide-react";

export default function DonateScreen() {
  const openDonateLink = () => {
    window.open("https://www.buymeacoffee.com/akashbadole", "_blank");
  };

  return (
    <div className="flex flex-col items-center min-h-full p-8 bg-bg text-text overflow-y-auto">
      <div className="max-w-2xl w-full py-8">
        <div className="text-center mb-8">
          <Heart className="w-16 h-16 mx-auto mb-6 text-red-500" />
          <h1 className="text-3xl font-bold mb-4">Support Our Work</h1>
          <p className="text-lg mb-6 text-gray-600 dark:text-gray-400">
            Our POS application is completely free and open source. If you find
            it valuable, consider supporting us with a donation to help maintain
            and improve the project.
          </p>
          <button
            onClick={openDonateLink}
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            <Heart className="w-5 h-5" />
            Buy Me a Coffee
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <Wrench className="w-8 h-8 text-blue-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">Premium Services</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Need custom development or support? We offer premium services
              including:
            </p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>• Custom integrations</li>
              <li>• On-site training</li>
              <li>• Priority support</li>
              <li>• System setup assistance</li>
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <Monitor className="w-8 h-8 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">Hardware Bundles</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Get the best performance with our recommended hardware bundles:
            </p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>• Optimized POS computers</li>
              <li>• Thermal printers</li>
              <li>• Barcode scanners</li>
              <li>• Cash drawers</li>
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <Plug className="w-8 h-8 text-purple-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">Custom Integrations</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Connect your POS with other systems through custom integrations:
            </p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>• Accounting software</li>
              <li>• Delivery platforms</li>
              <li>• Inventory systems</li>
              <li>• Loyalty programs</li>
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <BookOpen className="w-8 h-8 text-indigo-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">Training Programs</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Master your POS with our comprehensive training programs:
            </p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>• Online video courses</li>
              <li>• Live webinars</li>
              <li>• Certification programs</li>
              <li>• Advanced user workshops</li>
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <Users className="w-8 h-8 text-teal-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">Consulting Services</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Optimize your restaurant operations with expert consulting:
            </p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>• Business process optimization</li>
              <li>• Menu engineering</li>
              <li>• Staff training programs</li>
              <li>• Performance analytics</li>
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <Zap className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">SaaS Add-ons</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Enhance your POS with cloud-based premium features:
            </p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>• Advanced analytics dashboard</li>
              <li>• Automated backups</li>
              <li>• Real-time multi-device sync</li>
              <li>• Customer insights</li>
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <Award className="w-8 h-8 text-pink-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">
              White-label Solutions
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Custom branded versions for agencies and resellers:
            </p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>• Custom branding</li>
              <li>• Reseller licensing</li>
              <li>• Agency partnerships</li>
              <li>• Private deployments</li>
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <Globe className="w-8 h-8 text-cyan-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">Affiliate Marketing</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Earn commissions by promoting complementary products:
            </p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>• POS hardware affiliates</li>
              <li>• Payment processing</li>
              <li>• Restaurant supplies</li>
              <li>• Marketing tools</li>
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <Heart className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">
              Patreon-Style Support
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Join our supporter community for exclusive benefits:
            </p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>• Early access to features</li>
              <li>• Private Discord community</li>
              <li>• Monthly supporter calls</li>
              <li>• Branded supporter badge</li>
            </ul>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500 mb-2">
            Interested in any of these services? Contact us for details and
            pricing.
          </p>
          <p className="text-sm text-gray-500">
            Email:{" "}
            <a
              href="mailto:info@appixen.com"
              className="text-blue-500 hover:underline"
            >
              info@appixen.com
            </a>{" "}
            | Website: appixen.com/services
          </p>
        </div>
      </div>
    </div>
  );
}
