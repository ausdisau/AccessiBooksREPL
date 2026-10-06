import * as React from "react";
import { Activity, Baby, Book as BookIcon, Briefcase, FileText, GraduationCap, HeartPulse, Hospital, LibraryBig, Play, Scale, Stethoscope, University, Users } from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export type AppView = "library" | "hospitals" | "educate" | "libraries" | "community" | "kids" | "aged-care" | "rehab" | "workplace" | "justice" | "university" | "easy-read" | "professional" | "player";

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
            <SidebarMenuButton isActive={currentView === "aged-care"} onClick={() => onNavigate("aged-care")} aria-current={currentView === "aged-care" ? "page" : undefined} className="rounded-xl" data-testid="tab-aged-care">
              <HeartPulse className="h-5 w-5" aria-hidden="true" /><span>Aged Care</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton isActive={currentView === "rehab"} onClick={() => onNavigate("rehab")} aria-current={currentView === "rehab" ? "page" : undefined} className="rounded-xl" data-testid="tab-rehab">
              <Activity className="h-5 w-5" aria-hidden="true" /><span>Rehab</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton isActive={currentView === "workplace"} onClick={() => onNavigate("workplace")} aria-current={currentView === "workplace" ? "page" : undefined} className="rounded-xl" data-testid="tab-workplace">
              <Briefcase className="h-5 w-5" aria-hidden="true" /><span>Workplace</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton isActive={currentView === "justice"} onClick={() => onNavigate("justice")} aria-current={currentView === "justice" ? "page" : undefined} className="rounded-xl" data-testid="tab-justice">
              <Scale className="h-5 w-5" aria-hidden="true" /><span>Justice</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton isActive={currentView === "university"} onClick={() => onNavigate("university")} aria-current={currentView === "university" ? "page" : undefined} className="rounded-xl" data-testid="tab-university">
              <University className="h-5 w-5" aria-hidden="true" /><span>University</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton isActive={currentView === "easy-read"} onClick={() => onNavigate("easy-read")} aria-current={currentView === "easy-read" ? "page" : undefined} className="rounded-xl" data-testid="tab-easy-read">
              <FileText className="h-5 w-5" aria-hidden="true" /><span>Easy Read</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton isActive={currentView === "professional"} onClick={() => onNavigate("professional")} aria-current={currentView === "professional" ? "page" : undefined} className="rounded-xl" data-testid="tab-professional">
              <Stethoscope className="h-5 w-5" aria-hidden="true" /><span>Professional</span>
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
