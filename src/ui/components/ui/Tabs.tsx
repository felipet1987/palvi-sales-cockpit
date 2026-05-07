import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/cn'

export const Tabs = TabsPrimitive.Root

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-9 items-center rounded-lg border border-border bg-bg-soft p-1 gap-1',
      className,
    )}
    {...props}
  />
))
TabsList.displayName = 'TabsList'

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center rounded-md px-4 py-1 text-sm font-medium',
      'text-ink-muted transition-colors',
      'hover:text-ink',
      'data-[state=active]:bg-bg-card data-[state=active]:text-ink',
      'data-[state=active]:shadow-[0_0_0_1px_rgba(99,102,241,0.35)]',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
      className,
    )}
    {...props}
  />
))
TabsTrigger.displayName = 'TabsTrigger'
