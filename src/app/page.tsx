'use client';

import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    // Hide the layout DockNav and MobileNav on the landing page
    const dockNav = document.querySelector('[class*="DockNav"], nav.dock-nav, .dock-navigation') as HTMLElement;
    const mobileNav = document.querySelector('[class*="MobileNav"], nav.mobile-nav, .mobile-navigation') as HTMLElement;
    const mainContent = document.getElementById('main-content') as HTMLElement;
    
    // Hide all nav elements from the layout
    document.querySelectorAll('body > nav, body > div > nav').forEach((el) => {
      (el as HTMLElement).style.display = 'none';
    });
    
    // Remove padding from main content since landing has its own nav
    if (mainContent) {
      mainContent.style.padding = '0';
      mainContent.style.margin = '0';
    }

    // Set body background to match landing page
    document.body.style.background = '#0A0A0F';
    document.body.style.margin = '0';
    document.body.style.padding = '0';

    return () => {
      // Restore when navigating away
      document.querySelectorAll('body > nav, body > div > nav').forEach((el) => {
        (el as HTMLElement).style.display = '';
      });
      if (mainContent) {
        mainContent.style.padding = '';
        mainContent.style.margin = '';
      }
      document.body.style.background = '';
    };
  }, []);

  return (
    <iframe
      src="/landing.html"
      style={{
        width: '100vw',
        height: '100vh',
        border: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 50,
      }}
      title="NXT//LINK"
    />
  );
}
