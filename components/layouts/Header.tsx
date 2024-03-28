'use client'

import React from 'react'
import { useState } from 'react'
import NavMenu from './NavMenu'

export const Header: React.FC<HeaderProps> = ({}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header id='App:Header' className={('bg-white')}>
    <NavMenu/>
    </header>
  )
}

const navigation = [
  { name: 'page1', href: '' },
  { name: 'page2', href: '' },
  { name: 'page3', href: '' },
  { name: 'page4', href: '' },
]

interface HeaderProps {}

export default Header
