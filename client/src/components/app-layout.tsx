import * as React from "react";
import { Baby, Book as BookIcon, GraduationCap, Hospital, LibraryBig, Play, Users } from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export type AppView = "library" | "hospitals" | "educate" | "libraries" | "community" | "kids" | "player";

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
              data-testid="tab-library"
            >
              <BookIcon className="h-5 w-5" aria-hidden="true" />
              <span>Library</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={currentView === "hospitals"}
              onClick={() => onNavigate("hospitals")}
              aria-current={currentView === "hospitals" ? "page" : undefined}
              className="rounded-xl"
              data-testid="tab-hospitals"
            >
              <Hospital className="h-5 w-5" aria-hidden="true" />
              <span>Hospitals</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={currentView === "educate"}
              onClick={() => onNavigate("educate")}
              aria-current={currentView === "educate" ? "page" : undefined}
              className="rounded-xl"
              data-testid="tab-educate"
            >
              <GraduationCap className="h-5 w-5" aria-hidden="true" />
              <span>Educate</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={currentView === "libraries"}
              onClick={() => onNavigate("libraries")}
              aria-current={currentView === "libraries" ? "page" : undefined}
              className="rounded-xl"
              data-testid="tab-libraries"
            >
              <LibraryBig className="h-5 w-5" aria-hidden="true" />
              <span>Libraries</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={currentView === "community"}
              onClick={() => onNavigate("community")}
              aria-current={currentView === "community" ? "page" : undefined}
              className="rounded-xl"
              data-testid="tab-community"
            >
              <Users className="h-5 w-5" aria-hidden="true" />
              <span>Community</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={currentView === "kids"}
              onClick={() => onNavigate("kids")}
              aria-current={currentView === "kids" ? "page" : undefined}
              className="rounded-xl"
              data-testid="tab-kids"
            >
              <Baby className="h-5 w-5" aria-hidden="true" />
              <span>Kids</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={currentView === "player"}
              onClick={() => hasCurrentBook && onNavigate("player")}
              disabled={!hasCurrentBook}
              aria-current={currentView === "player" ? "page" : undefined}
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
