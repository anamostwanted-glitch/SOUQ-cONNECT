import * as React from "react"
import { motion } from "motion/react"
import { cn } from "../../../lib/utils"

const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: number }
>(({ className, value, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800",
      className
    )}
    {...props}
  >
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${value || 0}%` }}
      transition={{ duration: 1, ease: "easeOut" }}
      className="h-full w-full flex-1 bg-brand-primary transition-all select-none"
    />
  </div>
))
Progress.displayName = "Progress"

export { Progress }
