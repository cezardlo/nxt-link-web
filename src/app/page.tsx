'use client';
import { useEffect } from 'react';
export default function Home() {
  useEffect(() => {
    document.querySelectorAll('body > nav, body > div > nav, [class*="DockNav"], [class*="MobileNav"]').forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });
    const mc = document.getElementById('main-content') as HTMLElement;
    if (mc) { mc.style.padding = '0'; mc.style.margin = '0'; mc.style.paddingTop = '0'; }
    document.body.style.background = '#0A0A0F';
    return () => {
      document.querySelectorAll('body > nav, body > div > nav, [class*="DockNav"], [class*="MobileNav"]').forEach(el => {
        (el as HTMLElement).style.display = '';
      });
      if (mc) { mc.style.padding = ''; mc.style.margin = ''; }
      document.body.style.background = '';
    };
  }, []);
  return <iframe src="/landing.html" style={{width:'100vw',height:'100vh',border:'none',position:'fixed',top:0,left:0,zIndex:50}} title="NXT//LINK"/>;
}
