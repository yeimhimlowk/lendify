"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function TestDashboard() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to dashboard after a short delay
    const timer = setTimeout(() => {
      router.push("/dashboard")
    }, 100)
    
    return () => clearTimeout(timer)
  }, [router])
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Redirecting to Dashboard...</h1>
        <p className="text-gray-600">Please wait while we load your dashboard</p>
      </div>
    </div>
  )
}