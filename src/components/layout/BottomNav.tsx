import { NavLink } from '@/components/NavLink';
import { Home, Users, MessageSquare, Map, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const navItems = [
  { title: 'Home', url: '/dashboard', icon: Home },
  { title: 'Leads', url: '/leads', icon: Users },
  { title: 'Chat', url: '/chat', icon: MessageSquare },
  { title: 'Map', url: '/map', icon: Map },
];

export function BottomNav() {
  const { isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            className="flex flex-col items-center justify-center flex-1 py-2 text-muted-foreground hover:text-primary transition-colors"
            activeClassName="text-primary"
          >
            <item.icon className="h-5 w-5 mb-1" />
            <span className="text-xs">{item.title}</span>
          </NavLink>
        ))}
        
        <DropdownMenu>
          <DropdownMenuTrigger className="flex flex-col items-center justify-center flex-1 py-2 text-muted-foreground hover:text-primary transition-colors">
            <MoreHorizontal className="h-5 w-5 mb-1" />
            <span className="text-xs">More</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 mb-2">
            <DropdownMenuItem onClick={() => navigate('/properties')}>
              Properties
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/pipeline')}>
              Pipeline
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuItem onClick={() => navigate('/admin/users')}>
                  User Management
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/admin/settings')}>
                  Settings
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
