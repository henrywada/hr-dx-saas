import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="h-12 bg-white border-t border-slate-200 flex items-center relative px-8 text-xs shrink-0 z-10">
        {/* Left: Links */}
        <div className="flex items-center gap-4 text-slate-500">
            <Link href="#" className="hover:text-accent-orange hover:underline">プライバシーポリシー</Link>
            <Link href="#" className="hover:text-accent-orange hover:underline">利用規約</Link>
        </div>

        {/* Center: Ownership */}
        <div className="absolute left-1/2 -translate-x-1/2 text-slate-400 font-medium">
            &copy; 2026 HR-dx Inc. All rights reserved.
        </div>
        
        {/* Right: Version */}
        <div className="ml-auto flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-slate-400 lowercase font-mono">v2.4.43</span>
        </div>
    </footer>
  );
}