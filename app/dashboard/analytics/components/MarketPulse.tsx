"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Users, 
  DollarSign,
  Zap,
  Eye,
  Heart,
  AlertCircle
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

// Real-time market data
const marketTrends = [
  { time: '12:00', bookings: 23, searches: 156, avgPrice: 45 },
  { time: '13:00', bookings: 31, searches: 198, avgPrice: 47 },
  { time: '14:00', bookings: 18, searches: 143, avgPrice: 44 },
  { time: '15:00', bookings: 42, searches: 234, avgPrice: 48 },
  { time: '16:00', bookings: 29, searches: 189, avgPrice: 46 },
  { time: '17:00', bookings: 35, searches: 267, avgPrice: 49 },
  { time: '18:00', bookings: 51, searches: 312, avgPrice: 52 },
]

// Category performance data
const categoryData = [
  { name: 'Electronics', value: 35, growth: 12, color: '#8b5cf6' },
  { name: 'Outdoor', value: 28, growth: 8, color: '#10b981' },
  { name: 'Photography', value: 22, growth: 15, color: '#f59e0b' },
  { name: 'Tools', value: 15, growth: -3, color: '#ef4444' },
]

// Live activity feed
const liveActivities = [
  { id: 1, type: 'booking', item: 'Canon EOS R5', location: 'Downtown', time: '2 min ago', user: 'Sarah M.', price: 89 },
  { id: 2, type: 'search', query: 'camping gear', location: 'Westside', time: '3 min ago', results: 45 },
  { id: 3, type: 'booking', item: 'MacBook Pro', location: 'Tech District', time: '5 min ago', user: 'Mike R.', price: 75 },
  { id: 4, type: 'price_drop', item: 'DJI Mavic Pro', location: 'Suburbs', time: '7 min ago', oldPrice: 120, newPrice: 95 },
  { id: 5, type: 'booking', item: 'Hiking Backpack', location: 'Mountain View', time: '8 min ago', user: 'Alex K.', price: 25 },
]

// Animated number component
function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const increment = value / (duration / 50)
    const timer = setInterval(() => {
      setCurrent(prev => {
        if (prev >= value) {
          clearInterval(timer)
          return value
        }
        return Math.min(prev + increment, value)
      })
    }, 50)

    return () => clearInterval(timer)
  }, [value, duration])

  return <span>{Math.round(current)}</span>
}

// Live activity item component
function ActivityItem({ activity }: { activity: typeof liveActivities[0] }) {
  const getIcon = () => {
    switch (activity.type) {
      case 'booking':
        return <Heart className="h-4 w-4 text-green-500" />
      case 'search':
        return <Eye className="h-4 w-4 text-blue-500" />
      case 'price_drop':
        return <TrendingDown className="h-4 w-4 text-orange-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getDescription = () => {
    switch (activity.type) {
      case 'booking':
        return `${activity.user} booked ${activity.item} for $${activity.price}`
      case 'search':
        return `Search for "${activity.query}" returned ${activity.results} results`
      case 'price_drop':
        return `${activity.item} price dropped from $${activity.oldPrice} to $${activity.newPrice}`
      default:
        return ''
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
    >
      <div className="flex-shrink-0">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {getDescription()}
        </p>
        <p className="text-xs text-gray-500">{activity.location} • {activity.time}</p>
      </div>
    </motion.div>
  )
}

export default function MarketPulse() {
  const [selectedMetric, setSelectedMetric] = useState('bookings')
  const [isLive, setIsLive] = useState(true)

  const metrics = [
    { id: 'bookings', label: 'Bookings', icon: Heart, color: 'green' },
    { id: 'searches', label: 'Searches', icon: Eye, color: 'blue' },
    { id: 'avgPrice', label: 'Avg Price', icon: DollarSign, color: 'purple' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Market Pulse</h2>
          <p className="text-gray-600">Real-time market activity and trends</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
            isLive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-sm font-medium">{isLive ? 'Live' : 'Paused'}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsLive(!isLive)}
          >
            {isLive ? 'Pause' : 'Resume'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Stats */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Real-time Activity</CardTitle>
                <div className="flex items-center gap-2">
                  {metrics.map((metric) => {
                    const Icon = metric.icon
                    return (
                      <Button
                        key={metric.id}
                        variant={selectedMetric === metric.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedMetric(metric.id)}
                        className="text-xs"
                      >
                        <Icon className="h-3 w-3 mr-1" />
                        {metric.label}
                      </Button>
                    )
                  })}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={marketTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#888" 
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#888" 
                      fontSize={12}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey={selectedMetric}
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Activity Feed */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Activity Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {liveActivities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" className="w-full" size="sm">
                View All Activity
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Key Metrics */}
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Renters</p>
                <p className="text-2xl font-bold text-blue-600">
                  <AnimatedNumber value={1247} />
                </p>
                <p className="text-xs text-blue-500 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  +12% vs yesterday
                </p>
              </div>
              <div className="p-3 bg-blue-500 rounded-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Items Available</p>
                <p className="text-2xl font-bold text-green-600">
                  <AnimatedNumber value={8934} />
                </p>
                <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  +8% vs yesterday
                </p>
              </div>
              <div className="p-3 bg-green-500 rounded-lg">
                <Zap className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-purple-600">
                  <AnimatedNumber value={23} />m
                </p>
                <p className="text-xs text-purple-500 flex items-center gap-1 mt-1">
                  <TrendingDown className="h-3 w-3" />
                  -15% vs yesterday
                </p>
              </div>
              <div className="p-3 bg-purple-500 rounded-lg">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Market Alerts</p>
                <p className="text-2xl font-bold text-orange-600">
                  <AnimatedNumber value={7} />
                </p>
                <p className="text-xs text-orange-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" />
                  3 price drops today
                </p>
              </div>
              <div className="p-3 bg-orange-500 rounded-lg">
                <TrendingDown className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Category Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {categoryData.map((category) => (
                <div key={category.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-sm text-gray-600">{category.name}</span>
                  <span className={`text-xs font-medium ${
                    category.growth > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {category.growth > 0 ? '+' : ''}{category.growth}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Popular Search Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { term: 'camera equipment', count: 234, trend: 'up' },
                { term: 'camping gear', count: 189, trend: 'up' },
                { term: 'laptop rental', count: 156, trend: 'down' },
                { term: 'party supplies', count: 134, trend: 'up' },
                { term: 'tools', count: 98, trend: 'stable' },
              ].map((search, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">{search.term}</span>
                    <span className="text-xs text-gray-500">{search.count} searches</span>
                  </div>
                  <div className={`flex items-center gap-1 ${
                    search.trend === 'up' ? 'text-green-600' : 
                    search.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {search.trend === 'up' && <TrendingUp className="h-3 w-3" />}
                    {search.trend === 'down' && <TrendingDown className="h-3 w-3" />}
                    {search.trend === 'stable' && <div className="w-3 h-0.5 bg-gray-400" />}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}