'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Wand2, Sparkles, Copy, Check, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth/use-auth'

interface ListingOptimizerProps {
  listingId?: string
  category?: string
  condition?: string
  currentTitle?: string
  currentDescription?: string
  onOptimizationComplete?: (data: {
    title?: string
    description?: string
    suggestions?: string[]
  }) => void
  className?: string
}

interface OptimizationResult {
  title?: string
  description?: string
  suggestions?: string[]
  alternatives?: string[]
}

export default function ListingOptimizer({
  listingId,
  category,
  condition,
  currentTitle,
  currentDescription,
  onOptimizationComplete,
  className = ''
}: ListingOptimizerProps) {
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const { user } = useAuth()

  const optimizeListing = async () => {
    if (!user) return

    setIsOptimizing(true)
    
    try {
      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Please help me optimize my rental listing. 
          Current title: "${currentTitle || 'Not set'}"
          Current description: "${currentDescription || 'Not set'}"
          Category: ${category || 'Not specified'}
          Condition: ${condition || 'Not specified'}
          
          Please provide:
          1. An improved title
          2. An enhanced description
          3. General optimization suggestions`,
          assistantType: 'listing',
          context: {
            listingId,
            category,
            condition
          }
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to optimize listing')
      }

      const data = await response.json()

      if (data.success) {
        // Parse the AI response to extract title, description, and suggestions
        const aiResponse = data.data.message
        const result = parseOptimizationResponse(aiResponse)
        
        setOptimizationResult(result)
        
        if (onOptimizationComplete) {
          onOptimizationComplete(result)
        }
      } else {
        throw new Error(data.error || 'Failed to optimize listing')
      }

    } catch (error) {
      console.error('Listing optimization error:', error)
      
      // Provide fallback suggestions
      const fallbackResult: OptimizationResult = {
        title: currentTitle || `${category || 'Quality Item'} - Available for Rent`,
        description: currentDescription || `This well-maintained ${category || 'item'} is available for rent. Perfect for your needs and competitively priced.`,
        suggestions: [
          'Add more specific details about the item',
          'Include high-quality photos from multiple angles',
          'Set competitive pricing based on similar items',
          'Mention any included accessories or features'
        ]
      }
      
      setOptimizationResult(fallbackResult)
      
      if (onOptimizationComplete) {
        onOptimizationComplete(fallbackResult)
      }
    } finally {
      setIsOptimizing(false)
    }
  }

  const parseOptimizationResponse = (response: string): OptimizationResult => {
    // Simple parsing - in a real implementation, you might want more sophisticated parsing
    const lines = response.split('\n').filter(line => line.trim())
    
    let title = ''
    let description = ''
    const suggestions: string[] = []
    
    let currentSection = ''
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      if (trimmed.toLowerCase().includes('title') && trimmed.includes(':')) {
        currentSection = 'title'
        title = trimmed.split(':').slice(1).join(':').trim()
      } else if (trimmed.toLowerCase().includes('description') && trimmed.includes(':')) {
        currentSection = 'description'
        description = trimmed.split(':').slice(1).join(':').trim()
      } else if (trimmed.toLowerCase().includes('suggestion') || trimmed.startsWith('•') || trimmed.startsWith('-')) {
        currentSection = 'suggestions'
        suggestions.push(trimmed.replace(/^[•-]\s*/, ''))
      } else if (currentSection === 'title' && title && trimmed) {
        title = trimmed
      } else if (currentSection === 'description' && description && trimmed) {
        description += ' ' + trimmed
      } else if (currentSection === 'suggestions' && trimmed) {
        suggestions.push(trimmed)
      }
    }
    
    return {
      title: title || undefined,
      description: description || undefined,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    }
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wand2 className="h-5 w-5 text-blue-600" />
            <span>AI Listing Optimizer</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Let AI help you create compelling titles and descriptions that attract more renters.
            </p>
            
            <Button
              onClick={optimizeListing}
              disabled={isOptimizing}
              className="w-full"
            >
              {isOptimizing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Optimize My Listing
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {optimizationResult && (
        <div className="space-y-4">
          {optimizationResult.title && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Optimized Title</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="font-medium">{optimizationResult.title}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(optimizationResult.title!, 'title')}
                    className="w-full"
                  >
                    {copiedField === 'title' ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Title
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {optimizationResult.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Enhanced Description</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Textarea
                    value={optimizationResult.description}
                    readOnly
                    className="min-h-[100px] resize-none"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(optimizationResult.description!, 'description')}
                    className="w-full"
                  >
                    {copiedField === 'description' ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Description
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {optimizationResult.suggestions && optimizationResult.suggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Optimization Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {optimizationResult.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}