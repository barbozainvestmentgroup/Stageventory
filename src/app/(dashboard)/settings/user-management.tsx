"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Pencil, UserCircle } from "lucide-react";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  active: boolean;
  createdAt: Date;
}

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Admin/Owner",
  OFFICE: "Office/Sales",
  WAREHOUSE: "Warehouse Manager",
  CREW: "Install Crew",
};

const roleBadgeVariant: Record<UserRole, "default" | "secondary" | "outline" | "success" | "warning"> = {
  ADMIN: "default",
  OFFICE: "secondary",
  WAREHOUSE: "warning",
  CREW: "outline",
};

export function UserManagement({ initialUsers }: { initialUsers: UserData[] }) {
  const [users, setUsers] = useState<UserData[]>(initialUsers);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Manage user accounts and role assignments
          </CardDescription>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <UserForm
              onSuccess={() => {
                setIsCreateOpen(false);
                router.refresh();
              }}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <UserCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{user.name}</p>
                    {!user.active && (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={roleBadgeVariant[user.role]}>
                  {roleLabels[user.role]}
                </Badge>
                <Dialog
                  open={editingUser?.id === user.id}
                  onOpenChange={(open) => {
                    if (!open) setEditingUser(null);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingUser(user)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <UserForm
                      user={user}
                      onSuccess={() => {
                        setEditingUser(null);
                        router.refresh();
                      }}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              No team members yet. Click &quot;Add User&quot; to get started.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function UserForm({
  user,
  onSuccess,
}: {
  user?: UserData;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(user?.role || "CREW");
  const [phone, setPhone] = useState(user?.phone || "");
  const [active, setActive] = useState(user?.active ?? true);
  const { toast } = useToast();
  const router = useRouter();

  const isEditing = !!user;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEditing ? `/api/users/${user.id}` : "/api/users";
      const method = isEditing ? "PATCH" : "POST";

      const body: Record<string, unknown> = { name, email, role, phone, active };
      if (password) body.password = password;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save user");
      }

      toast({
        title: isEditing ? "User updated" : "User created",
        description: isEditing
          ? `${name}'s account has been updated.`
          : `${name} has been added to the team.`,
        variant: "default",
      });

      onSuccess();
      router.refresh();
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit User" : "Add Team Member"}</DialogTitle>
        <DialogDescription>
          {isEditing
            ? "Update the team member's information and role."
            : "Create a new account for a team member."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">
            {isEditing ? "New Password (leave blank to keep)" : "Password"}
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!isEditing}
            minLength={6}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">Admin/Owner</SelectItem>
              <SelectItem value="OFFICE">Office/Sales</SelectItem>
              <SelectItem value="WAREHOUSE">Warehouse Manager</SelectItem>
              <SelectItem value="CREW">Install Crew</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        {isEditing && (
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="active">Account Active</Label>
            <Switch
              id="active"
              checked={active}
              onCheckedChange={setActive}
            />
          </div>
        )}
        <DialogFooter>
          <Button type="submit" disabled={loading}>
            {loading
              ? "Saving..."
              : isEditing
                ? "Save Changes"
                : "Create User"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
