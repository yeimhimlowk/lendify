'use client'

import { useUser } from '@/lib/auth/use-auth'
import { useEffect, useState } from 'react'

export default function DebugAuth() {
  const { user, loading } = useUser()
  const [bookings, setBookings] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetch('/api/bookings')
        .then(res => res.json())
        .then(data => {
          setBookings(data)
        })
        .catch(err => {
          setError(err.message)
        })
    }
  }, [user])

  if (loading) return <div>Loading...</div>

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Debug Auth & Bookings</h1>
      
      <h2>Current User:</h2>
      <pre>{JSON.stringify(user, null, 2)}</pre>
      
      <h2>Bookings Response:</h2>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      <pre>{JSON.stringify(bookings, null, 2)}</pre>
      
      <h2>Quick Actions:</h2>
      <button onClick={() => window.location.href = '/dashboard/bookings'}>
        Go to Bookings Page
      </button>
    </div>
  )
}