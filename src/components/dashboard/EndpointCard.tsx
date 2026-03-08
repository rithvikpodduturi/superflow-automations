import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Copy, Eye, Settings, Trash2, Shield, Bell, Pencil, Check, X,
  Tag, FolderOpen, Plus, Code,
} from "lucide-react";
import { CodeSnippets } from "@/components/dashboard/CodeSnippets";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface WebhookEndpoint {
  id: string;
  name: string;
  endpoint_id: string;
  description: string;
  is_active: boolean;
  created_at: string;
  user_id: string;
  response_status_code: number;
  response_headers: any;
  response_body: string;
  api_key: string | null;
  notify_on_receive: boolean;
  folder: string | null;
  tags: string[];
}

interface Props {
  endpoint: WebhookEndpoint;
  requestCount: number;
  onViewRequests: () => void;
  onConfigure: () => void;
  onDelete: () => void;
  onCopyUrl: () => void;
  onUpdated: () => void;
  allTags: string[];
  allFolders: string[];
}

export function EndpointCard({
  endpoint: ep,
  requestCount,
  onViewRequests,
  onConfigure,
  onDelete,
  onCopyUrl,
  onUpdated,
  allTags,
  allFolders,
}: Props) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(ep.name);
  const [newTag, setNewTag] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [folderPopoverOpen, setFolderPopoverOpen] = useState(false);
  const { toast } = useToast();

  const saveRename = async () => {
    if (!renameValue.trim()) return;
    const { error } = await (supabase as any)
      .from("webhook_endpoints")
      .update({ name: renameValue.trim() })
      .eq("id", ep.id);
    if (error) {
      toast({ title: "Rename failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Endpoint renamed" });
      onUpdated();
    }
    setIsRenaming(false);
  };

  const addTag = async (tag: string) => {
    const t = tag.trim().toLowerCase();
    if (!t || ep.tags.includes(t)) return;
    const updated = [...ep.tags, t];
    const { error } = await (supabase as any)
      .from("webhook_endpoints")
      .update({ tags: updated })
      .eq("id", ep.id);
    if (!error) { onUpdated(); setNewTag(""); }
    else toast({ title: "Error", description: error.message, variant: "destructive" });
  };

  const removeTag = async (tag: string) => {
    const updated = ep.tags.filter((t) => t !== tag);
    const { error } = await (supabase as any)
      .from("webhook_endpoints")
      .update({ tags: updated })
      .eq("id", ep.id);
    if (!error) onUpdated();
  };

  const setFolder = async (folder: string | null) => {
    const { error } = await (supabase as any)
      .from("webhook_endpoints")
      .update({ folder: folder || null })
      .eq("id", ep.id);
    if (!error) {
      toast({ title: folder ? `Moved to "${folder}"` : "Removed from folder" });
      onUpdated();
      setFolderPopoverOpen(false);
    }
  };

  const unusedTags = allTags.filter((t) => !ep.tags.includes(t));

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-2.5">
          {/* Row 1: Name + badges + actions */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {isRenaming ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveRename()}
                    className="h-8 text-sm font-semibold"
                    autoFocus
                  />
                  <Button variant="ghost" size="sm" onClick={saveRename} className="h-8 w-8 p-0">
                    <Check className="h-4 w-4 text-emerald-600" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setIsRenaming(false); setRenameValue(ep.name); }} className="h-8 w-8 p-0">
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold truncate">{ep.name}</h3>
                  <Button variant="ghost" size="sm" onClick={() => { setIsRenaming(true); setRenameValue(ep.name); }} className="h-6 w-6 p-0 opacity-50 hover:opacity-100">
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Badge variant={ep.is_active ? "default" : "secondary"} className="text-xs">
                    {ep.is_active ? "Active" : "Inactive"}
                  </Badge>
                  {ep.api_key && <Badge variant="outline" className="text-xs"><Shield className="h-3 w-3 mr-1" />Secured</Badge>}
                  {ep.notify_on_receive && <Badge variant="outline" className="text-xs"><Bell className="h-3 w-3 mr-1" />Notifying</Badge>}
                </div>
              )}
              {ep.description && <p className="text-sm text-muted-foreground mt-0.5">{ep.description}</p>}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button variant="default" size="sm" onClick={onViewRequests}>
                <Eye className="h-4 w-4 mr-1" /> Requests
                <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">{requestCount}</Badge>
              </Button>
              <CodeSnippets endpointId={ep.endpoint_id} apiKey={ep.api_key}>
                <Button variant="outline" size="sm" title="Code Snippets">
                  <Code className="h-4 w-4" />
                </Button>
              </CodeSnippets>
              <Button variant="outline" size="sm" onClick={onConfigure}>
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Row 2: Folder + tags */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Folder */}
            <Popover open={folderPopoverOpen} onOpenChange={setFolderPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                  <FolderOpen className="h-3 w-3" />
                  {ep.folder || "No folder"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <p className="text-xs font-medium text-muted-foreground mb-2">Move to folder</p>
                {ep.folder && (
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 mb-1" onClick={() => setFolder(null)}>
                    <X className="h-3 w-3 mr-1" /> Remove from folder
                  </Button>
                )}
                {allFolders.filter(f => f !== ep.folder).map((f) => (
                  <Button key={f} variant="ghost" size="sm" className="w-full justify-start text-xs h-7" onClick={() => setFolder(f)}>
                    <FolderOpen className="h-3 w-3 mr-1" /> {f}
                  </Button>
                ))}
                <div className="flex gap-1 mt-1.5 pt-1.5 border-t">
                  <Input
                    value={newFolder}
                    onChange={(e) => setNewFolder(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && newFolder.trim()) { setFolder(newFolder.trim()); setNewFolder(""); } }}
                    placeholder="New folder..."
                    className="h-7 text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2"
                    disabled={!newFolder.trim()}
                    onClick={() => { if (newFolder.trim()) { setFolder(newFolder.trim()); setNewFolder(""); } }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Tags */}
            {ep.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs gap-1 pr-1">
                <Tag className="h-2.5 w-2.5" />
                {tag}
                <button onClick={() => removeTag(tag)} className="ml-0.5 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}

            <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 px-1.5 text-muted-foreground hover:text-foreground">
                  <Plus className="h-3 w-3" /> Tag
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-2" align="start">
                <div className="flex gap-1 mb-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { addTag(newTag); setTagPopoverOpen(false); } }}
                    placeholder="New tag..."
                    className="h-7 text-xs"
                    autoFocus
                  />
                  <Button variant="outline" size="sm" className="h-7 px-2" disabled={!newTag.trim()} onClick={() => { addTag(newTag); setTagPopoverOpen(false); }}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                {unusedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {unusedTags.map((t) => (
                      <Badge
                        key={t}
                        variant="outline"
                        className="text-xs cursor-pointer hover:bg-accent"
                        onClick={() => { addTag(t); setTagPopoverOpen(false); }}
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Row 3: URL */}
          <div className="flex items-center gap-2">
            <code className="text-xs bg-muted px-2 py-1.5 rounded flex-1 truncate font-mono">
              {`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/webhook-capture/${ep.endpoint_id}`}
            </code>
            <Button variant="outline" size="sm" onClick={onCopyUrl}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
