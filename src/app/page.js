"use client"
import Image from "next/image";

import React, { useState } from 'react';
import { 
  Bars3Icon,
  PaperClipIcon, 
  MicrophoneIcon, 
  PaperAirplaneIcon, 
  PhotoIcon, 
  FolderIcon, 
  SpeakerWaveIcon, 
  QuestionMarkCircleIcon, 
  CompassIcon 
} from '@heroicons/react/24/outline';
import Sidebar from "./components/Sidebar";

export default function SecuritySOCDesk() {
  const [message, setMessage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col antialiased selection:bg-blue-500 selection:text-white">
      <Sidebar isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}/>
      
      {/* TOP NAVIGATION BAR */}
      <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-50">
        {/* Left Logo Section */}
        <button
  onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-slate-100 transition">
  <Bars3Icon className="w-7 h-7 text-slate-700" />
</button>

        {/* Center Navigation Toggle */}
        <div className="bg-slate-100 p-1 rounded-full flex items-center shadow-inner">
          <button className="px-5 py-1.5 bg-blue-600 text-white font-medium text-sm rounded-full shadow-sm transition-all hover:bg-blue-700">
            AI Chat Bot
          </button>
          <button className="px-5 py-1.5 text-slate-600 hover:text-slate-900 font-medium text-sm rounded-full transition-colors">
            GRC Co-Pilot (Auditing)
          </button>
        </div>

        {/* Right User Profile */}
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm shadow-sm ring-2 ring-transparent group-hover:ring-blue-100 transition-all">
            LT
          </div>
          <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors hidden sm:inline">
            Lawal Tumininu
          </span>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-center">
        
        {/* CHAT INTERFACE CARD */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-100 border border-slate-200/80 overflow-hidden flex flex-col min-h-[600px] md:min-h-[650px] w-full">
          
          {/* Card Header */}
          <div className="bg-[#1a2333] px-6 py-8 text-center border-b border-slate-800">
            <h1 className="text-white text-xl sm:text-2xl font-bold tracking-tight mb-1">
              Autonomous Cybersecurity Operations Center Desk
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm font-medium tracking-wide">
              AI-Powered Security Operations & Incident Response
            </p>
          </div>

          {/* Chat Bubble Area */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-white">
            <div className="flex items-start gap-4 max-w-3xl">
              {/* Bot Avatar */}
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm">
                AI
              </div>
              
              {/* Message Content */}
              <div className="flex flex-col gap-1.5">
                <div className="bg-slate-50 text-slate-800 text-sm sm:text-[15px] leading-relaxed p-4 rounded-2xl rounded-tl-sm border border-slate-100 shadow-sm">
                  Welcome to the Autonomous Cybersecurity Operations Center Desk. I'm here to assist you with security operations, threat analysis, and incident response. How can I help you today?
                </div>
                <span className="text-[11px] text-slate-400 font-medium pl-1">
                  09:24:05
                </span>
              </div>
            </div>
          </div>

          {/* Chat Inputs & Action Footer */}
          <div className="border-t border-slate-100 p-4 bg-slate-50/50 flex flex-col gap-3">
            
            {/* Input Row */}
            <div className="flex items-center gap-3 w-full max-w-4xl mx-auto">
              {/* Attachment Button */}
              <button className="p-3 bg-white hover:bg-slate-50 rounded-full border border-slate-200 text-slate-500 hover:text-slate-700 transition-all shadow-sm active:scale-95 flex-shrink-0">
                <PaperClipIcon className="w-5 h-5" />
              </button>

              {/* Text Area Input */}
              <div className="flex-1 relative flex items-center">
                <input
                  type="text"
                  placeholder="Type your security query or request..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-slate-100 hover:bg-slate-200/60 focus:bg-white text-slate-800 placeholder-slate-400 text-sm rounded-2xl pl-4 pr-4 py-3.5 border border-transparent focus:border-slate-200 focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all"
                />
              </div>

              {/* Voice Button */}
              <button className="p-3 bg-white hover:bg-slate-50 rounded-full border border-slate-200 text-slate-500 hover:text-slate-700 transition-all shadow-sm active:scale-95 flex-shrink-0">
                <MicrophoneIcon className="w-5 h-5" />
              </button>

              {/* Send Button */}
              <button className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full text-white transition-all shadow-md hover:shadow-blue-200 active:scale-95 flex-shrink-0">
                <PaperAirplaneIcon className="w-5 h-5 -rotate-45 relative left-[1px] bottom-[1px]" />
              </button>
            </div>

            {/* Media/File Metadata Shortcuts */}
            <div className="flex items-center justify-center gap-6 text-slate-500 text-xs font-medium py-1">
              <button className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">
                <PhotoIcon className="w-4 h-4 text-slate-400" />
                Images
              </button>
              <button className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">
                <FolderIcon className="w-4 h-4 text-slate-400" />
                Folders
              </button>
              <button className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">
                <SpeakerWaveIcon className="w-4 h-4 text-slate-400" />
                Audio
              </button>
            </div>

          </div>
        </div>
      </main>

      {/* PERSISTENT HELP FLOAT ICON */}
      <footer className="fixed bottom-5 right-5 z-50">
        <button className="p-2.5 bg-slate-900 hover:bg-black rounded-full text-white shadow-lg transition-all hover:scale-105 active:scale-95">
          <QuestionMarkCircleIcon className="w-6 h-6" />
        </button>
      </footer>
    </div>
  );
}