'use client'

import * as React from 'react'
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react'
import { DayButton, DayPicker, getDefaultClassNames } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'

function Calendar({
                    className,
                    classNames,
                    showOutsideDays = true,
                    captionLayout = 'label',
                    buttonVariant = 'ghost',
                    formatters,
                    components,
                    ...props
                  }: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>['variant']
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        'bg-background group/calendar p-3',
        className,
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString('default', { month: 'short' }),
        ...formatters,
      }}
      classNames={{
        root: cn('w-fit', defaultClassNames.root),
        months: cn(
          'flex gap-4 flex-col md:flex-row relative',
          defaultClassNames.months,
        ),
        month: cn('flex flex-col w-full gap-4', defaultClassNames.month),
        nav: cn(
          'flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between',
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          'size-8 aria-disabled:opacity-50 p-0 select-none',
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          'size-8 aria-disabled:opacity-50 p-0 select-none',
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          'flex items-center justify-center h-8 w-full px-8',
          defaultClassNames.month_caption,
        ),
        table: 'w-full border-collapse',
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn(
          'text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] select-none',
          defaultClassNames.weekday,
        ),
        week: cn('flex w-full mt-2', defaultClassNames.week),
        day: cn(
          'relative w-full h-full p-0 text-center aspect-square select-none',
          defaultClassNames.day,
        ),
        ...classNames,
      }}
      components={{
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === 'left') return <ChevronLeftIcon className={cn('size-4', className)} {...props} />
          if (orientation === 'right') return <ChevronRightIcon className={cn('size-4', className)} {...props} />
          return <ChevronDownIcon className={cn('size-4', className)} {...props} />
        },
        DayButton: CalendarDayButton as unknown as typeof DayButton,
        ...components,
      }}
      {...props}
    />
  )
}

function assignRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (!ref) {
    return
  }
  if (typeof ref === 'function') {
    ref(value)
    return
  }
  ;(ref as React.MutableRefObject<T | null>).current = value
}

const CalendarDayButton = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof DayButton>>(
  function CalendarDayButton({ className, modifiers, ...props }, forwardedRef) {
  const defaultClassNames = getDefaultClassNames()
  const [buttonNode, setButtonNode] = React.useState<HTMLButtonElement | null>(null)

  React.useEffect(() => {
    if (modifiers.focused) buttonNode?.focus()
  }, [buttonNode, modifiers.focused])

    return (
      <Button
        ref={(node) => {
          setButtonNode(node)
          assignRef(forwardedRef, node)
        }}
        variant="ghost"
        size="icon"
        className={cn(
          'flex aspect-square size-8 w-full flex-col gap-1 rounded-md font-normal leading-none',
          'hover:bg-accent hover:text-accent-foreground',
          modifiers.selected && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
          modifiers.today && !modifiers.selected && 'bg-accent text-accent-foreground',
          modifiers.outside && 'text-muted-foreground opacity-50',
          defaultClassNames.day,
          className,
        )}
        {...props}
      />
    )
  },
)

CalendarDayButton.displayName = 'CalendarDayButton'

export { Calendar, CalendarDayButton }
