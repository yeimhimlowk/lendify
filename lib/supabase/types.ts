export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_analysis_cache: {
        Row: {
          claude_content: Json | null
          created_at: string | null
          gemma_analysis: Json | null
          id: string
          listing_id: string
        }
        Insert: {
          claude_content?: Json | null
          created_at?: string | null
          gemma_analysis?: Json | null
          id?: string
          listing_id: string
        }
        Update: {
          claude_content?: Json | null
          created_at?: string | null
          gemma_analysis?: Json | null
          id?: string
          listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_analysis_cache_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          action: string
          content_type: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          success: boolean | null
          user_id: string | null
        }
        Insert: {
          action: string
          content_type?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          success?: boolean | null
          user_id?: string | null
        }
        Update: {
          action?: string
          content_type?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          success?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          listing_id: string
          owner_id: string
          renter_id: string
          start_date: string
          status: string | null
          total_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          listing_id: string
          owner_id: string
          renter_id: string
          start_date: string
          status?: string | null
          total_price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          listing_id?: string
          owner_id?: string
          renter_id?: string
          start_date?: string
          status?: string | null
          total_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          context: Json | null
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_analytics: {
        Row: {
          bookings: number | null
          clicks: number | null
          date: string
          id: string
          listing_id: string
          revenue: number | null
          views: number | null
        }
        Insert: {
          bookings?: number | null
          clicks?: number | null
          date: string
          id?: string
          listing_id: string
          revenue?: number | null
          views?: number | null
        }
        Update: {
          bookings?: number | null
          clicks?: number | null
          date?: string
          id?: string
          listing_id?: string
          revenue?: number | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_analytics_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          address: string | null
          ai_generated_description: string | null
          ai_generated_title: string | null
          ai_price_suggestion: number | null
          availability: Json | null
          category_id: string | null
          condition: string | null
          created_at: string | null
          deposit_amount: number | null
          description: string | null
          id: string
          location: unknown | null
          owner_id: string
          photos: string[] | null
          price_per_day: number
          price_per_month: number | null
          price_per_week: number | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          ai_generated_description?: string | null
          ai_generated_title?: string | null
          ai_price_suggestion?: number | null
          availability?: Json | null
          category_id?: string | null
          condition?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          description?: string | null
          id?: string
          location?: unknown | null
          owner_id: string
          photos?: string[] | null
          price_per_day: number
          price_per_month?: number | null
          price_per_week?: number | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          ai_generated_description?: string | null
          ai_generated_title?: string | null
          ai_price_suggestion?: number | null
          availability?: Json | null
          category_id?: string | null
          condition?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          description?: string | null
          id?: string
          location?: unknown | null
          owner_id?: string
          photos?: string[] | null
          price_per_day?: number
          price_per_month?: number | null
          price_per_week?: number | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          booking_id: string | null
          content: string
          created_at: string | null
          id: string
          is_ai_response: boolean | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          booking_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_ai_response?: boolean | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          booking_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_ai_response?: boolean | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_agreements: {
        Row: {
          id: string
          booking_id: string
          agreement_text: string
          custom_terms: string | null
          status: string
          created_by: string
          signed_by_renter: boolean
          signed_by_owner: boolean
          renter_signature_data: Json | null
          owner_signature_data: Json | null
          renter_signed_at: string | null
          owner_signed_at: string | null
          sent_at: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          agreement_text: string
          custom_terms?: string | null
          status?: string
          created_by: string
          signed_by_renter?: boolean
          signed_by_owner?: boolean
          renter_signature_data?: Json | null
          owner_signature_data?: Json | null
          renter_signed_at?: string | null
          owner_signed_at?: string | null
          sent_at?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          agreement_text?: string
          custom_terms?: string | null
          status?: string
          created_by?: string
          signed_by_renter?: boolean
          signed_by_owner?: boolean
          renter_signature_data?: Json | null
          owner_signature_data?: Json | null
          renter_signed_at?: string | null
          owner_signed_at?: string | null
          sent_at?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_agreements_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_agreements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          location: unknown | null
          phone: string | null
          rating: number | null
          verified: boolean | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          location?: unknown | null
          phone?: string | null
          rating?: number | null
          verified?: boolean | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          location?: unknown | null
          phone?: string | null
          rating?: number | null
          verified?: boolean | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string | null
          id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      search_analytics: {
        Row: {
          created_at: string
          filters: Json | null
          id: string
          query: string
          results_count: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          filters?: Json | null
          id?: string
          query: string
          results_count?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          filters?: Json | null
          id?: string
          query?: string
          results_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      listing_stats: {
        Row: {
          avg_rating: number | null
          clicks_last_30_days: number | null
          listing_id: string | null
          review_count: number | null
          successful_bookings: number | null
          total_bookings: number | null
          views_last_30_days: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      increment_listing_views: {
        Args: {
          listing_id: string
        }
        Returns: undefined
      }
      listings_within_radius: {
        Args: {
          lat: number
          lng: number
          radius_meters: number
        }
        Returns: {
          address: string | null
          ai_generated_description: string | null
          ai_generated_title: string | null
          ai_price_suggestion: number | null
          availability: Json | null
          category_id: string | null
          condition: string | null
          created_at: string | null
          deposit_amount: number | null
          description: string | null
          id: string
          location: unknown | null
          owner_id: string
          photos: string[] | null
          price_per_day: number | null
          price_per_month: number | null
          price_per_week: number | null
          status: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Utility types for common operations
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Listing = Database['public']['Tables']['listings']['Row']
export type ListingInsert = Database['public']['Tables']['listings']['Insert']
export type ListingUpdate = Database['public']['Tables']['listings']['Update']

export type Category = Database['public']['Tables']['categories']['Row']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type CategoryUpdate = Database['public']['Tables']['categories']['Update']

export type Booking = Database['public']['Tables']['bookings']['Row']
export type BookingInsert = Database['public']['Tables']['bookings']['Insert']
export type BookingUpdate = Database['public']['Tables']['bookings']['Update']

export type RentalAgreement = Database['public']['Tables']['rental_agreements']['Row']
export type RentalAgreementInsert = Database['public']['Tables']['rental_agreements']['Insert']
export type RentalAgreementUpdate = Database['public']['Tables']['rental_agreements']['Update']

export type Review = Database['public']['Tables']['reviews']['Row']
export type ReviewInsert = Database['public']['Tables']['reviews']['Insert']
export type ReviewUpdate = Database['public']['Tables']['reviews']['Update']

export type Message = Database['public']['Tables']['messages']['Row']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']
export type MessageUpdate = Database['public']['Tables']['messages']['Update']

export type ChatSession = Database['public']['Tables']['chat_sessions']['Row']
export type ChatSessionInsert = Database['public']['Tables']['chat_sessions']['Insert']
export type ChatSessionUpdate = Database['public']['Tables']['chat_sessions']['Update']

export type ListingAnalytics = Database['public']['Tables']['listing_analytics']['Row']
export type ListingAnalyticsInsert = Database['public']['Tables']['listing_analytics']['Insert']
export type ListingAnalyticsUpdate = Database['public']['Tables']['listing_analytics']['Update']

export type AIUsageLog = Database['public']['Tables']['ai_usage_logs']['Row']
export type AIUsageLogInsert = Database['public']['Tables']['ai_usage_logs']['Insert']
export type AIUsageLogUpdate = Database['public']['Tables']['ai_usage_logs']['Update']

export type SearchAnalytics = Database['public']['Tables']['search_analytics']['Row']
export type SearchAnalyticsInsert = Database['public']['Tables']['search_analytics']['Insert']
export type SearchAnalyticsUpdate = Database['public']['Tables']['search_analytics']['Update']

export type AIAnalysisCache = Database['public']['Tables']['ai_analysis_cache']['Row']
export type AIAnalysisCacheInsert = Database['public']['Tables']['ai_analysis_cache']['Insert']
export type AIAnalysisCacheUpdate = Database['public']['Tables']['ai_analysis_cache']['Update']

export type ListingStats = Database['public']['Views']['listing_stats']['Row']

// Extended types with joins
export type ListingWithCategory = Listing & {
  category: Category | null
}

export type ListingWithOwner = Listing & {
  owner: Profile
}

export type ListingWithDetails = Listing & {
  category: Category | null
  owner: Profile
  stats?: ListingStats
}

export type BookingWithDetails = Booking & {
  listing: Listing
  renter: Profile
  owner: Profile
}

export type ReviewWithDetails = Review & {
  reviewer: Profile
  reviewee: Profile
  booking: Booking
}

// Status enums (based on check constraints in the schema)
export type ListingStatus = 'active' | 'inactive' | 'pending' | 'deleted'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'
export type ItemCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor'