"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap } from "lucide-react"

export default function PredictiveInsights() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl">
          <Zap className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Predictive Insights</h2>
          <p className="text-gray-600">AI-powered predictions for optimal rental timing</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Price Predictions & Optimal Booking Windows</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-gray-500">Predictive analytics features coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}