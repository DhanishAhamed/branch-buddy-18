import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function NoAccess() {
    const { profile } = useAuth();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-accent rounded-full flex items-center justify-center">
                        <Lock className="h-8 w-8 text-accent-foreground" />
                    </div>
                    <CardTitle className="text-2xl font-bold">You don't have access to any workspace</CardTitle>
                    <CardDescription className="text-base">
                        Ask your admin to invite you to a workspace, or contact support.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-muted/30 rounded-lg p-4 text-center">
                        <p className="text-sm text-muted-foreground">
                            Signed in as: <span className="font-medium text-foreground">{profile?.email}</span>
                        </p>
                    </div>

                    <Button
                        variant="outline"
                        onClick={handleSignOut}
                        className="w-full"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                        Need help? Contact your workspace administrator.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
