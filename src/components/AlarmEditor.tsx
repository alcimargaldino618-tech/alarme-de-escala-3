import { useEffect, useRef, useState } from "react";
import { Music4, Pause, Play, Trash2, Vibrate, Volume2 } from "lucide-react";
import { toast } from "sonner";
import {
  APPLIES_LABEL,
  DURATION_OPTIONS,
  SNOOZE_OPTIONS,
  type Alarm,
  type AlarmDuration,
  type AppliesTo,
  type SoundType,
} from "@/lib/alarms";
import { ACCEPTED_AUDIO, alarmPlayer, PRESET_SOUNDS } from "@/lib/audio";
import { deleteAudio, loadAudio, saveAudio } from "@/lib/db";
import { useAppStore } from "@/lib/app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const APPLIES_OPTIONS: { value: AppliesTo; label: string; dot: string }[] = [
  { value: "TRABALHO", label: "Trabalho", dot: "bg-work" },
  { value: "FOLGA", label: "Folga", dot: "bg-off" },
  { value: "TODOS", label: "Todos", dot: "bg-muted-foreground" },
];

const SOUND_OPTIONS: { value: SoundType; label: string }[] = [
  { value: "PADRAO", label: "🔊 Sons padrão" },
  { value: "MUSICA", label: "🎵 Música do celular" },
  { value: "SILENCIO", label: "🔇 Sem som" },
];

export function AlarmEditor({
  alarm,
  open,
  onOpenChange,
}: {
  alarm: Alarm;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { upsertAlarm, triggerAlarm } = useAppStore();
  const [draft, setDraft] = useState<Alarm>(alarm);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(alarm);
      setPendingFile(null);
    }
  }, [open, alarm]);

  const stopPreview = () => {
    previewRef.current?.pause();
    previewRef.current = null;
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setPreviewing(false);
  };

  useEffect(() => stopPreview, []);

  const patch = (p: Partial<Alarm>) => setDraft((d) => ({ ...d, ...p }));

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    setPendingFile(file);
    patch({ soundType: "MUSICA", audioName: file.name });
    toast.success("Música selecionada", { description: file.name });
  };

  const playPreview = async () => {
    let blob: Blob | null = pendingFile;
    if (!blob && draft.audioKey) blob = await loadAudio(draft.audioKey);
    if (!blob) {
      toast.error("⚠️ Áudio não encontrado", {
        description: "Selecione novamente uma música para este alarme.",
      });
      return;
    }
    stopPreview();
    const url = URL.createObjectURL(blob);
    urlRef.current = url;
    const el = new Audio(url);
    el.volume = draft.volume;
    previewRef.current = el;
    el.onended = () => setPreviewing(false);
    await el.play();
    setPreviewing(true);
  };

  const removeMusic = async () => {
    stopPreview();
    if (draft.audioKey) await deleteAudio(draft.audioKey);
    setPendingFile(null);
    setDraft((d) => {
      const { audioKey: _k, audioName: _n, ...rest } = d;
      return { ...rest, soundType: "PADRAO" } as Alarm;
    });
    toast.success("Música removida");
  };

  const save = async () => {
    stopPreview();
    let next = { ...draft };
    if (pendingFile) {
      const key = `audio-${draft.id}-${Date.now()}`;
      await saveAudio(key, pendingFile);
      if (draft.audioKey) await deleteAudio(draft.audioKey);
      next = { ...next, audioKey: key, audioName: pendingFile.name };
    }
    if (next.soundType === "MUSICA" && !next.audioKey) {
      toast.error("Escolha uma música", { description: "Ou selecione um som padrão." });
      return;
    }
    await upsertAlarm(next);
    toast.success("Alarme salvo");
    onOpenChange(false);
  };

  const testAlarm = async () => {
    stopPreview();
    const result = await alarmPlayer.play(draft, { loop: false });
    if (result === "sem-audio") {
      toast.error("⚠️ Áudio não encontrado", {
        description: "Selecione novamente uma música para este alarme.",
      });
      return;
    }
    void triggerAlarm(draft, new Date());
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) stopPreview();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar alarme</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="alarm-name">Nome</Label>
            <Input
              id="alarm-name"
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Acordar"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="alarm-time">Horário</Label>
            <Input
              id="alarm-time"
              type="time"
              value={draft.time}
              onChange={(e) => patch({ time: e.target.value })}
              className="tabular h-14 text-2xl font-bold"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <Label htmlFor="alarm-enabled">Alarme ativo</Label>
            <Switch
              id="alarm-enabled"
              checked={draft.enabled}
              onCheckedChange={(v) => patch({ enabled: v })}
            />
          </div>

          <div className="space-y-2">
            <Label>Aplicar em</Label>
            <div className="grid grid-cols-3 gap-2">
              {APPLIES_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => patch({ appliesTo: o.value })}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-sm font-semibold transition-colors ${
                    draft.appliesTo === o.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <span className={`size-2.5 rounded-full ${o.dot}`} aria-hidden />
                  {o.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{APPLIES_LABEL[draft.appliesTo]}</p>
          </div>

          <div className="space-y-2">
            <Label>Som do alarme</Label>
            <Select
              value={draft.soundType}
              onValueChange={(v) => patch({ soundType: v as SoundType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOUND_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {draft.soundType === "PADRAO" ? (
              <Select
                value={draft.presetSound}
                onValueChange={(v) => patch({ presetSound: v as Alarm["presetSound"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRESET_SOUNDS).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      {val.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            {draft.soundType === "MUSICA" ? (
              <div className="space-y-3 rounded-xl border border-border p-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept={ACCEPTED_AUDIO}
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => fileRef.current?.click()}
                >
                  <Music4 className="size-4" aria-hidden /> Escolher música do celular
                </Button>
                {draft.audioName ? (
                  <>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Música selecionada</span>
                      <br />
                      <span className="font-medium break-all">{draft.audioName}</span>
                    </p>
                    <div className="flex gap-2">
                      {previewing ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            previewRef.current?.pause();
                            setPreviewing(false);
                          }}
                        >
                          <Pause className="size-4" aria-hidden /> Pausar
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void playPreview()}
                        >
                          <Play className="size-4" aria-hidden /> Reproduzir
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void removeMusic()}
                      >
                        <Trash2 className="size-4" aria-hidden /> Remover
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    MP3, M4A, WAV ou OGG. O arquivo fica salvo apenas no seu aparelho.
                  </p>
                )}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Volume2 className="size-4" aria-hidden /> Volume ({Math.round(draft.volume * 100)}%)
            </Label>
            <Slider
              value={[draft.volume * 100]}
              min={0}
              max={100}
              step={5}
              onValueChange={([v]) => patch({ volume: (v ?? 80) / 100 })}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <Label htmlFor="alarm-vibration" className="flex items-center gap-2">
              <Vibrate className="size-4" aria-hidden /> Vibração
            </Label>
            <Switch
              id="alarm-vibration"
              checked={draft.vibration}
              onCheckedChange={(v) => patch({ vibration: v })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Soneca</Label>
              <Select
                value={String(draft.snoozeMinutes)}
                onValueChange={(v) => patch({ snoozeMinutes: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SNOOZE_OPTIONS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m} minutos
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duração do toque</Label>
              <Select
                value={String(draft.duration)}
                onValueChange={(v) => patch({ duration: Number(v) as AlarmDuration })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="button" variant="outline" className="w-full" onClick={() => void testAlarm()}>
            TESTAR ALARME
          </Button>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void save()}>Salvar alarme</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
