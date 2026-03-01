// Based on javascript_auth_all_persistance blueprint
import { useAuth } from "@/hooks/useAuth";
import { Loader } from "@/components/loader";
import { Redirect, Route } from "wouter";
import { ReactNode } from "react";

interface ProtectedRouteProps {
  path: string;
  children: ReactNode;
}

export function ProtectedRoute({ path, children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <Loader variant="page" message="Loading…" />
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  return (
    <Route path={path}>
      {children}
    </Route>
  );
}