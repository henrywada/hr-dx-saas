"use client"

import React, { useState } from 'react'
import { PulseChatModal } from "@/components/pulse/PulseChatModal"

export function ServiceCardWrapper({ 
  children, 
  serviceName 
}: { 
  children: React.ReactNode, 
  serviceName: string 
}) {
  const [isOpen, setIsOpen] = useState(false);

  // パルス回答の時だけ、クリックイベントを横取りする
  if (serviceName === 'パルス回答 (Echo)') {
    return (
      <>
        <div onClick={() => setIsOpen(true)} className="cursor-pointer h-full">
          {children}
        </div>
        <PulseChatModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </>
    );
  }

  // それ以外は何もせずそのまま表示
  return <>{children}</>;
}