"use client";

import {
  Bell,
  Search,
  Settings,
  User,
} from "lucide-react";

export default function Topbar({
  userName = "Marcos",
}) {
  return (
    <header
      className="
        sticky
        top-0
        z-40
        mb-8
        flex
        items-center
        justify-between
        gap-4
        rounded-3xl
        border
        border-border
        bg-card/90
        backdrop-blur-xl
        px-6
        py-4
      "
    >
      {/* LEFT */}
      <div className="flex items-center gap-4 flex-1">
        
        {/* SEARCH */}
        <div
          className="
            relative
            hidden
            md:flex
            items-center
            w-full
            max-w-md
          "
        >
          <Search
            className="
              absolute
              left-4
              w-4
              h-4
              text-muted-foreground
            "
          />

          <input
            type="text"
            placeholder="Buscar..."
            className="
              w-full
              rounded-2xl
              border
              border-border
              bg-card
              py-3
              pl-11
              pr-4
              text-sm
              text-foreground
              placeholder:text-muted-foreground
              outline-none
              transition-all
              duration-300
              focus:border-red-500/40
              focus:ring-2
              focus:ring-red-500/10
            "
          />
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-3">
        
        {/* NOTIFICATIONS */}
        <button
          className="
            relative
            flex
            items-center
            justify-center
            w-11
            h-11
            rounded-2xl
            border
            border-border
            bg-card
            text-muted-foreground
            transition-all
            duration-300
            hover:border-red-500/20
            hover:bg-red-500/10
            hover:text-red-400
          "
        >
          <Bell className="w-5 h-5" />

          {/* DOT */}
          <span
            className="
              absolute
              top-2.5
              right-2.5
              w-2
              h-2
              rounded-full
              bg-red-500
            "
          />
        </button>

        {/* SETTINGS */}
        <button
          className="
            flex
            items-center
            justify-center
            w-11
            h-11
            rounded-2xl
            border
            border-border
            bg-card
            text-muted-foreground
            transition-all
            duration-300
            hover:border-red-500/20
            hover:bg-red-500/10
            hover:text-red-400
          "
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* USER */}
        <div
          className="
            flex
            items-center
            gap-3
            rounded-2xl
            border
            border-border
            bg-card
            px-4
            py-2
          "
        >
          {/* AVATAR */}
          <div
            className="
              flex
              items-center
              justify-center
              w-10
              h-10
              rounded-xl
              bg-primary/10
              border
              border-primary/20
            "
          >
            <User className="h-5 w-5 text-primary" />
          </div>

          {/* INFO */}
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-foreground">
              {userName}
            </p>

            <p className="text-xs text-muted-foreground">
              Administrador
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}