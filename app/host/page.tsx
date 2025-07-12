'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createListingSchema, type CreateListingInput } from '@/lib/api/schemas'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import Header from '@/components/layout/Header'
import BasicInfoStep from './steps/BasicInfoStep'
import PricingStep from './steps/PricingStep'
import LocationStep from './steps/LocationStep'
import PhotosStep from './steps/PhotosStep'
import DetailsStep from './steps/DetailsStep'
import ReviewStep from './steps/ReviewStep'

const steps = [
  { id: 1, name: 'Basic Info', component: BasicInfoStep },
  { id: 2, name: 'Pricing', component: PricingStep },
  { id: 3, name: 'Location', component: LocationStep },
  { id: 4, name: 'Photos', component: PhotosStep },
  { id: 5, name: 'Details', component: DetailsStep },
  { id: 6, name: 'Review', component: ReviewStep }
]

export default function CreateListingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [previousStep, setPreviousStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const methods = useForm<CreateListingInput>({
    resolver: zodResolver(createListingSchema),
    defaultValues: {
      title: '',
      description: '',
      category_id: '',
      price_per_day: 0,
      condition: 'good',
      address: '',
      location: { lat: 0, lng: 0 },
      photos: [],
      tags: [],
      status: 'draft'
    },
    mode: 'onBlur' // Changed from 'onChange' to 'onBlur' to reduce validation noise
  })

  const { handleSubmit, watch } = methods
  const formData = watch()

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      saveDraft()
    }, 30000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData])

  const saveDraft = async () => {
    try {
      // TODO: Implement API call to save draft
      localStorage.setItem('listing-draft', JSON.stringify(formData))
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 3000)
    } catch (error) {
      console.error('Failed to save draft:', error)
    }
  }

  const onSubmit = async (data: CreateListingInput) => {
    setIsSubmitting(true)
    try {
      // TODO: Implement API call to create listing
      console.log('Creating listing:', data)
      localStorage.removeItem('listing-draft')
      router.push('/dashboard')
    } catch (error) {
      console.error('Failed to create listing:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextStep = async () => {
    const fields = getFieldsForStep(currentStep)
    const isValid = await methods.trigger(fields)
    
    if (isValid && currentStep < steps.length) {
      setIsAnimating(true)
      setPreviousStep(currentStep)
      setCurrentStep(currentStep + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setTimeout(() => setIsAnimating(false), 1200)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setIsAnimating(true)
      setPreviousStep(currentStep)
      setCurrentStep(currentStep - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setTimeout(() => setIsAnimating(false), 1200)
    }
  }

  const goToStep = async (step: number) => {
    if (step < currentStep) {
      setIsAnimating(true)
      setPreviousStep(currentStep)
      setCurrentStep(step)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setTimeout(() => setIsAnimating(false), 1200)
    } else if (step > currentStep) {
      // Validate all steps up to the target step
      for (let i = currentStep; i < step; i++) {
        const fields = getFieldsForStep(i)
        const isValid = await methods.trigger(fields)
        if (!isValid) {
          setCurrentStep(i)
          window.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }
      }
      setIsAnimating(true)
      setPreviousStep(currentStep)
      setCurrentStep(step)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setTimeout(() => setIsAnimating(false), 1200)
    }
  }

  const getFieldsForStep = (step: number): (keyof CreateListingInput)[] => {
    switch (step) {
      case 1:
        return ['title', 'description', 'category_id', 'condition']
      case 2:
        return ['price_per_day', 'price_per_week', 'price_per_month', 'deposit_amount']
      case 3:
        return ['address', 'location']
      case 4:
        return ['photos']
      case 5:
        return ['tags']
      default:
        return []
    }
  }

  const CurrentStepComponent = steps[currentStep - 1].component

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">List Your Item</h1>
            <p className="mt-2 text-gray-600">
              Share your items with the community and start earning
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between relative">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-center",
                    index !== steps.length - 1 && "flex-1"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => goToStep(step.id)}
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-all z-10 relative",
                      currentStep >= step.id
                        ? "bg-[var(--primary)] text-white"
                        : "bg-gray-200 text-gray-600",
                      currentStep === step.id && "ring-2 ring-offset-2 ring-[var(--primary)]"
                    )}
                  >
                    {step.id}
                    
                    {/* Splash effect when orb arrives */}
                    {isAnimating && currentStep === step.id && previousStep === step.id - 1 && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="splash-ripple splash-ripple-1" />
                        <div className="splash-ripple splash-ripple-2" />
                        <div className="splash-ripple splash-ripple-3" />
                        <div className="splash-ripple splash-ripple-4" />
                      </div>
                    )}
                    
                    {/* Pulse glow effect when hit */}
                    {isAnimating && currentStep === step.id && previousStep === step.id - 1 && (
                      <div className="absolute inset-0 rounded-full animate-pulse-glow bg-[var(--primary)]" />
                    )}
                  </button>
                  {index !== steps.length - 1 && (
                    <div className="flex-1 h-1 mx-2 relative overflow-visible">
                      {/* Background line */}
                      <div className="absolute inset-0 bg-gray-200" />
                      
                      {/* Filled line */}
                      <div
                        className={cn(
                          "absolute inset-0 transition-all duration-500",
                          currentStep > step.id ? "bg-[var(--primary)]" : ""
                        )}
                      />
                      
                      {/* Moving orb animation for forward progress */}
                      {isAnimating && currentStep > previousStep && currentStep === step.id + 1 && (
                        <>
                          {/* Traveling orb with trail */}
                          <div className="absolute inset-y-0 left-0 right-0">
                            <div className="orb-container">
                              <div className="orb-trail" />
                              <div className="orb-glow" />
                              <div className="orb-core" />
                              {/* Sparkle particles */}
                              <div className="orb-particle particle-1" />
                              <div className="orb-particle particle-2" />
                              <div className="orb-particle particle-3" />
                            </div>
                          </div>
                          
                          {/* Progress line fill animation */}
                          <div className="absolute inset-0">
                            <div className="h-full bg-[var(--primary)] animate-delayed-fill origin-left" />
                          </div>
                        </>
                      )}
                      
                      {/* Moving orb animation for backward progress */}
                      {isAnimating && currentStep < previousStep && previousStep === step.id + 1 && (
                        <>
                          {/* Traveling orb backward */}
                          <div className="absolute inset-y-0 left-0 right-0">
                            <div className="orb-container-reverse">
                              <div className="orb-trail-reverse" />
                              <div className="orb-glow" />
                              <div className="orb-core" />
                              {/* Sparkle particles */}
                              <div className="orb-particle particle-1" />
                              <div className="orb-particle particle-2" />
                              <div className="orb-particle particle-3" />
                            </div>
                          </div>
                          
                          {/* Progress line empty animation */}
                          <div className="absolute inset-0">
                            <div className="h-full bg-gray-200 animate-delayed-empty origin-right" />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2">
              {steps.map((step) => (
                <span
                  key={step.id}
                  className={cn(
                    "text-xs font-medium transition-colors duration-300",
                    currentStep >= step.id ? "text-[var(--primary)]" : "text-gray-500"
                  )}
                >
                  {step.name}
                </span>
              ))}
            </div>
          </div>

        {/* Form */}
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Card className="p-6 sm:p-8">
              <CurrentStepComponent />

              {/* Navigation */}
              <div className="mt-8 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                >
                  Previous
                </Button>

                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={saveDraft}
                    disabled={isSubmitting}
                  >
                    {draftSaved ? 'Draft Saved' : 'Save Draft'}
                  </Button>

                  {currentStep === steps.length ? (
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Creating...' : 'Create Listing'}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={nextStep}
                    >
                      Next
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </form>
        </FormProvider>

          {/* Mobile Bottom Navigation */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 sm:hidden">
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                Back
              </Button>

              {currentStep === steps.length ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSubmit(onSubmit)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create'}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={nextStep}
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}