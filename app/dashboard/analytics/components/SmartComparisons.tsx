"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Star, 
  MapPin, 
  DollarSign,
  Users,
  Clock,
  Shield,
  Zap,
  Award,
  Target
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter
} from 'recharts'

// Sample comparison data
const propertyComparisons = [
  {
    id: 1,
    name: "Canon EOS R5",
    category: "Photography",
    price: 89,
    rating: 4.8,
    location: "Downtown",
    distance: 2.1,
    responseTime: 15,
    bookingRate: 85,
    safetyScore: 9.2,
    valueScore: 8.7,
    availability: 90,
    pros: ["Professional grade", "Fast delivery", "Excellent reviews"],
    cons: ["Higher price", "Limited accessories"]
  },
  {
    id: 2,
    name: "Canon EOS R6",
    category: "Photography",
    price: 75,
    rating: 4.6,
    location: "Tech District",
    distance: 4.3,
    responseTime: 25,
    bookingRate: 78,
    safetyScore: 8.8,
    valueScore: 9.1,
    availability: 75,
    pros: ["Great value", "Good condition", "Flexible pickup"],
    cons: ["Farther location", "Slower response"]
  },
  {
    id: 3,
    name: "Canon EOS R3",
    category: "Photography", 
    price: 120,
    rating: 4.9,
    location: "Westside",
    distance: 6.8,
    responseTime: 8,
    bookingRate: 92,
    safetyScore: 9.5,
    valueScore: 8.2,
    availability: 60,
    pros: ["Premium model", "Lightning fast response", "Perfect condition"],
    cons: ["Most expensive", "Limited availability"]
  }
]

// Neighborhood performance data
const neighborhoodData = [
  { name: 'Downtown', avgPrice: 52, safety: 8.5, availability: 85, growth: 12, listings: 245 },
  { name: 'Tech District', avgPrice: 67, safety: 9.2, availability: 78, growth: 18, listings: 189 },
  { name: 'Westside', avgPrice: 41, safety: 7.8, availability: 92, growth: 8, listings: 156 },
  { name: 'Suburbs', avgPrice: 35, safety: 9.0, availability: 95, growth: -3, listings: 134 },
  { name: 'Mountain View', avgPrice: 45, safety: 8.8, availability: 82, growth: 15, listings: 98 }
]

// Value vs Price scatter data
const valueScatterData = propertyComparisons.map(item => ({
  x: item.price,
  y: item.valueScore,
  name: item.name,
  size: item.rating * 20
}))

function PropertyComparisonCard({ property, rank }: { property: typeof propertyComparisons[0], rank: number }) {
  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 2: return 'bg-gray-100 text-gray-800 border-gray-200'
      case 3: return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const getValueColor = (score: number) => {
    if (score >= 9) return 'text-green-600'
    if (score >= 8) return 'text-yellow-600' 
    return 'text-orange-600'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: rank * 0.1 }}
    >
      <Card className="hover:shadow-lg transition-all border-l-4 border-l-purple-500">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`px-2 py-1 rounded-lg border text-sm font-bold ${getRankColor(rank)}`}>
                #{rank}
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{property.name}</h3>
                <p className="text-sm text-gray-600">{property.category}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">${property.price}</p>
              <p className="text-sm text-gray-500">per day</p>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="font-semibold">{property.rating}</span>
              </div>
              <p className="text-xs text-gray-500">Rating</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <MapPin className="h-4 w-4 text-blue-500" />
                <span className="font-semibold">{property.distance}mi</span>
              </div>
              <p className="text-xs text-gray-500">Distance</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="h-4 w-4 text-green-500" />
                <span className="font-semibold">{property.responseTime}min</span>
              </div>
              <p className="text-xs text-gray-500">Response</p>
            </div>
          </div>

          {/* Value Score */}
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Value Score</span>
            </div>
            <span className={`text-lg font-bold ${getValueColor(property.valueScore)}`}>
              {property.valueScore}/10
            </span>
          </div>

          {/* Pros and Cons */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs font-medium text-green-700 mb-2">PROS</p>
              <ul className="space-y-1">
                {property.pros.slice(0, 2).map((pro, index) => (
                  <li key={index} className="text-xs text-green-600 flex items-center gap-1">
                    <div className="w-1 h-1 bg-green-500 rounded-full" />
                    {pro}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-red-700 mb-2">CONS</p>
              <ul className="space-y-1">
                {property.cons.slice(0, 2).map((con, index) => (
                  <li key={index} className="text-xs text-red-600 flex items-center gap-1">
                    <div className="w-1 h-1 bg-red-500 rounded-full" />
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" size="sm">
              View Details
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              Compare
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function SmartComparisons() {
  const [selectedMetric, setSelectedMetric] = useState('avgPrice')
  const [comparisonType, setComparisonType] = useState('properties')

  const metrics = [
    { id: 'avgPrice', label: 'Avg Price', icon: DollarSign },
    { id: 'safety', label: 'Safety', icon: Shield },
    { id: 'availability', label: 'Availability', icon: Clock },
    { id: 'listings', label: 'Listings', icon: BarChart3 }
  ]

  // Radar chart data for property comparison
  const radarData = [
    { subject: 'Price Value', A: 8.5, B: 9.1, C: 7.2 },
    { subject: 'Rating', A: 9.6, B: 9.2, C: 9.8 },
    { subject: 'Location', A: 9.0, B: 7.5, C: 6.5 },
    { subject: 'Response', A: 8.0, B: 6.5, C: 9.5 },
    { subject: 'Availability', A: 9.0, B: 7.5, C: 6.0 },
    { subject: 'Safety', A: 9.2, B: 8.8, C: 9.5 }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Smart Comparisons</h2>
            <p className="text-gray-600">Compare properties and find the best deals</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={comparisonType === 'properties' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setComparisonType('properties')}
          >
            Properties
          </Button>
          <Button
            variant={comparisonType === 'neighborhoods' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setComparisonType('neighborhoods')}
          >
            Neighborhoods
          </Button>
        </div>
      </div>

      {comparisonType === 'properties' && (
        <>
          {/* Property Comparison Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {propertyComparisons.map((property, index) => (
              <PropertyComparisonCard 
                key={property.id} 
                property={property} 
                rank={index + 1} 
              />
            ))}
          </div>

          {/* Detailed Analysis Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Multi-Factor Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis angle={90} domain={[0, 10]} />
                      <Radar name="Canon R5" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} />
                      <Radar name="Canon R6" dataKey="B" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                      <Radar name="Canon R3" dataKey="C" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Value vs Price Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart data={valueScatterData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="x" 
                        name="Price" 
                        unit="$"
                        domain={['dataMin - 10', 'dataMax + 10']}
                      />
                      <YAxis 
                        dataKey="y" 
                        name="Value Score" 
                        domain={[7, 10]}
                      />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        formatter={(value, name) => [value, name === 'x' ? 'Price' : 'Value Score']}
                      />
                      <Scatter dataKey="y" fill="#8b5cf6" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-800">
                    <strong>Sweet Spot:</strong> Look for items in the top-left area (high value, lower price) for the best deals.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {comparisonType === 'neighborhoods' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Neighborhood Performance</CardTitle>
                <div className="flex gap-1">
                  {metrics.map((metric) => {
                    const Icon = metric.icon
                    return (
                      <Button
                        key={metric.id}
                        variant={selectedMetric === metric.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedMetric(metric.id)}
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
                  <BarChart data={neighborhoodData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey={selectedMetric} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Neighborhood Rankings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {neighborhoodData
                  .sort((a, b) => (Number(b[selectedMetric as keyof typeof a]) || 0) - (Number(a[selectedMetric as keyof typeof a]) || 0))
                  .map((neighborhood, index) => (
                    <div key={neighborhood.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' :
                          index === 1 ? 'bg-gray-100 text-gray-800' :
                          index === 2 ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{neighborhood.name}</p>
                          <p className="text-sm text-gray-500">{neighborhood.listings} listings</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">
                          {selectedMetric === 'avgPrice' && '$'}{neighborhood[selectedMetric as keyof typeof neighborhood]}
                          {selectedMetric === 'safety' && '/10'}
                          {selectedMetric === 'availability' && '%'}
                        </p>
                        <div className="flex items-center gap-1 text-xs">
                          {neighborhood.growth > 0 ? (
                            <TrendingUp className="h-3 w-3 text-green-500" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-500" />
                          )}
                          <span className={neighborhood.growth > 0 ? 'text-green-600' : 'text-red-600'}>
                            {Math.abs(neighborhood.growth)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Smart Recommendations */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500 rounded-lg">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-bold">Smart Recommendations</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-lg border border-purple-200">
              <Award className="h-5 w-5 text-purple-500 mb-2" />
              <p className="text-sm font-medium mb-1">Best Overall Value</p>
              <p className="text-xs text-gray-600">Canon EOS R6 offers the perfect balance of price and features</p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-purple-200">
              <MapPin className="h-5 w-5 text-purple-500 mb-2" />
              <p className="text-sm font-medium mb-1">Best Location</p>
              <p className="text-xs text-gray-600">Downtown has the highest concentration of quality rentals</p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-purple-200">
              <Users className="h-5 w-5 text-purple-500 mb-2" />
              <p className="text-sm font-medium mb-1">Community Choice</p>
              <p className="text-xs text-gray-600">Tech District is emerging as the most popular area</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}