import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { useRouter } from '../lib/router'

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string
}

/** Drop-in replacement for <a>, wired to our tiny router. */
export function Link({ to, onClick, ...rest }: LinkProps) {
  const { navigate } = useRouter()

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e)
    if (e.defaultPrevented) return
    // Let modifier-clicks / middle-clicks behave like a normal link
    // (open in new tab, etc.) instead of hijacking navigation.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    navigate(to)
  }

  return <a href={to} onClick={handleClick} {...rest} />
}
