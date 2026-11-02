export function PlanInstructions({ text }: { text?: string | null }) {
  if (!text?.trim()) return null
  return <div className="plan-instructions"><span>What to do</span><p>{text}</p></div>
}
