// components/pulse/PulseChatModal.tsx
"use client"

import React from 'react'
import { PulseChatView } from "./PulseChatView"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface PulseChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PulseChatModal({ isOpen, onClose }: PulseChatModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop with Blur */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={cn(
        "relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl",
        "flex flex-col overflow-hidden",
        "animate-in zoom-in-95 fade-in duration-300 slide-in-from-bottom-5"
      )}>
        {/* Header Area */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
          <h2 className="text-xl font-bold text-gray-800 tracking-tight">
            コンディション・チェック
          </h2>
          <button 
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 pt-2">
          <PulseChatView onSuccess={onClose} />
        </div>
      </div>
    </div>
  )
}