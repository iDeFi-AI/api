// Footer.tsx
import React from 'react';
import Link from 'next/link';

export const Footer: React.FC<FooterProps> = ({}) => {
  return (
    <footer id='App:Footer' className="mx-auto px-2 sm:px-4 lg:px-8 fixed bg-white bottom-0 w-full shadow-md p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between">
          <p>&copy; {new Date().getFullYear().toString()} iDeFi.ai</p>
          <p>
            <Link 
              href="/terms"
              className="text-lightlaven underline hover:underline">Disclosure of Terms
            </Link>{' '}
          </p>
        </div>
      </div>
    </footer>
  );
};

interface FooterProps {}

export default Footer;
