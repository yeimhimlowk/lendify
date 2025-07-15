"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Target, 
  Zap, 
  Star,
  ArrowUpRight,
  Wallet,
  Clock,
  MapPin
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'

// Animated counter component
function AnimatedCounter({ 
  end, 
  duration = 2000,
  prefix = "",
  suffix = "",
  decimals = 0
}: { 
  end: number
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
}) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTime: number | null = null
    let animationFrame: number

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      
      setCount(Number((progress * end).toFixed(decimals)))
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [end, duration, decimals])

  return (
    <span>{prefix}{count}{suffix}</span>
  )
}

// Hero stat card
function HeroStatCard({
  title,
  value,
  change,
  trend,
  icon: Icon,
  gradient,
  prefix,
  suffix,
  decimals = 0,
  description
}: {
  title: string
  value: number
  change?: number
  trend?: "up" | "down"
  icon: React.ComponentType<{ className?: string }>
  gradient: string
  prefix?: string
  suffix?: string
  decimals?: number
  description?: string
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Card className="relative overflow-hidden border-0 shadow-xl">
        <div className={`absolute inset-0 ${gradient} opacity-10`} />
        <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent" />
        
        <CardContent className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-xl ${gradient} bg-opacity-100 shadow-lg`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            {change !== undefined && (
              <div className={`flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-full ${
                trend === "up" 
                  ? "text-green-700 bg-green-100" 
                  : "text-red-700 bg-red-100"
              }`}>
                <ArrowUpRight className={`h-3 w-3 ${trend === "down" ? "rotate-180" : ""}`} />
                {Math.abs(change)}%
              </div>
            )}
          </div>
          
          <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            <AnimatedCounter 
              end={value} 
              prefix={prefix} 
              suffix={suffix} 
              decimals={decimals}
            />
          </p>
          
          {description && (
            <p className="text-xs text-gray-500">{description}</p>
          )}
          
          {/* Sparkline effect */}
          <div className="mt-4 h-8 opacity-60">
            <div className={`h-1 ${gradient} rounded-full animate-pulse`} 
                 style={{ width: `${Math.min(value / 100 * 100, 100)}%` }} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Savings chart data
const savingsData = [
  { month: 'Jan', saved: 120, potential: 180 },
  { month: 'Feb', saved: 180, potential: 220 },
  { month: 'Mar', saved: 240, potential: 280 },
  { month: 'Apr', saved: 320, potential: 360 },
  { month: 'May', saved: 280, potential: 320 },
  { month: 'Jun', saved: 450, potential: 500 },
]

export default function AnalyticsHero() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('6m')

  const timeframes = [
    { id: '1m', label: '1M' },
    { id: '3m', label: '3M' },
    { id: '6m', label: '6M' },
    { id: '1y', label: '1Y' },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-gradient-to-r from-purple-600 via-purple-700 to-pink-600 rounded-2xl p-8 text-white relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute -right-20 -top-20 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Your Rental Intelligence Center</h1>
              <p className="text-purple-100 text-lg">
                You&apos;ve saved <span className="font-bold text-white">$1,240</span> this year using smart rental insights
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2 bg-white/20 rounded-lg p-2">
              <Zap className="h-5 w-5 text-yellow-300" />
              <span className="text-sm font-medium">Live Market Data</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-purple-200" />
                <div>
                  <p className="text-sm text-purple-200">Savings Goal Progress</p>
                  <p className="text-lg font-bold">74% Complete</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-purple-200" />
                <div>
                  <p className="text-sm text-purple-200">Upcoming Trip</p>
                  <p className="text-lg font-bold">Best booking window opens in 3 days</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Star className="h-5 w-5 text-purple-200" />
                <div>
                  <p className="text-sm text-purple-200">Smart Score</p>
                  <p className="text-lg font-bold">9.2/10</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <HeroStatCard
          title="Total Savings"
          value={1240}
          change={23}
          trend="up"
          icon={DollarSign}
          gradient="bg-gradient-to-r from-green-500 to-emerald-500"
          prefix="$"
          description="vs buying new items"
        />
        <HeroStatCard
          title="Average Deal Score"
          value={8.7}
          change={12}
          trend="up"
          icon={Star}
          gradient="bg-gradient-to-r from-purple-500 to-violet-500"
          suffix="/10"
          decimals={1}
          description="quality of your rental choices"
        />
        <HeroStatCard
          title="Days Saved"
          value={23}
          change={8}
          trend="up"
          icon={Clock}
          gradient="bg-gradient-to-r from-blue-500 to-cyan-500"
          description="from smart booking timing"
        />
        <HeroStatCard
          title="Market Opportunities"
          value={12}
          icon={TrendingUp}
          gradient="bg-gradient-to-r from-orange-500 to-red-500"
          description="active deals in your area"
        />
      </motion.div>

      {/* Savings Trend Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <Card className="shadow-xl border-0">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold">Your Savings Journey</CardTitle>
                <p className="text-gray-600 text-sm mt-1">
                  Track your rental savings and discover optimization opportunities
                </p>
              </div>
              <div className="flex items-center gap-2">
                {timeframes.map((timeframe) => (
                  <Button
                    key={timeframe.id}
                    variant={selectedTimeframe === timeframe.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTimeframe(timeframe.id)}
                    className="text-xs"
                  >
                    {timeframe.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={savingsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#888" 
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#888" 
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any, name: string) => [
                      `$${value}`,
                      name === 'saved' ? 'Money Saved' : 'Potential Savings'
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="potential"
                    stackId="1"
                    stroke="#e5e7eb"
                    fill="#f3f4f6"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="saved"
                    stackId="1"
                    stroke="#8b5cf6"
                    fill="url(#savingsGradient)"
                    fillOpacity={0.8}
                  />
                  <defs>
                    <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <Card className="group hover:shadow-lg transition-all cursor-pointer border-0 bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500 rounded-lg group-hover:scale-110 transition-transform">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Trip Optimizer</h3>
                <p className="text-sm text-gray-600">Plan your next rental with AI insights</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all cursor-pointer border-0 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500 rounded-lg group-hover:scale-110 transition-transform">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Area Explorer</h3>
                <p className="text-sm text-gray-600">Discover the best rental neighborhoods</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all cursor-pointer border-0 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500 rounded-lg group-hover:scale-110 transition-transform">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Price Predictor</h3>
                <p className="text-sm text-gray-600">Get alerts when prices drop</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}