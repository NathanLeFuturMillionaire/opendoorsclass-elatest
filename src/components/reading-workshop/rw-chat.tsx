import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  ArrowLeft, Check, CheckCheck, FileText, Megaphone, Mic, MoreVertical, Paperclip, Pause, Pin, Play, Plus, Reply, Search, Send, Square, Trash2, Users, X,
} from "lucide-react";
import { RW_CHAT_REACTIONS, rwAttachmentKind, rwCheckAttachment, rwReceipt, rwSafeFileName } from "@/lib/rw-chat";
import { useRwContext } from "./rw-shell";

type Conv = { id: string; kind: string; title: string | null; last_message_at: string; unread: number; last_body: string | null; can_post: boolean };
type Msg = {
  id: string; conversation_id: string; sender_id: string; body: string; reply_to: string | null; attachment_path: string | null;
  attachment_kind: string | null; attachment_name: string | null; pinned: boolean; edited_at: string | null; deleted_at: string | null; created_at: string;
};
type Member = { user_id: string; full_name: string; role: string; last_read_at: string; last_seen_at: string };
type Reaction = { message_id: string; user_id: string; emoji: string };

const err = (e: unknown) => toast.error((e as { message?: string })?.message ?? "Une erreur est survenue.");
const time = (s: string) => new Date(s).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

function useMe() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setId(data.user?.id ?? null)); }, []);
  return id;
}

export function RwChat() {
  const me = useMe();
  const qc = useQueryClient();
  const [active, setActive] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const convs = useQuery({
    queryKey: ["rw-chat-convs"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rw_chat_my_conversations");
      if (error) throw error;
      return (data ?? []) as Conv[];
    },
  });

  useEffect(() => {
    supabase.rpc("rw_chat_mark_seen");
    const ch = supabase
      .channel(`rw-chat-list-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "rw_chat_messages" }, () => {
        supabase.rpc("rw_chat_mark_seen");
        qc.invalidateQueries({ queryKey: ["rw-chat-convs"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const list = (convs.data ?? []).filter((c) => !filter || (c.title ?? "").toLowerCase().includes(filter.toLowerCase()));
  const current = convs.data?.find((c) => c.id === active) ?? null;

  return (
    <div className="grid h-[75vh] min-h-[520px] overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--rw-shadow)] md:grid-cols-[300px_1fr]">
      <aside className={`flex min-h-0 flex-col border-r border-border ${active ? "hidden md:flex" : "flex"}`}>
        <div className="flex items-center gap-2 border-b border-border p-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden />
            <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Rechercher" className="pl-8" aria-label="Rechercher une conversation" />
          </div>
          <NewConversation onOpen={(id) => { setActive(id); qc.invalidateQueries({ queryKey: ["rw-chat-convs"] }); }} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {convs.isLoading && <p className="p-4 text-sm text-muted-foreground">Chargement...</p>}
          {!convs.isLoading && list.length === 0 && <p className="p-4 text-sm text-muted-foreground">Aucune conversation. Appuyez sur + pour écrire à quelqu'un.</p>}
          {list.map((c) => (
            <button key={c.id} onClick={() => setActive(c.id)}
              className={`flex w-full items-center gap-3 border-b border-border px-3 py-3 text-left hover:bg-[var(--rw-soft)] ${active === c.id ? "bg-[var(--rw-soft)]" : ""}`}>
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                {c.kind === "announcement" ? <Megaphone className="size-4" /> : c.kind === "group" ? <Users className="size-4" /> : (c.title ?? "?").slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold">{c.title ?? "Conversation"}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{time(c.last_message_at)}</span>
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm text-muted-foreground">{c.last_body ?? "Nouvelle conversation"}</span>
                  {c.unread > 0 && <span className="shrink-0 rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground">{c.unread}</span>}
                </span>
              </span>
            </button>
          ))}
        </div>
      </aside>
      <section className={`min-h-0 flex-col ${active ? "flex" : "hidden md:flex"}`}>
        {current && me ? (
          <Thread key={current.id} conv={current} me={me} onBack={() => setActive(null)} />
        ) : (
          <div className="grid flex-1 place-items-center p-8 text-center text-muted-foreground">
            <p>Choisissez une conversation. Les messages sont privés et visibles uniquement par les membres. Pas d'appels dans OpenDoorsClass Chat.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function NewConversation({ onOpen }: { onOpen: (id: string) => void }) {
  const ctx = useRwContext();
  const canGroup = !!(ctx.data?.isStaff || ctx.data?.isCoach);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"direct" | "group" | "announcement">("direct");
  const [title, setTitle] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const contacts = useQuery({
    queryKey: ["rw-chat-contacts"], enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rw_chat_contacts");
      if (error) throw error;
      const seen = new Set<string>();
      return (data ?? []).filter((c) => (seen.has(c.user_id) ? false : (seen.add(c.user_id), true)));
    },
  });
  async function direct(uid: string) {
    setBusy(true);
    const { data, error } = await supabase.rpc("rw_chat_open_direct", { _other: uid });
    setBusy(false);
    if (error) return err(error);
    setOpen(false); onOpen(data as string);
  }
  async function group() {
    setBusy(true);
    const { data, error } = await supabase.rpc("rw_chat_create_group", { _title: title, _members: picked, _announcement: mode === "announcement" });
    setBusy(false);
    if (error) return err(error);
    setOpen(false); setTitle(""); setPicked([]); onOpen(data as string);
  }
  return (
    <>
      <Button size="icon" onClick={() => setOpen(true)} aria-label="Nouvelle conversation"><Plus className="size-4" /></Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rw-theme max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nouvelle conversation</DialogTitle></DialogHeader>
          {canGroup && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={mode === "direct" ? "default" : "outline"} onClick={() => setMode("direct")}>Privée</Button>
              <Button size="sm" variant={mode === "group" ? "default" : "outline"} onClick={() => setMode("group")}>Groupe</Button>
              {ctx.data?.isStaff && <Button size="sm" variant={mode === "announcement" ? "default" : "outline"} onClick={() => setMode("announcement")}>Annonce officielle</Button>}
            </div>
          )}
          {mode !== "direct" && <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={mode === "announcement" ? "Titre des annonces" : "Nom du groupe"} maxLength={80} />}
          {mode === "announcement" ? (
            <p className="text-sm text-muted-foreground">Tous les coachs et apprenants actifs seront ajoutés. Seule l'administration pourra écrire.</p>
          ) : (
            <div className="space-y-1">
              {contacts.isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}
              {contacts.data?.length === 0 && <p className="text-sm text-muted-foreground">Aucun contact disponible pour le moment.</p>}
              {contacts.data?.map((c) => (
                mode === "direct" ? (
                  <button key={c.user_id} disabled={busy} onClick={() => direct(c.user_id)} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-[var(--rw-soft)]">
                    <span className="font-medium">{c.full_name}</span>
                    <span className="text-xs text-muted-foreground">{c.role === "coach" ? "Coach" : c.role === "learner" ? "Apprenant" : "Administration"}</span>
                  </button>
                ) : (
                  <label key={c.user_id} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-[var(--rw-soft)]">
                    <Checkbox checked={picked.includes(c.user_id)} onCheckedChange={(v) => setPicked((p) => (v ? [...p, c.user_id] : p.filter((x) => x !== c.user_id)))} />
                    <span>{c.full_name}</span>
                  </label>
                )
              ))}
            </div>
          )}
          {mode !== "direct" && <Button disabled={busy || title.trim().length < 2 || (mode === "group" && picked.length === 0)} onClick={group}>Créer</Button>}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Thread({ conv, me, onBack }: { conv: Conv; me: string; onBack: () => void }) {
  const qc = useQueryClient();
  const ctx = useRwContext();
  const isStaff = !!ctx.data?.isStaff;
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [editing, setEditing] = useState<Msg | null>(null);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [typing, setTyping] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const typingCh = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTyping = useRef(0);
  const names = useMemo(() => Object.fromEntries(members.map((m) => [m.user_id, m.full_name])), [members]);
  const others = members.filter((m) => m.user_id !== me);

  async function loadMembers() {
    const { data } = await supabase.rpc("rw_chat_members_of", { _conv: conv.id });
    setMembers((data ?? []) as Member[]);
  }
  async function markRead() {
    await supabase.rpc("rw_chat_mark_read", { _conv: conv.id });
    qc.invalidateQueries({ queryKey: ["rw-chat-convs"] });
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      const [m, r] = await Promise.all([
        supabase.from("rw_chat_messages").select("*").eq("conversation_id", conv.id).order("created_at", { ascending: true }).limit(500),
        supabase.from("rw_chat_reactions").select("message_id,user_id,emoji").eq("conversation_id", conv.id),
      ]);
      if (!alive) return;
      if (m.error) err(m.error);
      setMsgs((m.data ?? []) as Msg[]);
      setReactions((r.data ?? []) as Reaction[]);
      loadMembers();
      markRead();
    })();
    const ch = supabase
      .channel(`rw-chat-thread-${conv.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rw_chat_messages", filter: `conversation_id=eq.${conv.id}` }, (p) => {
        const row = p.new as Msg;
        setMsgs((prev) => {
          const i = prev.findIndex((x) => x.id === row.id);
          if (i === -1) return [...prev, row];
          const copy = prev.slice(); copy[i] = row; return copy;
        });
        if (p.eventType === "INSERT" && row.sender_id !== me) markRead();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "rw_chat_reactions", filter: `conversation_id=eq.${conv.id}` }, async () => {
        const { data } = await supabase.from("rw_chat_reactions").select("message_id,user_id,emoji").eq("conversation_id", conv.id);
        setReactions((data ?? []) as Reaction[]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rw_chat_members", filter: `conversation_id=eq.${conv.id}` }, () => loadMembers())
      .subscribe();
    const tch = supabase.channel(`rw-chat-typing-${conv.id}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const uid = (payload as { uid?: string })?.uid;
        if (uid && uid !== me) setTyping((t) => ({ ...t, [uid]: Date.now() }));
      })
      .subscribe();
    typingCh.current = tch;
    const tick = setInterval(() => setTyping((t) => Object.fromEntries(Object.entries(t).filter(([, v]) => Date.now() - v < 4000))), 1500);
    return () => { alive = false; clearInterval(tick); supabase.removeChannel(ch); supabase.removeChannel(tch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv.id]);

  useEffect(() => { if (!search) bottom.current?.scrollIntoView({ block: "end" }); }, [msgs.length, search]);

  function onType(v: string) {
    setText(v);
    if (Date.now() - lastTyping.current > 2000) {
      lastTyping.current = Date.now();
      typingCh.current?.send({ type: "broadcast", event: "typing", payload: { uid: me } });
    }
  }

  async function send(att?: { path: string; kind: string; name: string; size: number }) {
    if (editing) {
      const { error } = await supabase.rpc("rw_chat_edit", { _id: editing.id, _body: text });
      if (error) return err(error);
      setEditing(null); setText(""); return;
    }
    if (!att && !text.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc("rw_chat_send", {
      _conv: conv.id, _body: att ? "" : text, _reply: replyTo?.id ?? undefined,
      _path: att?.path, _kind: att?.kind, _name: att?.name, _size: att?.size,
    });
    setBusy(false);
    if (error) return err(error);
    if (!att) setText("");
    setReplyTo(null);
  }

  async function upload(file: File) {
    const problem = rwCheckAttachment(file);
    if (problem) return toast.error(problem);
    setBusy(true);
    const path = `${conv.id}/${crypto.randomUUID()}-${rwSafeFileName(file.name)}`;
    const { error } = await supabase.storage.from("rw-chat").upload(path, file, { contentType: file.type });
    setBusy(false);
    if (error) return err(error);
    await send({ path, kind: rwAttachmentKind(file.type)!, name: file.name, size: file.size });
  }

  const shown = search ? msgs.filter((m) => !m.deleted_at && m.body.toLowerCase().includes(search.toLowerCase())) : msgs;
  const pinned = msgs.filter((m) => m.pinned && !m.deleted_at);
  const typers = Object.keys(typing).map((u) => names[u]).filter(Boolean);
  const canModerateGroup = isStaff || members.some((m) => m.user_id === me && m.role === "admin") || conv.kind === "direct";

  return (
    <>
      <header className="flex items-center gap-2 border-b border-border p-3">
        <Button size="icon" variant="ghost" className="md:hidden" onClick={onBack} aria-label="Retour"><ArrowLeft className="size-4" /></Button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{conv.title ?? "Conversation"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {typers.length ? `${typers.join(", ")} ${typers.length > 1 ? "écrivent" : "est en train d'écrire"}...` : conv.kind === "direct" ? "Conversation privée" : `${members.length} membres`}
          </p>
        </div>
        <Button size="icon" variant="ghost" onClick={() => { setShowSearch((s) => !s); setSearch(""); }} aria-label="Rechercher dans la conversation"><Search className="size-4" /></Button>
      </header>
      {showSearch && <div className="border-b border-border p-2"><Input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un message" /></div>}
      {pinned.length > 0 && (
        <div className="flex items-center gap-2 border-b border-border bg-[var(--rw-soft)] px-3 py-2 text-sm">
          <Pin className="size-4 shrink-0 text-primary" /> <span className="truncate">{pinned[pinned.length - 1].body || pinned[pinned.length - 1].attachment_name}</span>
        </div>
      )}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-background/40 p-3">
        {shown.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">{search ? "Aucun résultat." : "Aucun message. Écrivez le premier."}</p>}
        {shown.map((m) => (
          <Bubble key={m.id} m={m} mine={m.sender_id === me} name={names[m.sender_id] ?? "Participant"} showName={conv.kind !== "direct"}
            quoted={m.reply_to ? msgs.find((x) => x.id === m.reply_to) ?? null : null} quotedName={(id) => names[id] ?? "Participant"}
            reactions={reactions.filter((r) => r.message_id === m.id)} me={me}
            receipt={m.sender_id === me ? rwReceipt(m.created_at, others) : null}
            canPin={canModerateGroup} canDelete={m.sender_id === me || isStaff}
            onReply={() => setReplyTo(m)} onEdit={() => { setEditing(m); setText(m.body); }} />
        ))}
        <div ref={bottom} />
      </div>
      {conv.can_post ? (
        <Composer text={text} onType={onType} busy={busy} replyTo={replyTo} editing={editing} quotedName={replyTo ? names[replyTo.sender_id] ?? "" : ""}
          onCancel={() => { setReplyTo(null); setEditing(null); if (editing) setText(""); }} onSend={() => send()} onFile={upload} />
      ) : (
        <p className="border-t border-border p-3 text-center text-sm text-muted-foreground">Seule l'administration publie dans les annonces.</p>
      )}
    </>
  );
}

function Bubble(props: {
  m: Msg; mine: boolean; name: string; showName: boolean; quoted: Msg | null; quotedName: (id: string) => string; reactions: Reaction[]; me: string;
  receipt: ReturnType<typeof rwReceipt> | null; canPin: boolean; canDelete: boolean; onReply: () => void; onEdit: () => void;
}) {
  const { m, mine } = props;
  const [dx, setDx] = useState(0);
  const start = useRef<number | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const grouped = Object.entries(props.reactions.reduce<Record<string, string[]>>((a, r) => ((a[r.emoji] ??= []).push(r.user_id), a), {}));

  async function rpc(fn: "rw_chat_delete" | "rw_chat_pin" | "rw_chat_react", args: Record<string, unknown>) {
    const { error } = await supabase.rpc(fn as never, args as never);
    if (error) err(error);
  }
  async function report() {
    const { error } = await supabase.rpc("rw_chat_report", { _id: m.id, _reason: reason });
    if (error) return err(error);
    toast.success("Signalement envoyé à l'administration.");
    setReporting(false); setReason("");
  }

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}
      onTouchStart={(e) => { start.current = e.touches[0].clientX; }}
      onTouchMove={(e) => { if (start.current !== null) setDx(Math.max(0, Math.min(80, e.touches[0].clientX - start.current))); }}
      onTouchEnd={() => { if (dx > 60 && !m.deleted_at) props.onReply(); setDx(0); start.current = null; }}>
      <div style={{ transform: `translateX(${dx}px)` }} className={`group relative max-w-[85%] rounded-2xl px-3 py-2 shadow-sm transition-transform sm:max-w-[70%] ${mine ? "bg-primary text-primary-foreground" : "border border-border bg-card"}`}>
        {props.showName && !mine && <p className="text-xs font-semibold text-primary">{props.name}</p>}
        {props.quoted && (
          <div className={`mb-1 rounded-lg border-l-4 px-2 py-1 text-xs ${mine ? "border-primary-foreground/60 bg-primary-foreground/10" : "border-primary bg-[var(--rw-soft)]"}`}>
            <p className="font-semibold">{props.quotedName(props.quoted.sender_id)}</p>
            <p className="line-clamp-2 opacity-80">{props.quoted.deleted_at ? "Message supprimé" : props.quoted.body || props.quoted.attachment_name}</p>
          </div>
        )}
        {m.deleted_at ? (
          <p className="text-sm italic opacity-70">Message supprimé</p>
        ) : (
          <>
            {m.attachment_path && <Attachment path={m.attachment_path} kind={m.attachment_kind} name={m.attachment_name} />}
            {m.body && <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>}
          </>
        )}
        <p className="mt-1 flex items-center justify-end gap-1 text-[11px] opacity-70">
          {m.pinned && <Pin className="size-3" />}{m.edited_at && !m.deleted_at && "modifié · "}{time(m.created_at)}
          {props.receipt === "sent" && <Check className="size-3.5" aria-label="Envoyé" />}
          {props.receipt === "delivered" && <CheckCheck className="size-3.5" aria-label="Distribué" />}
          {props.receipt === "read" && <CheckCheck className="size-3.5 text-[var(--rw-accent,currentColor)]" aria-label="Lu" strokeWidth={3} />}
        </p>
        {grouped.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {grouped.map(([e, users]) => (
              <button key={e} onClick={() => rpc("rw_chat_react", { _id: m.id, _emoji: e })}
                className={`rounded-full border px-1.5 text-xs ${users.includes(props.me) ? "border-primary bg-primary/15" : "border-border bg-background"} text-foreground`}>{e} {users.length}</button>
            ))}
          </div>
        )}
        {!m.deleted_at && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`absolute top-1 ${mine ? "-left-7" : "-right-7"} rounded-full p-1 text-muted-foreground opacity-60 hover:bg-muted group-hover:opacity-100`} aria-label="Actions du message"><MoreVertical className="size-4" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rw-theme">
              <div className="flex gap-1 p-1">
                {RW_CHAT_REACTIONS.map((e) => <button key={e} className="rounded p-1 text-lg hover:bg-muted" onClick={() => rpc("rw_chat_react", { _id: m.id, _emoji: e })}>{e}</button>)}
              </div>
              <DropdownMenuItem onClick={props.onReply}><Reply className="mr-2 size-4" />Répondre</DropdownMenuItem>
              {mine && m.body && <DropdownMenuItem onClick={props.onEdit}>Modifier</DropdownMenuItem>}
              {props.canPin && <DropdownMenuItem onClick={() => rpc("rw_chat_pin", { _id: m.id, _pinned: !m.pinned })}><Pin className="mr-2 size-4" />{m.pinned ? "Désépingler" : "Épingler"}</DropdownMenuItem>}
              {!mine && <DropdownMenuItem onClick={() => setReporting(true)}>Signaler</DropdownMenuItem>}
              {props.canDelete && <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm("Supprimer ce message ?")) rpc("rw_chat_delete", { _id: m.id }); }}><Trash2 className="mr-2 size-4" />Supprimer</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <Dialog open={reporting} onOpenChange={setReporting}>
        <DialogContent className="rw-theme">
          <DialogHeader><DialogTitle>Signaler ce message</DialogTitle></DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Expliquez le problème" maxLength={1000} />
          <Button disabled={reason.trim().length < 3} onClick={report}>Envoyer le signalement</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Attachment({ path, kind, name }: { path: string; kind: string | null; name: string | null }) {
  const { data: url } = useQuery({
    queryKey: ["rw-chat-file", path], staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("rw-chat").createSignedUrl(path, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  if (!url) return <p className="text-xs opacity-70">Chargement du fichier...</p>;
  if (kind === "image") return <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={name ?? "Photo"} className="mb-1 max-h-72 rounded-lg object-cover" /></a>;
  if (kind === "video") return <video src={url} controls playsInline className="mb-1 max-h-72 rounded-lg" />;
  if (kind === "audio") return <audio src={url} controls className="mb-1 w-60 max-w-full" />;
  return <a href={url} target="_blank" rel="noreferrer" className="mb-1 flex items-center gap-2 underline"><FileText className="size-4" />{name ?? "Document"}</a>;
}

function Composer(props: {
  text: string; onType: (v: string) => void; busy: boolean; replyTo: Msg | null; editing: Msg | null; quotedName: string;
  onCancel: () => void; onSend: () => void; onFile: (f: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [recState, setRecState] = useState<"idle" | "recording" | "paused">("idle");
  const [preview, setPreview] = useState<{ blob: Blob; url: string } | null>(null);

  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: r.mimeType || "audio/webm" });
        setPreview({ blob, url: URL.createObjectURL(blob) });
        setRecState("idle");
      };
      r.start(); rec.current = r; setRecState("recording");
    } catch { toast.error("Micro indisponible. Autorisez le micro dans votre navigateur."); }
  }
  function sendVoice() {
    if (!preview) return;
    const type = preview.blob.type.split(";")[0] || "audio/webm";
    const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
    props.onFile(new File([preview.blob], `note-vocale.${ext}`, { type }));
    URL.revokeObjectURL(preview.url); setPreview(null);
  }

  return (
    <div className="border-t border-border p-2">
      {(props.replyTo || props.editing) && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border-l-4 border-primary bg-[var(--rw-soft)] px-3 py-1.5 text-sm">
          <span className="min-w-0 flex-1 truncate">{props.editing ? "Modification du message" : `Réponse à ${props.quotedName} : ${props.replyTo?.body || props.replyTo?.attachment_name || ""}`}</span>
          <button onClick={props.onCancel} aria-label="Annuler"><X className="size-4" /></button>
        </div>
      )}
      {preview ? (
        <div className="flex items-center gap-2">
          <audio src={preview.url} controls className="min-w-0 flex-1" />
          <Button size="icon" variant="ghost" onClick={() => { URL.revokeObjectURL(preview.url); setPreview(null); }} aria-label="Supprimer la note vocale"><Trash2 className="size-4" /></Button>
          <Button size="icon" disabled={props.busy} onClick={sendVoice} aria-label="Envoyer la note vocale"><Send className="size-4" /></Button>
        </div>
      ) : recState !== "idle" ? (
        <div className="flex items-center gap-2">
          <span className="flex-1 text-sm font-medium text-destructive">{recState === "recording" ? "Enregistrement en cours..." : "En pause"}</span>
          {recState === "recording"
            ? <Button size="icon" variant="outline" onClick={() => { rec.current?.pause(); setRecState("paused"); }} aria-label="Pause"><Pause className="size-4" /></Button>
            : <Button size="icon" variant="outline" onClick={() => { rec.current?.resume(); setRecState("recording"); }} aria-label="Reprendre"><Play className="size-4" /></Button>}
          <Button size="icon" onClick={() => rec.current?.stop()} aria-label="Terminer et écouter"><Square className="size-4" /></Button>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <input ref={fileRef} type="file" hidden accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt" onChange={(e) => { const f = e.target.files?.[0]; if (f) props.onFile(f); e.target.value = ""; }} />
          {!props.editing && <Button size="icon" variant="ghost" disabled={props.busy} onClick={() => fileRef.current?.click()} aria-label="Joindre un fichier"><Paperclip className="size-4" /></Button>}
          <Textarea value={props.text} onChange={(e) => props.onType(e.target.value)} rows={1} maxLength={4000} placeholder="Écrire un message"
            className="max-h-32 min-h-10 flex-1 resize-none"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); props.onSend(); } }} />
          {props.text.trim() || props.editing
            ? <Button size="icon" disabled={props.busy} onClick={props.onSend} aria-label="Envoyer"><Send className="size-4" /></Button>
            : <Button size="icon" variant="outline" disabled={props.busy} onClick={startRec} aria-label="Enregistrer une note vocale"><Mic className="size-4" /></Button>}
        </div>
      )}
    </div>
  );
}

/** Admin moderation: open reports and the moderation log. */
export function RwChatModeration() {
  const qc = useQueryClient();
  const reports = useQuery({
    queryKey: ["rw-chat-reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rw_chat_reports").select("id,reason,status,created_at,message_id,rw_chat_messages(body,deleted_at)").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
  const log = useQuery({
    queryKey: ["rw-chat-modlog"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rw_chat_moderation_log").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
  async function act(fn: "rw_chat_close_report" | "rw_chat_delete", id: string) {
    const { error } = await supabase.rpc(fn, { _id: id });
    if (error) return err(error);
    qc.invalidateQueries({ queryKey: ["rw-chat-reports"] }); qc.invalidateQueries({ queryKey: ["rw-chat-modlog"] });
  }
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="font-bold">Signalements</h3>
        {reports.data?.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Aucun signalement.</p>}
        <ul className="mt-2 space-y-2">
          {reports.data?.map((r) => {
            const msg = r.rw_chat_messages as unknown as { body: string; deleted_at: string | null } | null;
            return (
              <li key={r.id} className="rounded-xl border border-border p-3 text-sm">
                <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("fr-FR")} · {r.status === "open" ? "Ouvert" : "Traité"}</p>
                <p className="mt-1"><span className="font-semibold">Motif :</span> {r.reason}</p>
                <p className="mt-1 rounded-lg bg-muted p-2">{msg?.deleted_at ? "Message supprimé" : msg?.body || "Pièce jointe"}</p>
                {r.status === "open" && (
                  <div className="mt-2 flex gap-2">
                    {!msg?.deleted_at && <Button size="sm" variant="destructive" onClick={() => act("rw_chat_delete", r.message_id)}>Supprimer le message</Button>}
                    <Button size="sm" variant="outline" onClick={() => act("rw_chat_close_report", r.id)}>Marquer comme traité</Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="font-bold">Journal de modération</h3>
        {log.data?.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Aucune action.</p>}
        <ul className="mt-2 space-y-1 text-sm">
          {log.data?.map((l) => (
            <li key={l.id}>{new Date(l.created_at).toLocaleString("fr-FR")} · {l.action === "delete" ? "Message supprimé" : "Signalement traité"}{l.detail && l.action === "delete" ? ` : « ${l.detail} »` : ""}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
