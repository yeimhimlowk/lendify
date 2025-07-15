"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useInView } from "react-intersection-observer"
import { 
  MapPin, 
  Zap, 
  BarChart3,
  PieChart,
  Target,
  Lightbulb,
  Search,
  Filter
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import LenaChat from "@/components/ai/LenaChat"

// Import our analytics components (we'll create these)
import AnalyticsHero from "./components/AnalyticsHero"
import MarketPulse from "./components/MarketPulse"
import SmartComparisons from "./components/SmartComparisons"
import PredictiveInsights from "./components/PredictiveInsights"
import LocationIntelligence from "./components/LocationIntelligence"
import PersonalAnalytics from "./components/PersonalAnalytics"
import LenaInsights from "./components/LenaInsights"
import InteractiveMap from "./components/InteractiveMap"

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
}

const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

// Section component with intersection observer
function AnimatedSection({ 
  children, 
  className = "" 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  })

  return (
    <motion.div
      ref={ref}
      initial="initial"
      animate={inView ? "animate" : "initial"}
      variants={fadeInUp}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate initial data loading
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  const tabs = [
    { id: 'overview', label: 'Market Overview', icon: BarChart3 },
    { id: 'predictions', label: 'Smart Predictions', icon: Zap },
    { id: 'locations', label: 'Location Intelligence', icon: MapPin },
    { id: 'personal', label: 'Your Analytics', icon: Target },
    { id: 'comparisons', label: 'Smart Comparisons', icon: PieChart },
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-600">Loading your analytics...</p>
          <p className="text-sm text-gray-400">Crunching the numbers to give you the best insights</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white border-b border-gray-100 sticky top-0 z-40 backdrop-blur-sm bg-white/95"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Analytics Hub
              </h1>
              <p className="text-gray-600 mt-1">
                Discover insights that help you save money and make smarter rental decisions
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="hidden sm:flex">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <Button variant="outline" size="sm" className="hidden sm:flex">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex overflow-x-auto mt-6 -mb-px">
            <div className="flex space-x-1 min-w-max">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-all ${
                      activeTab === tab.id
                        ? 'border-purple-500 text-purple-600 bg-purple-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Analytics Hero - Always visible */}
        <AnimatedSection className="mb-8">
          <AnalyticsHero />
        </AnimatedSection>

        {/* Content based on active tab */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          {activeTab === 'overview' && (
            <motion.div variants={staggerChildren} className="space-y-8">
              <AnimatedSection>
                <MarketPulse />
              </AnimatedSection>
              <AnimatedSection>
                <LenaInsights />
              </AnimatedSection>
            </motion.div>
          )}

          {activeTab === 'predictions' && (
            <AnimatedSection>
              <PredictiveInsights />
            </AnimatedSection>
          )}

          {activeTab === 'locations' && (
            <motion.div variants={staggerChildren} className="space-y-8">
              <AnimatedSection>
                <LocationIntelligence />
              </AnimatedSection>
              <AnimatedSection>
                <InteractiveMap />
              </AnimatedSection>
            </motion.div>
          )}

          {activeTab === 'personal' && (
            <AnimatedSection>
              <PersonalAnalytics />
            </AnimatedSection>
          )}

          {activeTab === 'comparisons' && (
            <AnimatedSection>
              <SmartComparisons />
            </AnimatedSection>
          )}
        </motion.div>

        {/* Bottom CTA Section */}
        <AnimatedSection className="mt-16">
          <Card className="bg-gradient-to-r from-purple-500 to-pink-500 border-0 text-white overflow-hidden">
            <CardContent className="relative p-8">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              <div className="relative">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-white/20 rounded-lg">
                    <Lightbulb className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Get Personalized Insights</h3>
                    <p className="text-purple-100">
                      Chat with Lena to get custom analytics and recommendations
                    </p>
                  </div>
                </div>
                <Button 
                  variant="secondary" 
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  Start Analytics Chat
                </Button>
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>
      </div>

      {/* Lena Chat with analytics context */}
      <LenaChat initialMessage="Show me insights about rental trends and pricing in my area" />
    </div>
  )
}