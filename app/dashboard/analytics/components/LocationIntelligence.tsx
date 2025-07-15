"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin } from "lucide-react"

export default function LocationIntelligence() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-r from-green-500 to-teal-500 rounded-xl">
          <MapPin className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Location Intelligence</h2>
          <p className="text-gray-600">Neighborhood insights and safety scores</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Neighborhood Analytics & Safety Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-gray-500">Location intelligence features coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}