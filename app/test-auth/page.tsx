'use client'

import { AuthDebug } from '@/components/auth/auth-debug'

export default function TestAuthPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Authentication Test Page</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <AuthDebug />
        </div>
      </div>
    </div>
  )
}