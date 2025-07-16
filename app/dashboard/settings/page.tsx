"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth/auth-context"
import { User, Shield, MapPin, Bell, Save, Loader2 } from "lucide-react"
import { SettingsSection } from "@/components/settings/SettingsSection"
import { SettingsNotification } from "@/components/settings/SettingsNotification"
import { AvatarUpload } from "@/components/settings/AvatarUpload"

export default function SettingsPage() {
  const { user, profile, updateProfile, updatePassword, loading } = useAuth()
  const [activeTab, setActiveTab] = useState("profile")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Profile form state - sync with profile changes
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone: "",
    address: ""
  })

  // Security form state
  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        address: profile.address || ""
      })
    }
  }, [profile])

  // Avatar upload handlers
  const handleAvatarUploadSuccess = async (avatarUrl: string) => {
    try {
      const { error } = await updateProfile({ avatar_url: avatarUrl })
      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'Profile photo updated successfully!' })
      }
    } catch (_err) {
      setMessage({ type: 'error', text: 'Failed to update profile photo' })
    }
  }

  const handleAvatarUploadError = (error: string) => {
    setMessage({ type: 'error', text: error })
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const { error } = await updateProfile(profileForm)
      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'Profile updated successfully!' })
      }
    } catch (_err) {
      setMessage({ type: 'error', text: 'Failed to update profile' })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }

    if (securityForm.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long' })
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      const { error } = await updatePassword(securityForm.newPassword)
      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'Password updated successfully!' })
        setSecurityForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
      }
    } catch (_err) {
      setMessage({ type: 'error', text: 'Failed to update password' })
    } finally {
      setIsLoading(false)
    }
  }


  const tabs = [
    { id: "profile", label: "Profile", icon: User, description: "Personal information and photo" },
    { id: "security", label: "Security", icon: Shield, description: "Password and account security" },
    { id: "location", label: "Location", icon: MapPin, description: "Address and location settings" },
    { id: "notifications", label: "Notifications", icon: Bell, description: "Email and push preferences" }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading your settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences and security settings
        </p>
      </div>

      {/* Message Display */}
      {message && (
        <SettingsNotification
          type={message.type}
          message={message.text}
          onDismiss={() => setMessage(null)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardContent className="p-0">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-start gap-3 p-4 text-left transition-all duration-200 hover:bg-gray-50 ${
                        activeTab === tab.id
                          ? 'bg-primary/5 text-primary border-r-2 border-primary'
                          : 'text-gray-700'
                      }`}
                    >
                      <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                        activeTab === tab.id ? 'text-primary' : 'text-gray-400'
                      }`} />
                      <div>
                        <div className="font-medium">{tab.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {tab.description}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Profile Settings */}
          {activeTab === "profile" && (
            <SettingsSection
              title="Profile Information"
              description="Update your personal information, profile photo, and public details"
              icon={<User className="h-5 w-5 text-primary" />}
            >
              <div className="space-y-8">
                {/* Avatar Section */}
                <AvatarUpload
                  currentAvatarUrl={profile?.avatar_url}
                  userName={profile?.full_name}
                  userEmail={user?.email}
                  userId={user?.id}
                  onUploadSuccess={handleAvatarUploadSuccess}
                  onUploadError={handleAvatarUploadError}
                />

                {/* Profile Form */}
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">Full Name</label>
                      <Input
                        value={profileForm.full_name}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                        placeholder="Enter your full name"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">Email Address</label>
                      <Input
                        value={user?.email || ""}
                        disabled
                        className="h-11 bg-gray-50 text-gray-500"
                      />
                      <p className="text-xs text-muted-foreground">
                        Email cannot be changed. Contact support if needed.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">Phone Number</label>
                      <Input
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Enter your phone number"
                        type="tel"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">Verification Status</label>
                      <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
                        profile?.verified 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                      }`}>
                        {profile?.verified ? '✓ Verified Account' : '⚠ Pending Verification'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">Address</label>
                    <Input
                      value={profileForm.address}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Enter your address"
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      Your address helps us show you relevant nearby listings
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="px-6"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </SettingsSection>
          )}

          {/* Security Settings */}
          {activeTab === "security" && (
            <SettingsSection
              title="Security Settings"
              description="Manage your password and account security preferences"
              icon={<Shield className="h-5 w-5 text-red-600" />}
            >
                <form onSubmit={handlePasswordUpdate} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">Current Password</label>
                    <Input
                      type="password"
                      value={securityForm.currentPassword}
                      onChange={(e) => setSecurityForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="Enter your current password"
                      className="h-11"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">New Password</label>
                      <Input
                        type="password"
                        value={securityForm.newPassword}
                        onChange={(e) => setSecurityForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Enter new password"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">Confirm New Password</label>
                      <Input
                        type="password"
                        value={securityForm.confirmPassword}
                        onChange={(e) => setSecurityForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Confirm new password"
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-3">Password Requirements</h4>
                    <ul className="text-sm text-blue-800 space-y-2">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                        At least 8 characters long
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                        Include both uppercase and lowercase letters
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                        Include at least one number
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                        Include at least one special character
                      </li>
                    </ul>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      variant="destructive"
                      className="px-6"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 mr-2" />
                          Update Password
                        </>
                      )}
                    </Button>
                  </div>
                </form>
            </SettingsSection>
          )}

          {/* Location Settings */}
          {activeTab === "location" && (
            <SettingsSection
              title="Location Settings"
              description="Manage your location preferences for better recommendations"
              icon={<MapPin className="h-5 w-5 text-green-600" />}
            >
              <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 p-6 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <MapPin className="h-5 w-5 text-amber-600" />
                    </div>
                    <h4 className="font-semibold text-amber-900">Enhanced Location Features</h4>
                  </div>
                  <p className="text-amber-800 mb-4">
                    Advanced location settings with interactive map integration will be available in a future update.
                  </p>
                  <Button variant="outline" size="sm" disabled>
                    Coming Soon
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">Current Address</label>
                    <Input
                      value={profile?.address || "Not set"}
                      disabled
                      className="h-11 bg-gray-50 text-gray-500"
                    />
                    <p className="text-xs text-muted-foreground">
                      Update your address in the Profile section to change your location.
                    </p>
                  </div>
                </div>
              </div>
            </SettingsSection>
          )}

          {/* Notifications Settings */}
          {activeTab === "notifications" && (
            <SettingsSection
              title="Notification Preferences"
              description="Choose how and when you want to receive notifications"
              icon={<Bell className="h-5 w-5 text-purple-600" />}
            >
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Bell className="h-5 w-5 text-blue-600" />
                    </div>
                    <h4 className="font-semibold text-blue-900">Enhanced Notifications</h4>
                  </div>
                  <p className="text-blue-800 mb-4">
                    Detailed notification preferences and email/SMS settings will be available in a future update.
                  </p>
                  <Button variant="outline" size="sm" disabled>
                    Coming Soon
                  </Button>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">Email Notifications</h4>
                      <p className="text-sm text-muted-foreground">
                        Receive updates about bookings, messages, and important account changes
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input 
                        type="checkbox" 
                        defaultChecked 
                        disabled
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary opacity-50" 
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">SMS Notifications</h4>
                      <p className="text-sm text-muted-foreground">
                        Receive urgent notifications and booking confirmations via SMS
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input 
                        type="checkbox" 
                        disabled
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary opacity-50" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </SettingsSection>
          )}
        </div>
      </div>
    </div>
  )
}