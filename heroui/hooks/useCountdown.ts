import { useState, useEffect, useCallback } from 'react'

interface UseCountdownOptions {
  autoStart?: boolean
  onComplete?: () => void
}

export function useCountdown(
  initialSeconds: number = 5,
  options: UseCountdownOptions = {}
) {
  const { autoStart = true, onComplete } = options

  const [timeLeft, setTimeLeft] = useState(initialSeconds)
  const [isComplete, setIsComplete] = useState(false)
  const [isRunning, setIsRunning] = useState(autoStart)

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) {
      if (timeLeft === 0 && !isComplete) {
        setIsComplete(true)
        onComplete?.()
      }
      return
    }

    const timer = setTimeout(() => {
      setTimeLeft(prev => prev - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [timeLeft, isRunning, isComplete, onComplete])

  const start = useCallback(() => {
    setIsRunning(true)
  }, [])

  const pause = useCallback(() => {
    setIsRunning(false)
  }, [])

  const reset = useCallback(() => {
    setTimeLeft(initialSeconds)
    setIsComplete(false)
    setIsRunning(autoStart)
  }, [initialSeconds, autoStart])

  return {
    timeLeft,
    isComplete,
    isRunning,
    start,
    pause,
    reset,
    percentage: ((initialSeconds - timeLeft) / initialSeconds) * 100
  }
}