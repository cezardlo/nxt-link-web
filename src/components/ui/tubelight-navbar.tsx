'use client';

import React, { MouseEvent, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@/lib/utils';
// icons passed as props via NavItem.icon — no lucide import needed here

const PRIVATE_PATHS = ['/markets', '/intel'];
const ACCESS_CODE = '4444';
const STORAGE_KEY = 'nxt-link-private-access';

export type NavItem = {
  name: string;
  url: string;
  icon: React.ElementType;
};

function requestPrivateAccess(event: MouseEvent<HTMLAnchorElement>, url: string): boolean {
  if (!PRIVATE_PATHS.includes(url)) return true;
  if (window.localStorage.getItem(STORAGE_KEY) === ACCESS_CODE) return true;

  event.preventDefault();
  const password = window.prompt('Enter password to open this private section');
  if (password?.trim() === ACCESS_CODE) {
    window.localStorage.setItem(STORAGE_KEY, ACCESS_CODE);
    window.location.href = url;
    return true;
  }

  if (password !== null) {
    window.alert('Wrong password.');
  }
  return false;
}

export function NavBar({ items, className }: { items: NavItem[]; className?: string }) {
  const [activeTab, setActiveTab] = useState(items[0]?.name ?? '');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Detect active tab from current path
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const match = items.find((item) => item.url === path || (path !== '/' && item.url !== '/' && path.startsWith(item.url)));
      if (match) setActiveTab(match.name);
    }
  }, [items]);

  if (!isMounted) return null;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center',
        className
      )}
      style={{
        height: '48px',
        backgroundColor: '#050505',
        borderTop: '1px solid #1a1a1a',
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
      }}
    >
      <div className="flex items-center gap-0 h-full w-full max-w-lg">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.name;

          return (
            <Link
              key={item.name}
              href={item.url}
              onClick={(event) => {
                if (requestPrivateAccess(event, item.url)) setActiveTab(item.name);
              }}
              className="relative flex-1 flex flex-col items-center justify-center h-full cursor-pointer"
              style={{ textDecoration: 'none' }}
            >
              {/* Tubelight lamp glow — appears at top when active */}
              {isActive && (
                <motion.div
                  layoutId="tubelight-lamp"
                  className="absolute top-0 left-1/2 -translate-x-1/2"
                  style={{
                    width: '32px',
                    height: '2px',
                    backgroundColor: '#ff6600',
                    borderRadius: '0 0 4px 4px',
                    boxShadow: '0 0 12px 4px rgba(255,102,0,0.45)',
                  }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}

              {/* Subtle glow backdrop behind icon when active */}
              {isActive && (
                <motion.div
                  layoutId="tubelight-bg"
                  className="absolute inset-0 mx-1"
                  style={{
                    background: 'radial-gradient(ellipse at top, rgba(255,102,0,0.12) 0%, transparent 70%)',
                    borderRadius: '0 0 6px 6px',
                  }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}

              {/* Icon */}
              <Icon
                size={16}
                style={{
                  color: isActive ? '#ff6600' : 'rgba(255,255,255,0.28)',
                  filter: isActive ? 'drop-shadow(0 0 6px rgba(255,102,0,0.6))' : 'none',
                  transition: 'color 0.2s, filter 0.2s',
                  marginBottom: '1px',
                }}
              />

              {/* Label */}
              <span
                style={{
                  fontSize: '6.5px',
                  letterSpacing: '0.18em',
                  color: isActive ? '#ff6600' : 'rgba(255,255,255,0.22)',
                  transition: 'color 0.2s',
                  lineHeight: 1,
                }}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
