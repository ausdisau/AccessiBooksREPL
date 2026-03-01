import * as React from "react";
import { BookOpen, Book as BookIcon, Play } from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export type AppView = "library" | "player";

interface AppLayoutProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  hasCurrentBook: boolean;
  header: React.ReactNode;
  children: React.ReactNode;
}

export function AppLayout({
  currentView,
  onNavigate,
  hasCurrentBook,
  header,
  children,
}: AppLayoutProps) {
  return (
    <SidebarProvider>
      <Sidebar className="border-r border-border bg-sidebar" aria-label="Main navigation" role="navigation">
        <SidebarMenu className="p-2 gap-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={currentView === "library"}
              onClick={() => onNavigate("library")}
              aria-current={currentView === "library" ? "page" : undefined}
              className="rounded-xl"
              data-testid="nav-home"
            >
              <BookOpen className="h-5 w-5" aria-hidden="true" />
              <span>Home</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={currentView === "library"}
              onClick={() => onNavigate("library")}
              aria-current={currentView === "library" ? "page" : undefined}
              className="rounded-xl"
              data-testid="tab-library"
            >
              <BookIcon className="h-5 w-5" aria-hidden="true" />
              <span>Library</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={currentView === "player"}
              onClick={() => hasCurrentBook && onNavigate("player")}
              disabled={!hasCurrentBook}
              aria-current={currentView === "player" ? "page" : undefined}
              aria-disabled={!hasCurrentBook}
              className="rounded-xl"
              data-testid="tab-player"
            >
              <Play className="h-5 w-5" aria-hidden="true" />
              <span>Player</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </Sidebar>
      <SidebarInset>
        {header}
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
