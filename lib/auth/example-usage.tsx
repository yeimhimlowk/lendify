/**
 * Example usage of the authentication system
 * This file demonstrates how to use the auth hooks and context in components
 */

import { useAuth, useUser, useRequireAuth, useProfileComplete } from '@/lib/auth'

// Example 1: Basic authentication check
export function ExampleUserStatus() {
  const { user, profile, loading, isAuthenticated } = useUser()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return <div>Please log in</div>
  }

  return (
    <div>
      <h2>Welcome, {profile?.full_name || user?.email}!</h2>
      <p>Email: {user?.email}</p>
      <p>Verified: {profile?.verified ? 'Yes' : 'No'}</p>
    </div>
  )
}

// Example 2: Protected component with redirect
export function ExampleProtectedComponent() {
  const { user, profile, loading } = useRequireAuth()

  if (loading) {
    return <div>Checking authentication...</div>
  }

  // This component will only render if user is authenticated
  // Otherwise, they'll be redirected to login
  return (
    <div>
      <h2>Protected Content</h2>
      <p>Only authenticated users can see this</p>
      <p>User ID: {user?.id}</p>
      <p>Profile ID: {profile?.id}</p>
    </div>
  )
}

// Example 3: Using auth methods
export function ExampleAuthActions() {
  const { signIn, signUp, signOut, loading, error } = useAuth()

  const handleSignIn = async () => {
    try {
      await signIn('user@example.com', 'password')
      console.log('Signed in successfully')
    } catch (err) {
      console.error('Sign in failed:', err)
    }
  }

  const handleSignUp = async () => {
    try {
      await signUp('newuser@example.com', 'password', 'John Doe')
      console.log('Signed up successfully')
    } catch (err) {
      console.error('Sign up failed:', err)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      console.log('Signed out successfully')
    } catch (err) {
      console.error('Sign out failed:', err)
    }
  }

  return (
    <div>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      <button onClick={handleSignIn} disabled={loading}>
        Sign In
      </button>
      <button onClick={handleSignUp} disabled={loading}>
        Sign Up
      </button>
      <button onClick={handleSignOut} disabled={loading}>
        Sign Out
      </button>
    </div>
  )
}

// Example 4: Profile completion check
export function ExampleProfileCheck() {
  const { isComplete, missingFields, profile } = useProfileComplete()

  if (!profile) {
    return <div>No profile found</div>
  }

  if (isComplete) {
    return <div>Your profile is complete!</div>
  }

  return (
    <div>
      <h3>Please complete your profile</h3>
      <p>Missing fields:</p>
      <ul>
        {missingFields.map((field) => (
          <li key={field}>{field.replace('_', ' ')}</li>
        ))}
      </ul>
    </div>
  )
}

// Example 5: Password reset
export function ExamplePasswordReset() {
  const { resetPassword, updatePassword, loading } = useAuth()

  const handleResetPassword = async (email: string) => {
    try {
      await resetPassword(email)
      alert('Password reset email sent!')
    } catch (err) {
      console.error('Password reset failed:', err)
    }
  }

  const handleUpdatePassword = async (newPassword: string) => {
    try {
      await updatePassword(newPassword)
      alert('Password updated successfully!')
    } catch (err) {
      console.error('Password update failed:', err)
    }
  }

  return (
    <div>
      <button 
        onClick={() => handleResetPassword('user@example.com')} 
        disabled={loading}
      >
        Send Reset Email
      </button>
      <button 
        onClick={() => handleUpdatePassword('newPassword123')} 
        disabled={loading}
      >
        Update Password
      </button>
    </div>
  )
}