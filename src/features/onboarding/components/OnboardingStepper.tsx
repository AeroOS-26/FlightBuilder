/**
 * The three-step indicator on frame 31: Account → Profile → Join Flight.
 *
 * Distinct from the Flight Builder's `Stepper`, which tracks the six creation
 * steps and is driven by `config/steps.ts`. This one tracks onboarding, and its
 * third step hands over to the join flow in Milestone 2.
 *
 * From the frame: each step 268 wide, a 48 circle over a two-line label.
 * The active step is a #112D7C disc inside a #112D7C ring; the rest are flat
 * #CFE3F1 with muted labels.
 */

import { cn } from '@/utils/cn'
import { Icon } from '@/components/common'
import type { IconName } from '@/components/common'

const STEPS: Array<{ label: string; icon: IconName }> = [
  { label: 'Account', icon: 'user' },
  { label: 'Profile', icon: 'user' },
  { label: 'Join Flight', icon: 'plane' },
]

export function OnboardingStepper({ current = 0 }: { current?: 0 | 1 | 2 }) {
  return (
    <ol className="flex w-full flex-col gap-6 sm:flex-row sm:gap-0">
      {STEPS.map((step, i) => {
        const active = i === current
        return (
          <li key={step.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full items-center gap-3">
              <span
                className={cn(
                  'flex size-12 shrink-0 items-center justify-center rounded-full',
                  active ? 'border-2 border-[#112D7C] bg-transparent p-[3px]' : 'bg-[#CFE3F1]',
                )}
              >
                <span
                  className={cn(
                    'flex size-full items-center justify-center rounded-full',
                    active ? 'bg-[#112D7C] text-white' : 'text-white',
                  )}
                >
                  <Icon name={step.icon} size={20} />
                </span>
              </span>
              {/* The connector runs to the next step; the last one has none. */}
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn('hidden h-px flex-1 sm:block', active ? 'bg-[#112D7C]' : 'bg-[#CFE3F1]')}
                />
              )}
            </div>
            <div className="flex w-full flex-col gap-[2px] sm:pr-4">
              <span className="font-sans text-[10px] font-semibold uppercase leading-[1.2] tracking-[0.04em] text-[#6D6D6D]">
                Step {i + 1}
              </span>
              <span
                className={cn(
                  'font-sans text-[14px] font-medium leading-[1.2]',
                  active ? 'text-black' : 'text-[#6D6D6D]',
                )}
              >
                {step.label}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
