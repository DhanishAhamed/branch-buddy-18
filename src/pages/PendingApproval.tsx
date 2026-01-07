import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut, RefreshCw } from 'lucide-react';

export default function PendingApproval() {
  const { signOut, refreshProfile, profile } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-accent rounded-full flex items-center justify-center">
            <Clock className="h-8 w-8 text-accent-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Access Restricted</CardTitle>
          <CardDescription className="text-base">
            Please wait for an Admin to approve your account and assign a Branch.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/30 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Signed in as: <span className="font-medium text-foreground">{profile?.email}</span>
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={refreshProfile}
              className="flex-1"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Check Status
            </Button>
            <Button 
              variant="ghost" 
              onClick={signOut}
              className="flex-1"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
