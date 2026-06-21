import React, { useState, useEffect } from "react";
import { Bell, CheckCircle, Info, AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getApiUrl } from "../lib/api";

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning";
  timestamp: string;
  read: boolean;
}

export default function GlobalNotification({ userRole, userEmail }: { userRole: "admin" | "user" | null, userEmail?: string }) {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Only poll if someone is logged in
    if (!userRole) return;

    const fetchNotifications = async () => {
      try {
        const url = new URL(getApiUrl("/api/notifications"));
        url.searchParams.append("role", userRole);
        if (userEmail) url.searchParams.append("email", userEmail);

        const res = await fetch(url.toString());
        if (res.ok) {
          const data: SystemNotification[] = await res.json();
          // Filter out read notifications on client side temporarily if needed,
          // but usually server handles it. We just show what the server sends.
          if (data.length > 0) {
            setNotifications(data);
            const newIds = new Set(data.map(n => n.id));
            setVisibleIds(newIds);
            
            // Mark as read after 6 seconds visually
            setTimeout(() => {
              setVisibleIds(new Set());
              // Optional: tell server they are read
              fetch(getApiUrl("/api/notifications/mark-read"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: data.map(n => n.id) })
              }).catch(() => {});
            }, 6000);
          }
        }
      } catch (err) {}
    };

    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [userRole, userEmail]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none w-full max-w-sm px-4">
      <AnimatePresence>
        {notifications.filter(n => visibleIds.has(n.id)).map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-lg border w-full max-w-sm backdrop-blur-md ${
              notif.type === "success" 
                ? "bg-green-500/90 border-green-600 text-white" 
                : notif.type === "warning"
                ? "bg-amber-500/90 border-amber-600 text-white"
                : "bg-blue-600/90 border-blue-700 text-white"
            }`}
          >
            <div className="mt-0.5">
              {notif.type === "success" && <CheckCircle className="w-5 h-5" />}
              {notif.type === "warning" && <AlertTriangle className="w-5 h-5" />}
              {notif.type === "info" && <Info className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold">{notif.title}</h4>
              <p className="text-xs opacity-90 mt-0.5 leading-snug">{notif.message}</p>
            </div>
            <button 
              onClick={() => {
                const newVisible = new Set(visibleIds);
                newVisible.delete(notif.id);
                setVisibleIds(newVisible);
              }}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
