import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          aria-label={t("lang.switch")}
          className="gap-1"
        >
          <Languages className="size-4" />
          {compact ? null : (
            <span className="text-xs font-semibold uppercase">{locale}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLocale("fr")}>
          <span className="mr-2">🇫🇷</span> Français
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocale("en")}>
          <span className="mr-2">🇬🇧</span> English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}