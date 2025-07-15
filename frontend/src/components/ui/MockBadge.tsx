// Badge component pour indiquer le mode mock
import { Badge } from '@/components/ui/badge'

interface MockBadgeProps {
  className?: string
}

export const MockBadge = ({ className = '' }: MockBadgeProps) => {
  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <Badge 
        variant="secondary" 
        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shadow-lg animate-pulse text-sm font-bold px-3 py-1"
      >
        🎭 MODE MOCK
      </Badge>
    </div>
  )
}
