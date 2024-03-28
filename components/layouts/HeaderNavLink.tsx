import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { type PropsWithChildren } from 'react'

const HeaderNavLink: React.FC<HeaderNavLinkProps> = ({ href, children }) => {
  const pathname = usePathname()
  const active = href === pathname

  return (
    <Link
      href={href}
      className={
        'inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700' +
        (active ? ' border-indigo-500 text-gray-900' : '')
      }
    >
      {children}
    </Link>
  )
}

interface HeaderNavLinkProps extends PropsWithChildren {
  href: string
}

export default HeaderNavLink
