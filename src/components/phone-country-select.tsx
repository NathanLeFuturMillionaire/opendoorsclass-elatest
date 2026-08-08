import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { PHONE_COUNTRIES, phoneCountryByCode } from "@/lib/phone-countries";

type Props = {
  value: string;
  onChange: (code: string) => void;
  locale?: "fr" | "en";
  id?: string;
  className?: string;
};

export function PhoneCountrySelect({ value, onChange, locale = "fr", id, className }: Props) {
  const [open, setOpen] = useState(false);
  const selected = phoneCountryByCode(value);
  const isFr = locale === "fr";

  const items = useMemo(
    () =>
      [...PHONE_COUNTRIES].sort((a, b) =>
        (isFr ? a.fr : a.en).localeCompare(isFr ? b.fr : b.en, isFr ? "fr" : "en"),
      ),
    [isFr],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className="truncate">
            {selected ? (
              <>
                <span aria-hidden>{selected.flag}</span> {selected.dial}
              </>
            ) : (
              isFr ? "Choisir un pays" : "Select a country"
            )}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(22rem,90vw)] p-0" align="start">
        <Command
          filter={(itemValue, search) =>
            itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder={isFr ? "Rechercher un pays..." : "Search a country..."} />
          <CommandList className="max-h-72">
            <CommandEmpty>{isFr ? "Aucun pays trouvé." : "No country found."}</CommandEmpty>
            <CommandGroup>
              {items.map((c) => (
                <CommandItem
                  key={c.code}
                  value={`${c.fr} ${c.en} ${c.code} ${c.dial}`}
                  onSelect={() => {
                    onChange(c.code);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("mr-2 size-4", value === c.code ? "opacity-100" : "opacity-0")}
                  />
                  <span className="mr-2" aria-hidden>{c.flag}</span>
                  <span className="mr-2 tabular-nums text-muted-foreground">{c.dial}</span>
                  <span className="truncate">{isFr ? c.fr : c.en}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
