// OpenRouter API integration for AI assistant functionality

// OpenRouter API configuration
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

// Default model - updated to Claude 3.5 Haiku for faster responses
const DEFAULT_MODEL = 'anthropic/claude-3-5-haiku-20241022'

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenRouterResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface AIAssistantConfig {
  model?: string
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
}

/**
 * Make a request to OpenRouter API
 */
export async function callOpenRouter(
  messages: OpenRouterMessage[],
  config: AIAssistantConfig = {}
): Promise<OpenRouterResponse> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured')
  }

  const {
    model = DEFAULT_MODEL,
    maxTokens = 1000,
    temperature = 0.7,
  } = config

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'Lendify AI Assistant',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: false,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    console.error('OpenRouter API error:', {
      status: response.status,
      statusText: response.statusText,
      error: error
    })
    throw new Error(`OpenRouter API error: ${response.status} ${error.error?.message || error.message || response.statusText}`)
  }

  const data = await response.json()
  
  if (!data || typeof data !== 'object') {
    console.error('Invalid response from OpenRouter:', data)
    throw new Error('Invalid response format from OpenRouter API')
  }
  
  return data
}

/**
 * Create a general-purpose AI assistant that can help with various tasks
 */
export async function createAIAssistant(
  userMessage: string,
  context?: {
    conversationHistory?: OpenRouterMessage[]
    systemPrompt?: string
    userContext?: any
  }
): Promise<string> {
  const {
    conversationHistory = [],
    systemPrompt = `You are a helpful AI assistant for Lendify, a peer-to-peer rental platform. 
    You help users with various tasks including:
    - Answering questions about rentals and the platform
    - Providing recommendations and advice
    - Helping with listing optimization
    - General customer support
    
    Be friendly, helpful, and concise in your responses. Focus on providing practical value to users.`,
    userContext
  } = context || {}

  const messages: OpenRouterMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ]

  // Add user context if provided
  if (userContext) {
    messages.splice(1, 0, {
      role: 'system',
      content: `User context: ${JSON.stringify(userContext, null, 2)}`
    })
  }

  const response = await callOpenRouter(messages, {
    model: DEFAULT_MODEL,
    maxTokens: 1000,
    temperature: 0.7,
  })

  return response.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.'
}

/**
 * Create an AI assistant specialized for listing optimization
 */
export async function createListingAssistant(
  userMessage: string,
  listingContext?: {
    category?: string
    condition?: string
    photos?: string[]
    existingTitle?: string
    existingDescription?: string
  }
): Promise<string> {
  const systemPrompt = `You are a specialized AI assistant for optimizing rental listings on Lendify. 
  You help users create compelling titles, descriptions, and improve their listings to attract more renters.
  
  Your expertise includes:
  - Writing engaging listing titles
  - Creating detailed, attractive descriptions
  - Suggesting optimal pricing strategies
  - Recommending photo improvements
  - Identifying listing optimization opportunities
  
  Always provide specific, actionable advice tailored to the rental market.`

  const contextMessage = listingContext ? 
    `Current listing context: ${JSON.stringify(listingContext, null, 2)}` : 
    ''

  const messages: OpenRouterMessage[] = [
    { role: 'system', content: systemPrompt },
    ...(contextMessage ? [{ role: 'system' as const, content: contextMessage }] : []),
    { role: 'user', content: userMessage }
  ]

  const response = await callOpenRouter(messages, {
    model: DEFAULT_MODEL,
    maxTokens: 800,
    temperature: 0.6,
  })

  return response.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.'
}

/**
 * Create an AI assistant for customer support
 */
export async function createSupportAssistant(
  userMessage: string,
  supportContext?: {
    userType?: 'renter' | 'lender' | 'both'
    issueType?: string
    urgency?: 'low' | 'medium' | 'high'
  }
): Promise<string> {
  const systemPrompt = `You are a customer support AI assistant for Lendify. 
  You help users resolve issues, answer questions, and provide guidance on using the platform.
  
  Common areas you help with:
  - Account and profile management
  - Booking and rental processes
  - Payment and billing questions
  - Platform features and how-to guides
  - Dispute resolution guidance
  - Safety and security best practices
  
  Always be empathetic, professional, and provide clear step-by-step solutions when possible.`

  const contextMessage = supportContext ? 
    `Support context: ${JSON.stringify(supportContext, null, 2)}` : 
    ''

  const messages: OpenRouterMessage[] = [
    { role: 'system', content: systemPrompt },
    ...(contextMessage ? [{ role: 'system' as const, content: contextMessage }] : []),
    { role: 'user', content: userMessage }
  ]

  const response = await callOpenRouter(messages, {
    model: DEFAULT_MODEL,
    maxTokens: 800,
    temperature: 0.5,
  })

  return response.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.'
}

/**
 * Create Lena - The specialized chat assistant for Lendify
 */
export async function createLenaAssistant(
  userMessage: string,
  context?: {
    conversationHistory?: OpenRouterMessage[]
    userContext?: any
  }
): Promise<string> {
  const {
    conversationHistory = [],
    userContext
  } = context || {}

  const systemPrompt = `You are Lena, the friendly AI chat assistant for Lendify, a peer-to-peer rental platform.

  Your personality:
  - Warm, approachable, and helpful
  - Enthusiastic about helping users get the most out of the platform
  - Knowledgeable about rentals, sharing economy, and peer-to-peer transactions
  - Professional but conversational
  - Proactive in offering relevant suggestions

  Your expertise includes:
  - Helping users find the perfect rental items
  - Assisting with listing creation and optimization
  - Providing guidance on rental processes and best practices
  - Answering questions about pricing, availability, and bookings
  - Offering tips for both renters and lenders
  - Resolving common platform issues
  - Suggesting alternatives when specific items aren't available
  - Providing safety and security advice

  Communication style:
  - Use a friendly, conversational tone
  - Be concise but thorough
  - Ask follow-up questions to better understand user needs
  - Offer specific, actionable advice
  - Show enthusiasm for helping users succeed on the platform

  Always aim to make users feel welcomed and supported while helping them achieve their rental goals.`

  const messages: OpenRouterMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ]

  // Add user context if provided
  if (userContext) {
    messages.splice(1, 0, {
      role: 'system',
      content: `User context: ${JSON.stringify(userContext, null, 2)}`
    })
  }

  const response = await callOpenRouter(messages, {
    model: DEFAULT_MODEL,
    maxTokens: 1000,
    temperature: 0.7,
  })

  return response.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.'
}

/**
 * Get available models from OpenRouter
 */
export async function getAvailableModels(): Promise<any[]> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured')
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.statusText}`)
  }

  const data = await response.json()
  return data.data || []
}

/**
 * Generate a rental agreement using Claude Sonnet
 */
export async function generateRentalAgreement(
  details: {
    renterName: string
    ownerName: string
    listingTitle: string
    listingDescription?: string
    startDate: string
    endDate: string
    totalPrice: number
    pricePerDay: number
    listingAddress?: string
    category?: string
    condition?: string
    deposit?: number
    specialTerms?: string
  }
): Promise<string> {
  const systemPrompt = `You are a legal document generator specializing in rental agreements. 
  Create a comprehensive, legally binding rental agreement that protects both parties.
  
  The agreement should include:
  1. Clear identification of parties (Renter and Owner)
  2. Detailed description of the rental item(s)
  3. Rental period and dates
  4. Payment terms and amounts
  5. Security deposit (if applicable)
  6. Responsibilities of both parties
  7. Damage and liability clauses
  8. Cancellation and refund policies
  9. Dispute resolution procedures
  10. Governing law and jurisdiction
  11. Signature blocks for both parties
  
  Use clear, professional language that is easy to understand while being legally comprehensive.
  Format the agreement properly with sections and subsections.`

  const userMessage = `Generate a rental agreement with the following details:
  
  Renter: ${details.renterName}
  Owner: ${details.ownerName}
  Item: ${details.listingTitle}
  ${details.listingDescription ? `Description: ${details.listingDescription}` : ''}
  ${details.category ? `Category: ${details.category}` : ''}
  ${details.condition ? `Condition: ${details.condition}` : ''}
  Rental Period: ${details.startDate} to ${details.endDate}
  Total Rental Price: $${details.totalPrice}
  Daily Rate: $${details.pricePerDay}
  ${details.deposit ? `Security Deposit: $${details.deposit}` : ''}
  ${details.listingAddress ? `Location: ${details.listingAddress}` : ''}
  ${details.specialTerms ? `Special Terms: ${details.specialTerms}` : ''}
  
  Platform: Lendify (peer-to-peer rental marketplace)
  
  Please generate a comprehensive rental agreement that legally binds both parties and includes provisions for:
  - Item damage or loss
  - Late returns
  - Proper use and care
  - Insurance requirements
  - Emergency contacts
  - Platform dispute resolution through Lendify`

  const messages: OpenRouterMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ]

  // Use Claude Sonnet for better quality legal documents
  const response = await callOpenRouter(messages, {
    model: 'anthropic/claude-3.5-sonnet-20241022',
    maxTokens: 4000,
    temperature: 0.3, // Lower temperature for more consistent legal language
  })
  
  if (!response.choices || response.choices.length === 0) {
    console.error('OpenRouter response:', response)
    throw new Error('No response from AI model')
  }

  return response.choices[0]?.message?.content || 'Failed to generate rental agreement.'
}

/**
 * Utility function to truncate conversation history to stay within token limits
 */
export function truncateConversationHistory(
  messages: OpenRouterMessage[],
  maxMessages: number = 20
): OpenRouterMessage[] {
  if (messages.length <= maxMessages) {
    return messages
  }

  // Keep system messages and the most recent user messages
  const systemMessages = messages.filter(msg => msg.role === 'system')
  const nonSystemMessages = messages.filter(msg => msg.role !== 'system')
  
  const recentMessages = nonSystemMessages.slice(-maxMessages)
  
  return [...systemMessages, ...recentMessages]
}