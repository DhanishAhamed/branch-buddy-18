import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';

export default function Chat() {
  return (
    <div className="p-4 md:p-6 h-full">
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            WhatsApp Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-[calc(100%-80px)]">
          <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            WhatsApp Integration Coming Soon
          </h3>
          <p className="text-muted-foreground text-center max-w-md">
            Meta WhatsApp Business API integration will be available here. 
            You'll be able to chat with customers and send property cards directly.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
