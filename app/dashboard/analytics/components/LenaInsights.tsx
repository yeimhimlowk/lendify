"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  Sparkles, 
  TrendingUp, 
  Calendar, 
  MapPin, 
  DollarSign, 
  AlertTriangle,
  Clock,
  Target,
  Lightbulb,
  Heart,
  Zap,
  ArrowRight,
  MessageSquare
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// Lena's insights data
const insights = [
  {
    id: 1,
    type: 'opportunity',
    title: 'Price Drop Alert',
    description: 'Camera equipment prices have dropped 15% in your area. Perfect time to book that photography gear for your weekend project!',
    action: 'View Camera Deals',
    urgency: 'high',
    icon: TrendingUp,
    color: 'green',
    savings: 45,
    confidence: 92
  },
  {
    id: 2,
    type: 'prediction',
    title: 'Optimal Booking Window',
    description: 'Based on historical data, camping gear demand will spike in 2 weeks. Book now to save 20-30% and guarantee availability.',
    action: 'Book Camping Gear',
    urgency: 'medium',
    icon: Calendar,
    color: 'blue',
    savings: 60,
    confidence: 87
  },
  {
    id: 3,
    type: 'location',
    title: 'New Hotspot Discovered',
    description: 'The Tech District now has 40% more rental options with competitive prices. Expand your search radius for better deals.',
    action: 'Explore Tech District',
    urgency: 'low',
    icon: MapPin,
    color: 'purple',
    savings: 25,
    confidence: 78
  },
  {
    id: 4,
    type: 'personal',
    title: 'Your Rental Pattern',
    description: 'You typically rent electronics on Thursdays. Items are 12% cheaper on Tuesdays - consider shifting your schedule.',
    action: 'Adjust Schedule',
    urgency: 'low',
    icon: Target,
    color: 'orange',
    savings: 15,
    confidence: 85
  }
]

// Quick tip data
const quickTips = [
  {
    tip: "Renters who book 3+ days in advance save an average of $23 per rental",
    category: "timing",
    impact: "high"
  },
  {
    tip: "Weekend demand is 40% higher - book weekday rentals for better prices",
    category: "scheduling", 
    impact: "medium"
  },
  {
    tip: "Items with 4+ photos get booked 60% faster",
    category: "quality",
    impact: "medium"
  },
  {
    tip: "Reviews mentioning 'clean' or 'well-maintained' correlate with better experiences",
    category: "selection",
    impact: "high"
  }
]

// Market summary data
const marketSummary = {
  trend: 'positive',
  sentiment: 'optimistic',
  activity: 'high',
  opportunities: 12,
  alerts: 3,
  personalScore: 8.7
}

function InsightCard({ insight }: { insight: typeof insights[0] }) {
  const Icon = insight.icon
  
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'border-red-200 bg-red-50'
      case 'medium': return 'border-yellow-200 bg-yellow-50'
      case 'low': return 'border-blue-200 bg-blue-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  const getIconColor = (color: string) => {
    const colors = {
      green: 'text-green-600 bg-green-100',
      blue: 'text-blue-600 bg-blue-100',
      purple: 'text-purple-600 bg-purple-100',
      orange: 'text-orange-600 bg-orange-100'
    }
    return colors[color as keyof typeof colors] || 'text-gray-600 bg-gray-100'
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Card className={`border-l-4 ${getUrgencyColor(insight.urgency)} hover:shadow-lg transition-all`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${getIconColor(insight.color)}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                <div className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-purple-500" />
                  <span className="text-xs text-purple-600 font-medium">{insight.confidence}% confident</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                {insight.description}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-600">
                      Save up to ${insight.savings}
                    </span>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {insight.action}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function QuickTip({ tip }: { tip: typeof quickTips[0] }) {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:border-purple-200 transition-colors">
      <div className="p-1.5 bg-purple-100 rounded-full">
        <Lightbulb className="h-3 w-3 text-purple-600" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-700">{tip.tip}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getImpactColor(tip.impact)}`}>
            {tip.impact} impact
          </span>
          <span className="text-xs text-gray-500">{tip.category}</span>
        </div>
      </div>
    </div>
  )
}

export default function LenaInsights() {
  const [_activeInsight, _setActiveInsight] = useState(0)
  const [tipIndex, setTipIndex] = useState(0)

  // Auto-rotate tips
  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % quickTips.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Lena&apos;s Smart Insights</h2>
            <p className="text-gray-600">AI-powered recommendations tailored just for you</p>
          </div>
        </div>
        <Button variant="outline" className="hidden sm:flex">
          <MessageSquare className="h-4 w-4 mr-2" />
          Chat with Lena
        </Button>
      </div>

      {/* Market Summary Card */}
      <Card className="bg-gradient-to-r from-purple-600 via-purple-700 to-pink-600 text-white border-0">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-6 w-6 text-green-300" />
              </div>
              <p className="text-sm text-purple-100">Market Trend</p>
              <p className="text-lg font-bold capitalize">{marketSummary.trend}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Heart className="h-6 w-6 text-pink-300" />
              </div>
              <p className="text-sm text-purple-100">Sentiment</p>
              <p className="text-lg font-bold capitalize">{marketSummary.sentiment}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Zap className="h-6 w-6 text-yellow-300" />
              </div>
              <p className="text-sm text-purple-100">Activity Level</p>
              <p className="text-lg font-bold capitalize">{marketSummary.activity}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Target className="h-6 w-6 text-blue-300" />
              </div>
              <p className="text-sm text-purple-100">Your Score</p>
              <p className="text-lg font-bold">{marketSummary.personalScore}/10</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>

      {/* Quick Tips Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-purple-600" />
              Quick Tips from Lena
            </CardTitle>
            <div className="flex items-center gap-2">
              {quickTips.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setTipIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === tipIndex ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <motion.div
            key={tipIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <QuickTip tip={quickTips[tipIndex]} />
          </motion.div>
          
          <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <MessageSquare className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-purple-900">
                  Want more personalized insights?
                </p>
                <p className="text-xs text-purple-700">
                  Chat with Lena to get custom recommendations based on your rental history and preferences
                </p>
              </div>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                Ask Lena
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts & Notifications */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-orange-900">Price Alerts</p>
                <p className="text-sm text-orange-700">3 items in your wishlist dropped in price</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-green-900">Opportunities</p>
                <p className="text-sm text-green-700">12 new deals match your preferences</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-blue-900">Timing</p>
                <p className="text-sm text-blue-700">Optimal booking window opens tomorrow</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}