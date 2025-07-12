// Re-export all auth utilities
export { AuthProvider, useAuthContext } from './auth-context'
export { 
  useAuth, 
  useUser, 
  useRequireAuth, 
  useProfileComplete,
  usePostLoginRedirect 
} from './use-auth'