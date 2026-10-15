"use client";

import React from 'react';
import { ThemeProvider, LanguageProvider, AuthProvider, NotificationProvider } from '@/context';
import { NotificationDrawer } from '@/components/common/NotificationDrawer';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <NotificationProvider>
            {children}
            <NotificationDrawer />
          </NotificationProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
