"use client"

import Header from "@/components/layout/Header"
import { useUser } from "@/lib/auth/use-auth"

export default function TestHeaderPage() {
  const { user, profile, loading, isAuthenticated } = useUser()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-4xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-6">Header Authentication Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <span className="font-semibold">Loading State:</span>{" "}
            <span className={loading ? "text-yellow-600" : "text-green-600"}>
              {loading ? "Loading..." : "Ready"}
            </span>
          </div>
          
          <div>
            <span className="font-semibold">Authentication Status:</span>{" "}
            <span className={isAuthenticated ? "text-green-600" : "text-red-600"}>
              {isAuthenticated ? "Authenticated" : "Not Authenticated"}
            </span>
          </div>
          
          {user && (
            <>
              <div>
                <span className="font-semibold">User Email:</span> {user.email}
              </div>
              
              <div>
                <span className="font-semibold">User ID:</span> {user.id}
              </div>
            </>
          )}
          
          {profile && (
            <>
              <div>
                <span className="font-semibold">Profile Name:</span>{" "}
                {profile.full_name || "Not set"}
              </div>
              
              <div>
                <span className="font-semibold">Avatar URL:</span>{" "}
                {profile.avatar_url || "Not set"}
              </div>
            </>
          )}
        </div>
        
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h2 className="font-semibold mb-2">Test Instructions:</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Click the user menu button in the header</li>
            <li>If not authenticated, you should see &quot;Sign up&quot; and &quot;Log in&quot; options</li>
            <li>If authenticated, you should see your email, navigation links, and &quot;Log out&quot;</li>
            <li>The avatar should show your initials or profile photo if available</li>
            <li>The loading state should show a spinner during auth initialization</li>
          </ol>
        </div>
      </main>
    </div>
  )
}